<template>
	<div v-if="workflowName" class="container">
		<BreakpointsObserver :value-x-s="15" :value-s-m="25" :value-m-d="50" class="name-container">
			<template #default="{ value }">
				<ShortenName
					:name="workflowName"
					:limit="value"
					:custom="true"
					test-id="workflow-name-input"
				>
					<template #default="{ shortenedName }">
						<InlineTextEdit
							:model-value="workflowName"
							:preview-value="shortenedName"
							:is-edit-enabled="isNameEditEnabled"
							:max-length="MAX_WORKFLOW_NAME_LENGTH"
							:disabled="readOnly"
							placeholder="Enter workflow name"
							class="name"
							@toggle="onNameToggle"
							@submit="onNameSubmit"
						/>
					</template>
				</ShortenName>
			</template>
		</BreakpointsObserver>

		<span v-if="settingsStore.areTagsEnabled" class="tags" data-test-id="workflow-tags-container">
			<TagsDropdown
				v-if="isTagsEditEnabled && !readOnly"
				ref="dropdown"
				v-model="appliedTagIds"
				:create-enabled="true"
				:event-bus="tagsEditBus"
				:placeholder="$locale.baseText('workflowDetails.chooseOrCreateATag')"
				class="tags-edit"
				data-test-id="workflow-tags-dropdown"
				@blur="onTagsBlur"
				@esc="onTagsEditEsc"
			/>
			<div v-else-if="currentWorkflowTagIds.length === 0 && !readOnly">
				<span class="add-tag clickable" data-test-id="new-tag-link" @click="onTagsEditEnable">
					+ {{ $locale.baseText('workflowDetails.addTag') }}
				</span>
			</div>
			<TagsContainer
				v-else
				:key="currentWorkflowId"
				:tag-ids="currentWorkflowTagIds"
				:clickable="true"
				:responsive="true"
				data-test-id="workflow-tags"
				@click="onTagsEditEnable"
			/>
		</span>
		<span v-else class="tags"></span>

		<PushConnectionTracker class="actions">
			<span :class="`activator ${$style.group}`">
				<WorkflowActivator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflowId" />
			</span>
			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
				<div :class="$style.group">
					<CollaborationPane />
					<n8n-button
						v-if="showShareButton"
						type="secondary"
						data-test-id="workflow-share-button"
						@click="onShareButtonClick"
					>
						{{ $locale.baseText('workflowDetails.share') }}
					</n8n-button>
				</div>
				<template #fallback>
					<n8n-tooltip>
						<n8n-button type="secondary" :class="['mr-2xs', $style.disabledShareButton]">
							{{ $locale.baseText('workflowDetails.share') }}
						</n8n-button>
						<template #content>
							<i18n-t
								:keypath="
									contextBasedTranslationKeys.workflows.sharing.unavailable.description.tooltip
								"
								tag="span"
							>
								<template #action>
									<a @click="goToUpgrade">
										{{
											$locale.baseText(
												contextBasedTranslationKeys.workflows.sharing.unavailable.button,
											)
										}}
									</a>
								</template>
							</i18n-t>
						</template>
					</n8n-tooltip>
				</template>
			</enterprise-edition>
			<div :class="$style.group">
				<SaveButton
					type="primary"
					:saved="!isDirty && !isNewWorkflow"
					:disabled="isWorkflowSaving || readOnly"
					data-test-id="workflow-save-button"
					@click="onSaveButtonClick"
				/>
				<router-link
					v-if="isWorkflowHistoryFeatureEnabled"
					:to="workflowHistoryRoute"
					:class="$style.workflowHistoryButton"
				>
					<n8n-icon-button
						:disabled="isWorkflowHistoryButtonDisabled"
						data-test-id="workflow-history-button"
						type="tertiary"
						icon="history"
						size="medium"
						text
					/>
				</router-link>
			</div>
			<div :class="[$style.workflowMenuContainer, $style.group]">
				<input
					ref="importFile"
					:class="$style.hiddenInput"
					type="file"
					data-test-id="workflow-import-input"
					@change="handleFileImport()"
				/>
				<n8n-action-dropdown
					:items="workflowMenuItems"
					data-test-id="workflow-menu"
					@select="onWorkflowMenuSelect"
				/>
			</div>
		</PushConnectionTracker>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import {
	DUPLICATE_MODAL_KEY,
	EnterpriseEditionFeature,
	MAX_WORKFLOW_NAME_LENGTH,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	VIEWS,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';

import ShortenName from '@/components/ShortenName.vue';
import TagsContainer from '@/components/TagsContainer.vue';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import SaveButton from '@/components/SaveButton.vue';
import TagsDropdown from '@/components/TagsDropdown.vue';
import InlineTextEdit from '@/components/InlineTextEdit.vue';
import BreakpointsObserver from '@/components/BreakpointsObserver.vue';
import CollaborationPane from '@/components/MainHeader/CollaborationPane.vue';
import type { IUser, IWorkflowDataUpdate, IWorkflowDb, IWorkflowToShare } from '@/Interface';

import { saveAs } from 'file-saver';
import { useTitleChange } from '@/composables/useTitleChange';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import type { MessageBoxInputData } from 'element-plus';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsageStore } from '@/stores/usage.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { PermissionsMap } from '@/permissions';
import type { WorkflowScope } from '@n8n/permissions';
import { getWorkflowPermissions } from '@/permissions';
import { createEventBus } from 'n8n-design-system/utils';
import { nodeViewEventBus } from '@/event-bus';
import { hasPermission } from '@/rbac/permissions';
import { useCanvasStore } from '@/stores/canvas.store';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useProjectsStore } from '@/features/projects/projects.store';

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((accu, val) => accu || !set.has(val), false);
};

export default defineComponent({
	name: 'WorkflowDetails',
	components: {
		TagsContainer,
		PushConnectionTracker,
		ShortenName,
		WorkflowActivator,
		SaveButton,
		TagsDropdown,
		InlineTextEdit,
		BreakpointsObserver,
		CollaborationPane,
	},
	props: {
		readOnly: {
			type: Boolean,
			default: false,
		},
	},
	setup() {
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });

		return {
			workflowHelpers,
			...useTitleChange(),
			...useToast(),
			...useMessage(),
		};
	},
	data() {
		return {
			isTagsEditEnabled: false,
			isNameEditEnabled: false,
			appliedTagIds: [],
			tagsEditBus: createEventBus(),
			MAX_WORKFLOW_NAME_LENGTH,
			tagsSaving: false,
			eventBus: createEventBus(),
			EnterpriseEditionFeature,
		};
	},
	computed: {
		...mapStores(
			useTagsStore,
			useRootStore,
			useSettingsStore,
			useUIStore,
			useUsageStore,
			useWorkflowsStore,
			useUsersStore,
			useSourceControlStore,
			useCanvasStore,
			useProjectsStore,
		),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		contextBasedTranslationKeys() {
			return this.uiStore.contextBasedTranslationKeys;
		},
		isWorkflowActive(): boolean {
			return this.workflowsStore.isWorkflowActive;
		},
		workflowName(): string {
			return this.workflowsStore.workflowName;
		},
		isDirty(): boolean {
			return this.uiStore.stateIsDirty;
		},
		readOnlyEnv(): boolean {
			return this.sourceControlStore.preferences.branchReadOnly;
		},
		currentWorkflowTagIds(): string[] {
			return this.workflowsStore.workflowTags;
		},
		isNewWorkflow(): boolean {
			return (
				!this.currentWorkflowId ||
				this.currentWorkflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
				this.currentWorkflowId === 'new'
			);
		},
		isWorkflowSaving(): boolean {
			return this.uiStore.isActionActive('workflowSaving');
		},
		workflow(): IWorkflowDb {
			return this.workflowsStore.workflow;
		},
		currentWorkflowId(): string {
			return this.workflowsStore.workflowId;
		},
		onWorkflowPage(): boolean {
			return (
				this.$route.meta &&
				(this.$route.meta.nodeView || this.$route.meta.keepWorkflowAlive === true)
			);
		},
		onExecutionsTab(): boolean {
			return [
				VIEWS.EXECUTION_HOME.toString(),
				VIEWS.WORKFLOW_EXECUTIONS.toString(),
				VIEWS.EXECUTION_PREVIEW,
			].includes(this.$route.name || '');
		},
		workflowPermissions(): PermissionsMap<WorkflowScope> {
			return getWorkflowPermissions(
				this.currentUser,
				this.projectsStore.currentProject,
				this.workflow,
			);
		},
		workflowMenuItems(): Array<{}> {
			const actions = [
				{
					id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
					label: this.$locale.baseText('menuActions.download'),
					disabled: !this.onWorkflowPage,
				},
			];

			if (!this.readOnly) {
				actions.unshift({
					id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
					label: this.$locale.baseText('menuActions.duplicate'),
					disabled: !this.onWorkflowPage || !this.currentWorkflowId,
				});

				actions.push(
					{
						id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
						label: this.$locale.baseText('menuActions.importFromUrl'),
						disabled: !this.onWorkflowPage || this.onExecutionsTab,
					},
					{
						id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
						label: this.$locale.baseText('menuActions.importFromFile'),
						disabled: !this.onWorkflowPage || this.onExecutionsTab,
					},
				);
			}

			if (hasPermission(['rbac'], { rbac: { scope: 'sourceControl:push' } })) {
				actions.push({
					id: WORKFLOW_MENU_ACTIONS.PUSH,
					label: this.$locale.baseText('menuActions.push'),
					disabled:
						!this.sourceControlStore.isEnterpriseSourceControlEnabled ||
						!this.onWorkflowPage ||
						this.onExecutionsTab ||
						this.readOnlyEnv,
				});
			}

			actions.push({
				id: WORKFLOW_MENU_ACTIONS.SETTINGS,
				label: this.$locale.baseText('generic.settings'),
				disabled: !this.onWorkflowPage || this.isNewWorkflow,
			});

			if (this.workflowPermissions.delete && !this.readOnly) {
				actions.push({
					id: WORKFLOW_MENU_ACTIONS.DELETE,
					label: this.$locale.baseText('menuActions.delete'),
					disabled: !this.onWorkflowPage || this.isNewWorkflow,
					customClass: this.$style.deleteItem,
					divided: true,
				});
			}

			return actions;
		},
		isWorkflowHistoryFeatureEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(
				EnterpriseEditionFeature.WorkflowHistory,
			);
		},
		workflowHistoryRoute(): { name: string; params: { workflowId: string } } {
			return {
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: this.currentWorkflowId,
				},
			};
		},
		isWorkflowHistoryButtonDisabled(): boolean {
			return this.workflowsStore.isNewWorkflow;
		},
		showShareButton(): boolean {
			const workflow = this.workflowsStore.getWorkflowById(this.currentWorkflowId);
			return (
				(workflow && workflow.homeProject?.type !== 'team') ||
				(this.isNewWorkflow && this.projectsStore.currentProject?.type !== 'team')
			);
		},
	},
	watch: {
		currentWorkflowId() {
			this.isTagsEditEnabled = false;
			this.isNameEditEnabled = false;
		},
	},
	methods: {
		async onSaveButtonClick() {
			// If the workflow is saving, do not allow another save
			if (this.isWorkflowSaving) {
				return;
			}
			let currentId = undefined;
			if (this.currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				currentId = this.currentWorkflowId;
			} else if (this.$route.params.name && this.$route.params.name !== 'new') {
				currentId = this.$route.params.name;
			}
			const saved = await this.workflowHelpers.saveCurrentWorkflow({
				id: currentId,
				name: this.workflowName,
				tags: this.currentWorkflowTagIds,
			});

			if (saved) {
				await this.settingsStore.fetchPromptsData();

				if (this.$route.name === VIEWS.EXECUTION_DEBUG) {
					await this.$router.replace({
						name: VIEWS.WORKFLOW,
						params: { name: this.currentWorkflowId },
					});
				}
			}
		},
		onShareButtonClick() {
			this.uiStore.openModalWithData({
				name: WORKFLOW_SHARE_MODAL_KEY,
				data: { id: this.currentWorkflowId },
			});

			this.$telemetry.track('User opened sharing modal', {
				workflow_id: this.currentWorkflowId,
				user_id_sharer: this.currentUser?.id,
				sub_view: 'Workflow editor',
			});
		},
		onTagsEditEnable() {
			this.appliedTagIds = this.currentWorkflowTagIds;
			this.isTagsEditEnabled = true;

			setTimeout(() => {
				// allow name update to occur before disabling name edit
				this.isNameEditEnabled = false;
				this.tagsEditBus.emit('focus');
			}, 0);
		},

		async onTagsBlur() {
			const current = this.currentWorkflowTagIds;
			const tags = this.appliedTagIds;
			if (!hasChanged(current, tags)) {
				this.isTagsEditEnabled = false;

				return;
			}
			if (this.tagsSaving) {
				return;
			}
			this.tagsSaving = true;

			const saved = await this.workflowHelpers.saveCurrentWorkflow({ tags });
			this.$telemetry.track('User edited workflow tags', {
				workflow_id: this.currentWorkflowId,
				new_tag_count: tags.length,
			});

			this.tagsSaving = false;
			if (saved) {
				this.isTagsEditEnabled = false;
			}
		},
		onTagsEditEsc() {
			this.isTagsEditEnabled = false;
		},
		onNameToggle() {
			this.isNameEditEnabled = !this.isNameEditEnabled;
			if (this.isNameEditEnabled) {
				if (this.isTagsEditEnabled) {
					// @ts-ignore
					void this.onTagsBlur();
				}

				this.isTagsEditEnabled = false;
			}
		},
		async onNameSubmit({
			name,
			onSubmit: cb,
		}: {
			name: string;
			onSubmit: (saved: boolean) => void;
		}) {
			const newName = name.trim();
			if (!newName) {
				this.showMessage({
					title: this.$locale.baseText('workflowDetails.showMessage.title'),
					message: this.$locale.baseText('workflowDetails.showMessage.message'),
					type: 'error',
				});

				cb(false);
				return;
			}

			if (newName === this.workflowName) {
				this.isNameEditEnabled = false;

				cb(true);
				return;
			}
			this.uiStore.addActiveAction('workflowSaving');
			const saved = await this.workflowHelpers.saveCurrentWorkflow({ name });
			if (saved) {
				this.isNameEditEnabled = false;
			}
			this.uiStore.removeActiveAction('workflowSaving');
			cb(saved);
		},
		async handleFileImport(): Promise<void> {
			const inputRef = this.$refs.importFile as HTMLInputElement | undefined;
			if (inputRef?.files && inputRef.files.length !== 0) {
				const reader = new FileReader();
				reader.onload = () => {
					let workflowData: IWorkflowDataUpdate;
					try {
						workflowData = JSON.parse(reader.result as string);
					} catch (error) {
						this.showMessage({
							title: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
							message: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
							type: 'error',
						});
						return;
					} finally {
						reader.onload = undefined;
						inputRef.value = null;
					}

					nodeViewEventBus.emit('importWorkflowData', { data: workflowData });
				};
				reader.readAsText(inputRef.files[0]);
			}
		},
		async onWorkflowMenuSelect(action: string): Promise<void> {
			switch (action) {
				case WORKFLOW_MENU_ACTIONS.DUPLICATE: {
					this.uiStore.openModalWithData({
						name: DUPLICATE_MODAL_KEY,
						data: {
							id: this.workflowsStore.workflowId,
							name: this.workflowsStore.workflowName,
							tags: this.workflowsStore.workflowTags,
						},
					});
					break;
				}
				case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
					const workflowData = await this.workflowHelpers.getWorkflowDataToSave();
					const { tags, ...data } = workflowData;
					const exportData: IWorkflowToShare = {
						...data,
						meta: {
							...(this.workflowsStore.workflow.meta || {}),
							instanceId: this.rootStore.instanceId,
						},
						tags: (tags || []).map((tagId) => {
							const { usageCount, ...tag } = this.tagsStore.getTagById(tagId);

							return tag;
						}),
					};

					const blob = new Blob([JSON.stringify(exportData, null, 2)], {
						type: 'application/json;charset=utf-8',
					});

					let workflowName = this.workflowName || 'unsaved_workflow';
					workflowName = workflowName.replace(/[^a-z0-9]/gi, '_');

					this.$telemetry.track('User exported workflow', { workflow_id: workflowData.id });
					saveAs(blob, workflowName + '.json');
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL: {
					try {
						const promptResponse = (await this.prompt(
							this.$locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
							this.$locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
							{
								confirmButtonText: this.$locale.baseText('mainSidebar.prompt.import'),
								cancelButtonText: this.$locale.baseText('mainSidebar.prompt.cancel'),
								inputErrorMessage: this.$locale.baseText('mainSidebar.prompt.invalidUrl'),
								inputPattern: /^http[s]?:\/\/.*\.json$/i,
							},
						)) as MessageBoxInputData;

						if (promptResponse === 'cancel') {
							return;
						}

						nodeViewEventBus.emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
					(this.$refs.importFile as HTMLInputElement).click();
					break;
				}
				case WORKFLOW_MENU_ACTIONS.PUSH: {
					this.canvasStore.startLoading();
					try {
						await this.onSaveButtonClick();

						const status = await this.sourceControlStore.getAggregatedStatus();

						this.uiStore.openModalWithData({
							name: SOURCE_CONTROL_PUSH_MODAL_KEY,
							data: { eventBus: this.eventBus, status },
						});
					} catch (error) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						switch (error.message) {
							case 'source_control_not_connected':
								this.showError(
									{ ...error, message: '' },
									this.$locale.baseText('settings.sourceControl.error.not.connected.title'),
									this.$locale.baseText('settings.sourceControl.error.not.connected.message'),
								);
								break;
							default:
								this.showError(error, this.$locale.baseText('error'));
						}
					} finally {
						this.canvasStore.stopLoading();
					}

					break;
				}
				case WORKFLOW_MENU_ACTIONS.SETTINGS: {
					this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
					break;
				}
				case WORKFLOW_MENU_ACTIONS.DELETE: {
					const deleteConfirmed = await this.confirm(
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
							interpolate: { workflowName: this.workflowName },
						}),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
						{
							type: 'warning',
							confirmButtonText: this.$locale.baseText(
								'mainSidebar.confirmMessage.workflowDelete.confirmButtonText',
							),
							cancelButtonText: this.$locale.baseText(
								'mainSidebar.confirmMessage.workflowDelete.cancelButtonText',
							),
						},
					);

					if (deleteConfirmed !== MODAL_CONFIRM) {
						return;
					}

					try {
						await this.workflowsStore.deleteWorkflow(this.currentWorkflowId);
					} catch (error) {
						this.showError(error, this.$locale.baseText('generic.deleteWorkflowError'));
						return;
					}
					this.uiStore.stateIsDirty = false;
					// Reset tab title since workflow is deleted.
					this.titleReset();
					this.showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
						type: 'success',
					});

					await this.$router.push({ name: VIEWS.NEW_WORKFLOW });
					break;
				}
				default:
					break;
			}
		},
		goToUpgrade() {
			void this.uiStore.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
		},
	},
});
</script>

<style scoped lang="scss">
$--text-line-height: 24px;
$--header-spacing: 20px;

.container {
	position: relative;
	top: -1px;
	width: 100%;
	display: flex;
	align-items: center;
}

.name-container {
	margin-right: $--header-spacing;
}

.name {
	color: $custom-font-dark;
	font-size: 15px;
}

.activator {
	color: $custom-font-dark;
	font-weight: 400;
	font-size: 13px;
	line-height: $--text-line-height;
	display: flex;
	align-items: center;

	> span {
		margin-right: 5px;
	}
}

.add-tag {
	font-size: 12px;
	padding: 20px 0; // to be more clickable
	color: $custom-font-very-light;
	font-weight: 600;
	white-space: nowrap;

	&:hover {
		color: $color-primary;
	}
}

.tags {
	display: flex;
	align-items: center;
	width: 100%;
	flex: 1;
	margin-right: $--header-spacing;
}

.tags-edit {
	min-width: 100px;
	width: 100%;
	max-width: 460px;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing-m);
}
</style>

<style module lang="scss">
.group {
	display: flex;
	gap: var(--spacing-xs);
}
.hiddenInput {
	display: none;
}

.deleteItem {
	color: var(--color-danger);
}

.disabledShareButton {
	cursor: not-allowed;
}

.workflowHistoryButton {
	width: 30px;
	height: 30px;
	color: var(--color-text-dark);
	border-radius: var(--border-radius-base);

	&:hover {
		background-color: var(--color-background-base);
	}

	:disabled {
		background: transparent;
		border: none;
		opacity: 0.5;
	}
}
</style>
