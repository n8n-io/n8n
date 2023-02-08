<template>
	<div class="container" v-if="workflowName">
		<BreakpointsObserver :valueXS="15" :valueSM="25" :valueMD="50" class="name-container">
			<template #default="{ value }">
				<ShortenName
					:name="workflowName"
					:limit="value"
					:custom="true"
					testId="workflow-name-input"
				>
					<template #default="{ shortenedName }">
						<InlineTextEdit
							:value="workflowName"
							:previewValue="shortenedName"
							:isEditEnabled="isNameEditEnabled"
							:maxLength="MAX_WORKFLOW_NAME_LENGTH"
							@toggle="onNameToggle"
							@submit="onNameSubmit"
							placeholder="Enter workflow name"
							class="name"
						/>
					</template>
				</ShortenName>
			</template>
		</BreakpointsObserver>

		<span v-if="settingsStore.areTagsEnabled" class="tags" data-test-id="workflow-tags-container">
			<div v-if="isTagsEditEnabled">
				<TagsDropdown
					:createEnabled="true"
					:currentTagIds="appliedTagIds"
					:eventBus="tagsEditBus"
					@blur="onTagsBlur"
					@update="onTagsUpdate"
					@esc="onTagsEditEsc"
					:placeholder="$locale.baseText('workflowDetails.chooseOrCreateATag')"
					ref="dropdown"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
				/>
			</div>
			<div v-else-if="currentWorkflowTagIds.length === 0">
				<span class="add-tag clickable" data-test-id="new-tag-link" @click="onTagsEditEnable">
					+ {{ $locale.baseText('workflowDetails.addTag') }}
				</span>
			</div>
			<TagsContainer
				v-else
				:tagIds="currentWorkflowTagIds"
				:clickable="true"
				:responsive="true"
				:key="currentWorkflowId"
				@click="onTagsEditEnable"
				data-test-id="workflow-tags"
			/>
		</span>
		<span v-else class="tags"></span>

		<PushConnectionTracker class="actions">
			<template>
				<span class="activator">
					<WorkflowActivator :workflow-active="isWorkflowActive" :workflow-id="currentWorkflowId" />
				</span>
				<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]">
					<n8n-button type="secondary" class="mr-2xs" @click="onShareButtonClick">
						{{ $locale.baseText('workflowDetails.share') }}
					</n8n-button>
					<template #fallback>
						<n8n-tooltip>
							<n8n-button type="secondary" :class="['mr-2xs', $style.disabledShareButton]">
								{{ $locale.baseText('workflowDetails.share') }}
							</n8n-button>
							<template #content>
								<i18n
									:path="
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
								</i18n>
							</template>
						</n8n-tooltip>
					</template>
				</enterprise-edition>
				<SaveButton
					type="primary"
					:saved="!this.isDirty && !this.isNewWorkflow"
					:disabled="isWorkflowSaving"
					data-test-id="workflow-save-button"
					@click="onSaveButtonClick"
				/>
				<div :class="$style.workflowMenuContainer">
					<input
						:class="$style.hiddenInput"
						type="file"
						ref="importFile"
						data-test-id="workflow-import-input"
						@change="handleFileImport()"
					/>
					<n8n-action-dropdown
						:items="workflowMenuItems"
						data-test-id="workflow-menu"
						@select="onWorkflowMenuSelect"
					/>
				</div>
			</template>
		</PushConnectionTracker>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import {
	DUPLICATE_MODAL_KEY,
	EnterpriseEditionFeature,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';

import ShortenName from '@/components/ShortenName.vue';
import TagsContainer from '@/components/TagsContainer.vue';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import SaveButton from '@/components/SaveButton.vue';
import TagsDropdown from '@/components/TagsDropdown.vue';
import InlineTextEdit from '@/components/InlineTextEdit.vue';
import BreakpointsObserver from '@/components/BreakpointsObserver.vue';
import { IUser, IWorkflowDataUpdate, IWorkflowDb, IWorkflowToShare } from '@/Interface';

import { saveAs } from 'file-saver';
import { titleChange } from '@/mixins/titleChange';
import type { MessageBoxInputData } from 'element-ui/types/message-box';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useTagsStore } from '@/stores/tags';
import { getWorkflowPermissions, IPermissions } from '@/permissions';
import { useUsersStore } from '@/stores/users';
import { useUsageStore } from '@/stores/usage';
import { BaseTextKey } from '@/plugins/i18n';

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((accu, val) => accu || !set.has(val), false);
};

export default mixins(workflowHelpers, titleChange).extend({
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
	},
	data() {
		return {
			isTagsEditEnabled: false,
			isNameEditEnabled: false,
			appliedTagIds: [],
			tagsEditBus: new Vue(),
			MAX_WORKFLOW_NAME_LENGTH,
			tagsSaving: false,
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
		),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		contextBasedTranslationKeys(): NestedRecord<string> {
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
		workflowPermissions(): IPermissions {
			return getWorkflowPermissions(this.usersStore.currentUser, this.workflow);
		},
		workflowMenuItems(): Array<{}> {
			return [
				{
					id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
					label: this.$locale.baseText('menuActions.duplicate'),
					disabled: !this.onWorkflowPage || !this.currentWorkflowId,
				},
				{
					id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
					label: this.$locale.baseText('menuActions.download'),
					disabled: !this.onWorkflowPage,
				},
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
				{
					id: WORKFLOW_MENU_ACTIONS.SETTINGS,
					label: this.$locale.baseText('generic.settings'),
					disabled: !this.onWorkflowPage || this.isNewWorkflow,
				},
				...(this.workflowPermissions.delete
					? [
							{
								id: WORKFLOW_MENU_ACTIONS.DELETE,
								label: this.$locale.baseText('menuActions.delete'),
								disabled: !this.onWorkflowPage || this.isNewWorkflow,
								customClass: this.$style.deleteItem,
								divided: true,
							},
					  ]
					: []),
			];
		},
	},
	methods: {
		async onSaveButtonClick() {
			let currentId = undefined;
			if (this.currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				currentId = this.currentWorkflowId;
			} else if (this.$route.params.name && this.$route.params.name !== 'new') {
				currentId = this.$route.params.name;
			}
			const saved = await this.saveCurrentWorkflow({
				id: currentId,
				name: this.workflowName,
				tags: this.currentWorkflowTagIds,
			});
			if (saved) await this.settingsStore.fetchPromptsData();
		},
		onShareButtonClick() {
			this.uiStore.openModalWithData({
				name: WORKFLOW_SHARE_MODAL_KEY,
				data: { id: this.currentWorkflowId },
			});

			this.$telemetry.track('User opened sharing modal', {
				workflow_id: this.currentWorkflowId,
				user_id_sharer: this.currentUser?.id,
				sub_view: this.$route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
			});
		},
		onTagsEditEnable() {
			this.$data.appliedTagIds = this.currentWorkflowTagIds;
			this.$data.isTagsEditEnabled = true;

			setTimeout(() => {
				// allow name update to occur before disabling name edit
				this.$data.isNameEditEnabled = false;
				this.$data.tagsEditBus.$emit('focus');
			}, 0);
		},
		async onTagsUpdate(tags: string[]) {
			this.$data.appliedTagIds = tags;
		},

		async onTagsBlur() {
			const current = this.currentWorkflowTagIds;
			const tags = this.$data.appliedTagIds;
			if (!hasChanged(current, tags)) {
				this.$data.isTagsEditEnabled = false;

				return;
			}
			if (this.$data.tagsSaving) {
				return;
			}
			this.$data.tagsSaving = true;

			const saved = await this.saveCurrentWorkflow({ tags });
			this.$telemetry.track('User edited workflow tags', {
				workflow_id: this.currentWorkflowId as string,
				new_tag_count: tags.length,
			});

			this.$data.tagsSaving = false;
			if (saved) {
				this.$data.isTagsEditEnabled = false;
			}
		},
		onTagsEditEsc() {
			this.$data.isTagsEditEnabled = false;
		},
		onNameToggle() {
			this.$data.isNameEditEnabled = !this.$data.isNameEditEnabled;
			if (this.$data.isNameEditEnabled) {
				if (this.$data.isTagsEditEnabled) {
					// @ts-ignore
					this.onTagsBlur();
				}

				this.$data.isTagsEditEnabled = false;
			}
		},
		async onNameSubmit(name: string, cb: (saved: boolean) => void) {
			const newName = name.trim();
			if (!newName) {
				this.$showMessage({
					title: this.$locale.baseText('workflowDetails.showMessage.title'),
					message: this.$locale.baseText('workflowDetails.showMessage.message'),
					type: 'error',
				});

				cb(false);
				return;
			}

			if (newName === this.workflowName) {
				this.$data.isNameEditEnabled = false;

				cb(true);
				return;
			}

			const saved = await this.saveCurrentWorkflow({ name });
			if (saved) {
				this.$data.isNameEditEnabled = false;
			}
			cb(saved);
		},
		async handleFileImport(): Promise<void> {
			const reader = new FileReader();
			reader.onload = (event: ProgressEvent) => {
				const data = (event.target as FileReader).result;

				let workflowData: IWorkflowDataUpdate;
				try {
					workflowData = JSON.parse(data as string);
				} catch (error) {
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
						message: this.$locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
						type: 'error',
					});
					return;
				}

				this.$root.$emit('importWorkflowData', { data: workflowData });
			};

			const input = this.$refs.importFile as HTMLInputElement;
			if (input !== null && input.files !== null && input.files.length !== 0) {
				reader.readAsText(input!.files[0]!);
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
					const workflowData = await this.getWorkflowDataToSave();
					const { tags, ...data } = workflowData;
					const exportData: IWorkflowToShare = {
						...data,
						meta: {
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
						const promptResponse = (await this.$prompt(
							this.$locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
							this.$locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
							{
								confirmButtonText: this.$locale.baseText('mainSidebar.prompt.import'),
								cancelButtonText: this.$locale.baseText('mainSidebar.prompt.cancel'),
								inputErrorMessage: this.$locale.baseText('mainSidebar.prompt.invalidUrl'),
								inputPattern: /^http[s]?:\/\/.*\.json$/i,
							},
						)) as MessageBoxInputData;

						this.$root.$emit('importWorkflowUrl', { url: promptResponse.value });
					} catch (e) {}
					break;
				}
				case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
					(this.$refs.importFile as HTMLInputElement).click();
					break;
				}
				case WORKFLOW_MENU_ACTIONS.SETTINGS: {
					this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
					break;
				}
				case WORKFLOW_MENU_ACTIONS.DELETE: {
					const deleteConfirmed = await this.confirmMessage(
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
							interpolate: { workflowName: this.workflowName },
						}),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
						'warning',
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.confirmButtonText'),
						this.$locale.baseText('mainSidebar.confirmMessage.workflowDelete.cancelButtonText'),
					);

					if (deleteConfirmed === false) {
						return;
					}

					try {
						await this.restApi().deleteWorkflow(this.currentWorkflowId);
					} catch (error) {
						this.$showError(
							error,
							this.$locale.baseText('mainSidebar.showError.stopExecution.title'),
						);
						return;
					}
					this.uiStore.stateIsDirty = false;
					// Reset tab title since workflow is deleted.
					this.$titleReset();
					this.$showMessage({
						title: this.$locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
						type: 'success',
					});

					this.$router.push({ name: VIEWS.NEW_WORKFLOW });
					break;
				}
				default:
					break;
			}
		},
		goToUpgrade() {
			const linkUrlTranslationKey = this.uiStore.contextBasedTranslationKeys
				.upgradeLinkUrl as BaseTextKey;
			let linkUrl = this.$locale.baseText(linkUrlTranslationKey);

			if (linkUrlTranslationKey.endsWith('.upgradeLinkUrl')) {
				linkUrl = `${this.usageStore.viewPlansUrl}&source=workflow_sharing`;
			} else if (linkUrlTranslationKey.endsWith('.desktop')) {
				linkUrl = `${linkUrl}&utm_campaign=upgrade-workflow-sharing`;
			}

			window.open(linkUrl, '_blank');
		},
	},
	watch: {
		currentWorkflowId() {
			this.$data.isTagsEditEnabled = false;
			this.$data.isNameEditEnabled = false;
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
	margin-right: 30px;

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
	flex: 1;
	margin-right: $--header-spacing;
}

.tags-edit {
	min-width: 100px;
	max-width: 460px;
}

.actions {
	display: flex;
	align-items: center;
}
</style>

<style module lang="scss">
.workflowMenuContainer {
	margin-left: var(--spacing-2xs);
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
</style>
