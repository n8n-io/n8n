<script lang="ts" setup>
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

import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsageStore } from '@/stores/usage.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { saveAs } from 'file-saver';
import { useTitleChange } from '@/composables/useTitleChange';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';

import type { IPermissions } from '@/permissions';
import { getWorkflowPermissions } from '@/permissions';
import { createEventBus } from 'n8n-design-system/utils';
import { nodeViewEventBus } from '@/event-bus';
import { hasPermission } from '@/rbac/permissions';
import { useCanvasStore } from '@/stores/canvas.store';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { computed, ref, useCssModule, watch } from 'vue';
import type { IUser, IWorkflowDataUpdate, IWorkflowDb, IWorkflowToShare } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { MessageBoxInputData } from 'element-plus';

const props = defineProps({
	readOnly: {
		type: Boolean,
		default: false,
	},
});

const $style = useCssModule();

const rootStore = useRootStore();
const canvasStore = useCanvasStore();
const settingsStore = useSettingsStore();
const sourceControlStore = useSourceControlStore();
const tagsStore = useTagsStore();
const uiStore = useUIStore();
const usageStore = useUsageStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();

const router = useRouter();
const route = useRoute();

const locale = useI18n();
const telemetry = useTelemetry();
const message = useMessage();
const toast = useToast();
const titleChange = useTitleChange();
const workflowHelpers = useWorkflowHelpers({ router });

const isTagsEditEnabled = ref(false);
const isNameEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsEditBus = createEventBus();
const tagsSaving = ref(false);
const importFile = ref<HTMLInputElement | undefined>();
const eventBus = createEventBus();

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((accu, val) => accu || !set.has(val), false);
};

const currentUser = computed(() => {
	return usersStore.currentUser;
});

const contextBasedTranslationKeys = computed(() => {
	return uiStore.contextBasedTranslationKeys;
});

const isWorkflowActive = computed(() => {
	return workflowsStore.isWorkflowActive;
});

const workflowName = computed(() => {
	return workflowsStore.workflowName;
});

const isDirty = computed(() => {
	return uiStore.stateIsDirty;
});

const readOnlyEnv = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const currentWorkflowTagIds = computed(() => {
	return workflowsStore.workflowTags;
});

const isNewWorkflow = computed(() => {
	return (
		!currentWorkflowId.value ||
		currentWorkflowId.value === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
		currentWorkflowId.value === 'new'
	);
});

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive('workflowSaving');
});

const workflow = computed(() => {
	return workflowsStore.workflow;
});

const currentWorkflowId = computed(() => {
	return workflowsStore.workflowId;
});

const onWorkflowPage = computed(() => {
	return route.meta && (route.meta.nodeView || route.meta.keepWorkflowAlive === true);
});

const onExecutionsTab = computed(() => {
	return [
		VIEWS.EXECUTION_HOME.toString(),
		VIEWS.WORKFLOW_EXECUTIONS.toString(),
		VIEWS.EXECUTION_PREVIEW,
	].includes((route.name as string) || '');
});

const workflowPermissions = computed(() => {
	return getWorkflowPermissions(currentUser.value, workflow.value);
});

const workflowMenuItems = computed(() => {
	const actions = [
		{
			id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
			label: locale.baseText('menuActions.download'),
			disabled: !onWorkflowPage.value,
		},
	];

	if (!props.readOnly) {
		actions.unshift({
			id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
			label: locale.baseText('menuActions.duplicate'),
			disabled: !onWorkflowPage.value || !currentWorkflowId.value,
		});

		actions.push(
			{
				id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL,
				label: locale.baseText('menuActions.importFromUrl'),
				disabled: !onWorkflowPage.value || onExecutionsTab.value,
			},
			{
				id: WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE,
				label: locale.baseText('menuActions.importFromFile'),
				disabled: !onWorkflowPage.value || onExecutionsTab.value,
			},
		);
	}

	if (hasPermission(['rbac'], { rbac: { scope: 'sourceControl:push' } })) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.PUSH,
			label: locale.baseText('menuActions.push'),
			disabled:
				!sourceControlStore.isEnterpriseSourceControlEnabled ||
				!onWorkflowPage.value ||
				onExecutionsTab.value ||
				readOnlyEnv.value,
		});
	}

	actions.push({
		id: WORKFLOW_MENU_ACTIONS.SETTINGS,
		label: locale.baseText('generic.settings'),
		disabled: !onWorkflowPage.value || isNewWorkflow.value,
	});

	if (workflowPermissions.value.delete && !props.readOnly) {
		actions.push({
			id: WORKFLOW_MENU_ACTIONS.DELETE,
			label: locale.baseText('menuActions.delete'),
			disabled: !onWorkflowPage.value || isNewWorkflow.value,
			customClass: $style.deleteItem,
			divided: true,
		});
	}

	return actions;
});

const isWorkflowHistoryFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.WorkflowHistory);
});

const workflowHistoryRoute = computed<{ name: string; params: { workflowId: string } }>(() => {
	return {
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: currentWorkflowId.value,
		},
	};
});

const isWorkflowHistoryButtonDisabled = computed(() => {
	return workflowsStore.isNewWorkflow;
});

watch(currentWorkflowId, () => {
	isTagsEditEnabled.value = false;
	isNameEditEnabled.value = false;
});

async function onSaveButtonClick() {
	// If the workflow is saving, do not allow another save
	if (isWorkflowSaving.value) {
		return;
	}
	let currentId: string | undefined = undefined;
	if (currentWorkflowId.value !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		currentId = currentWorkflowId.value;
	} else if (route.params.name && route.params.name !== 'new') {
		currentId = route.params.name;
	}
	const saved = await workflowHelpers.saveCurrentWorkflow({
		id: currentId,
		name: workflowName.value,
		tags: currentWorkflowTagIds.value,
	});

	if (saved) {
		await settingsStore.fetchPromptsData();

		if (route.name === VIEWS.EXECUTION_DEBUG) {
			await router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: currentWorkflowId.value },
			});
		}
	}
}

function onShareButtonClick() {
	uiStore.openModalWithData({
		name: WORKFLOW_SHARE_MODAL_KEY,
		data: { id: currentWorkflowId.value },
	});

	telemetry.track('User opened sharing modal', {
		workflow_id: currentWorkflowId.value,
		user_id_sharer: currentUser.value?.id,
		sub_view: route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
	});
}

function onTagsEditEnable() {
	appliedTagIds.value = currentWorkflowTagIds.value;
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		// allow name update to occur before disabling name edit
		isNameEditEnabled.value = false;
		tagsEditBus.emit('focus');
	}, 0);
}

async function onTagsBlur() {
	const current = currentWorkflowTagIds.value;
	const tags = appliedTagIds.value;
	if (!hasChanged(current, tags)) {
		isTagsEditEnabled.value = false;

		return;
	}
	if (tagsSaving.value) {
		return;
	}
	tagsSaving.value = true;

	const saved = await workflowHelpers.saveCurrentWorkflow({ tags });
	telemetry.track('User edited workflow tags', {
		workflow_id: currentWorkflowId.value,
		new_tag_count: tags.length,
	});

	tagsSaving.value = false;
	if (saved) {
		isTagsEditEnabled.value = false;
	}
}

function onTagsEditEsc() {
	isTagsEditEnabled.value = false;
}

function onNameToggle() {
	isNameEditEnabled.value = !isNameEditEnabled.value;
	if (isNameEditEnabled.value) {
		if (isTagsEditEnabled.value) {
			void onTagsBlur();
		}

		isTagsEditEnabled.value = false;
	}
}

async function onNameSubmit({
	name,
	onSubmit: cb,
}: {
	name: string;
	onSubmit: (saved: boolean) => void;
}) {
	const newName = name.trim();
	if (!newName) {
		toast.showMessage({
			title: locale.baseText('workflowDetails.showMessage.title'),
			message: locale.baseText('workflowDetails.showMessage.message'),
			type: 'error',
		});

		cb(false);
		return;
	}

	if (newName === workflowName.value) {
		isNameEditEnabled.value = false;

		cb(true);
		return;
	}

	uiStore.addActiveAction('workflowSaving');
	const saved = await workflowHelpers.saveCurrentWorkflow({ name });
	if (saved) {
		isNameEditEnabled.value = false;
	}
	uiStore.removeActiveAction('workflowSaving');
	cb(saved);
}

async function handleFileImport(): Promise<void> {
	const inputRef = importFile.value;
	if (inputRef?.files && inputRef.files.length !== 0) {
		const reader = new FileReader();
		reader.onload = () => {
			let workflowData: IWorkflowDataUpdate;
			try {
				workflowData = JSON.parse(reader.result as string);
			} catch (error) {
				toast.showMessage({
					title: locale.baseText('mainSidebar.showMessage.handleFileImport.title'),
					message: locale.baseText('mainSidebar.showMessage.handleFileImport.message'),
					type: 'error',
				});
				return;
			} finally {
				reader.onload = null;
				inputRef.value = '';
			}

			nodeViewEventBus.emit('importWorkflowData', { data: workflowData });
		};
		reader.readAsText(inputRef.files[0]);
	}
}

async function onWorkflowMenuSelect(action: string): Promise<void> {
	switch (action) {
		case WORKFLOW_MENU_ACTIONS.DUPLICATE: {
			uiStore.openModalWithData({
				name: DUPLICATE_MODAL_KEY,
				data: {
					id: workflowsStore.workflowId,
					name: workflowsStore.workflowName,
					tags: workflowsStore.workflowTags,
				},
			});
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DOWNLOAD: {
			const workflowData = await workflowHelpers.getWorkflowDataToSave();
			const { tags, ...data } = workflowData;
			const exportData: IWorkflowToShare = {
				...data,
				meta: {
					...(workflowsStore.workflow.meta || {}),
					instanceId: rootStore.instanceId,
				},
				tags: (tags || []).map((tagId) => {
					const { usageCount, ...tag } = tagsStore.getTagById(tagId);

					return tag;
				}),
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json;charset=utf-8',
			});

			let name = workflowName.value || 'unsaved_workflow';
			name = name.replace(/[^a-z0-9]/gi, '_');

			telemetry.track('User exported workflow', { workflow_id: workflowData.id });
			saveAs(blob, name + '.json');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL: {
			try {
				const promptResponse = (await message.prompt(
					locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
					locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
					{
						confirmButtonText: locale.baseText('mainSidebar.prompt.import'),
						cancelButtonText: locale.baseText('mainSidebar.prompt.cancel'),
						inputErrorMessage: locale.baseText('mainSidebar.prompt.invalidUrl'),
						inputPattern: /^http[s]?:\/\/.*\.json$/i,
					},
				)) as MessageBoxInputData;

				if ((promptResponse as string) === 'cancel') {
					return;
				}

				nodeViewEventBus.emit('importWorkflowUrl', { url: promptResponse.value });
			} catch (e) {}
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
			importFile.value?.click();
			break;
		}
		case WORKFLOW_MENU_ACTIONS.PUSH: {
			canvasStore.startLoading();
			try {
				await onSaveButtonClick();

				const status = await sourceControlStore.getAggregatedStatus();

				uiStore.openModalWithData({
					name: SOURCE_CONTROL_PUSH_MODAL_KEY,
					data: { eventBus, status },
				});
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				switch (error.message) {
					case 'source_control_not_connected':
						toast.showError(
							{ ...error, message: '' },
							locale.baseText('settings.sourceControl.error.not.connected.title'),
							locale.baseText('settings.sourceControl.error.not.connected.message'),
						);
						break;
					default:
						toast.showError(error, locale.baseText('error'));
				}
			} finally {
				canvasStore.stopLoading();
			}

			break;
		}
		case WORKFLOW_MENU_ACTIONS.SETTINGS: {
			uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			break;
		}
		case WORKFLOW_MENU_ACTIONS.DELETE: {
			const deleteConfirmed = await message.confirm(
				locale.baseText('mainSidebar.confirmMessage.workflowDelete.message', {
					interpolate: { workflowName: workflowName.value },
				}),
				locale.baseText('mainSidebar.confirmMessage.workflowDelete.headline'),
				{
					type: 'warning',
					confirmButtonText: locale.baseText(
						'mainSidebar.confirmMessage.workflowDelete.confirmButtonText',
					),
					cancelButtonText: locale.baseText(
						'mainSidebar.confirmMessage.workflowDelete.cancelButtonText',
					),
				},
			);

			if (deleteConfirmed !== MODAL_CONFIRM) {
				return;
			}

			try {
				await workflowsStore.deleteWorkflow(currentWorkflowId.value);
			} catch (error) {
				toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
				return;
			}
			uiStore.stateIsDirty = false;
			// Reset tab title since workflow is deleted.
			titleChange.titleReset();
			toast.showMessage({
				title: locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
				type: 'success',
			});

			await router.push({ name: VIEWS.NEW_WORKFLOW });
			break;
		}
		default:
			break;
	}
}

function goToUpgrade() {
	void uiStore.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
}
</script>

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
