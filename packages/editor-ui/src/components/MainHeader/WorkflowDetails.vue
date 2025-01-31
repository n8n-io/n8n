<script lang="ts" setup>
import {
	DUPLICATE_MODAL_KEY,
	EnterpriseEditionFeature,
	MAX_WORKFLOW_NAME_LENGTH,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	VALID_WORKFLOW_IMPORT_URL_REGEX,
	VIEWS,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import ShortenName from '@/components/ShortenName.vue';
import WorkflowTagsContainer from '@/components/WorkflowTagsContainer.vue';
import PushConnectionTracker from '@/components/PushConnectionTracker.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import SaveButton from '@/components/SaveButton.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import InlineTextEdit from '@/components/InlineTextEdit.vue';
import BreakpointsObserver from '@/components/BreakpointsObserver.vue';
import WorkflowHistoryButton from '@/components/MainHeader/WorkflowHistoryButton.vue';
import CollaborationPane from '@/components/MainHeader/CollaborationPane.vue';

import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';

import { saveAs } from 'file-saver';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { getResourcePermissions } from '@/permissions';
import { createEventBus } from 'n8n-design-system/utils';
import { nodeViewEventBus } from '@/event-bus';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCanvasStore } from '@/stores/canvas.store';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { computed, ref, useCssModule, watch } from 'vue';
import type {
	ActionDropdownItem,
	IWorkflowDataUpdate,
	IWorkflowDb,
	IWorkflowToShare,
} from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { BaseTextKey } from '@/plugins/i18n';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	scopes: IWorkflowDb['scopes'];
	active: IWorkflowDb['active'];
}>();

const $style = useCssModule();

const rootStore = useRootStore();
const canvasStore = useCanvasStore();
const settingsStore = useSettingsStore();
const sourceControlStore = useSourceControlStore();
const tagsStore = useTagsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const npsSurveyStore = useNpsSurveyStore();
const i18n = useI18n();

const router = useRouter();
const route = useRoute();

const locale = useI18n();
const telemetry = useTelemetry();
const message = useMessage();
const toast = useToast();
const documentTitle = useDocumentTitle();
const workflowHelpers = useWorkflowHelpers({ router });
const pageRedirectionHelper = usePageRedirectionHelper();

const isTagsEditEnabled = ref(false);
const isNameEditEnabled = ref(false);
const appliedTagIds = ref<string[]>([]);
const tagsSaving = ref(false);
const importFileRef = ref<HTMLInputElement | undefined>();

const tagsEventBus = createEventBus();
const sourceControlModalEventBus = createEventBus();

const hasChanged = (prev: string[], curr: string[]) => {
	if (prev.length !== curr.length) {
		return true;
	}

	const set = new Set(prev);
	return curr.reduce((acc, val) => acc || !set.has(val), false);
};

const isNewWorkflow = computed(() => {
	return !props.id || props.id === PLACEHOLDER_EMPTY_WORKFLOW_ID || props.id === 'new';
});

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
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

const workflowPermissions = computed(() => getResourcePermissions(props.scopes).workflow);

const workflowMenuItems = computed<ActionDropdownItem[]>(() => {
	const actions: ActionDropdownItem[] = [
		{
			id: WORKFLOW_MENU_ACTIONS.DOWNLOAD,
			label: locale.baseText('menuActions.download'),
			disabled: !onWorkflowPage.value,
		},
	];

	if ((workflowPermissions.value.delete && !props.readOnly) || isNewWorkflow.value) {
		actions.unshift({
			id: WORKFLOW_MENU_ACTIONS.DUPLICATE,
			label: locale.baseText('menuActions.duplicate'),
			disabled: !onWorkflowPage.value || !props.id,
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
				sourceControlStore.preferences.branchReadOnly,
		});
	}

	actions.push({
		id: WORKFLOW_MENU_ACTIONS.SETTINGS,
		label: locale.baseText('generic.settings'),
		disabled: !onWorkflowPage.value || isNewWorkflow.value,
	});

	if ((workflowPermissions.value.delete && !props.readOnly) || isNewWorkflow.value) {
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
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const workflowTagIds = computed(() => {
	return (props.tags ?? []).map((tag) => (typeof tag === 'string' ? tag : tag.id));
});

watch(
	() => props.id,
	() => {
		isTagsEditEnabled.value = false;
		isNameEditEnabled.value = false;
	},
);

function getWorkflowId(): string | undefined {
	let id: string | undefined = undefined;
	if (props.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		id = props.id;
	} else if (route.params.name && route.params.name !== 'new') {
		id = route.params.name as string;
	}

	return id;
}

async function onSaveButtonClick() {
	// If the workflow is saving, do not allow another save
	if (isWorkflowSaving.value) {
		return;
	}

	const id = getWorkflowId();

	const name = props.name;
	const tags = props.tags as string[];

	const saved = await workflowHelpers.saveCurrentWorkflow({
		id,
		name,
		tags,
	});

	if (saved) {
		showCreateWorkflowSuccessToast(id);

		await npsSurveyStore.fetchPromptsData();

		if (route.name === VIEWS.EXECUTION_DEBUG) {
			await router.replace({
				name: VIEWS.WORKFLOW,
				params: { name: props.id },
			});
		}
	}
}

function onShareButtonClick() {
	uiStore.openModalWithData({
		name: WORKFLOW_SHARE_MODAL_KEY,
		data: { id: props.id },
	});

	telemetry.track('User opened sharing modal', {
		workflow_id: props.id,
		user_id_sharer: usersStore.currentUser?.id,
		sub_view: route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
	});
}

function onTagsEditEnable() {
	appliedTagIds.value = (props.tags ?? []) as string[];
	isTagsEditEnabled.value = true;

	setTimeout(() => {
		// allow name update to occur before disabling name edit
		isNameEditEnabled.value = false;
		tagsEventBus.emit('focus');
	}, 0);
}

async function onTagsBlur() {
	const current = (props.tags ?? []) as string[];
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
		workflow_id: props.id,
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
	onSubmit,
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

		onSubmit(false);
		return;
	}

	if (newName === props.name) {
		isNameEditEnabled.value = false;

		onSubmit(true);
		return;
	}

	uiStore.addActiveAction('workflowSaving');
	const id = getWorkflowId();
	const saved = await workflowHelpers.saveCurrentWorkflow({ name });
	if (saved) {
		isNameEditEnabled.value = false;
		showCreateWorkflowSuccessToast(id);
		workflowHelpers.setDocumentTitle(newName, 'IDLE');
	}
	uiStore.removeActiveAction('workflowSaving');
	onSubmit(saved);
}

async function handleFileImport(): Promise<void> {
	const inputRef = importFileRef.value;
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

async function onWorkflowMenuSelect(action: WORKFLOW_MENU_ACTIONS): Promise<void> {
	switch (action) {
		case WORKFLOW_MENU_ACTIONS.DUPLICATE: {
			uiStore.openModalWithData({
				name: DUPLICATE_MODAL_KEY,
				data: {
					id: props.id,
					name: props.name,
					tags: props.tags,
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
					...props.meta,
					instanceId: rootStore.instanceId,
				},
				tags: (tags ?? []).map((tagId) => {
					const { usageCount, ...tag } = tagsStore.tagsById[tagId];

					return tag;
				}),
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], {
				type: 'application/json;charset=utf-8',
			});

			let name = props.name || 'unsaved_workflow';
			name = name.replace(/[^a-z0-9]/gi, '_');

			telemetry.track('User exported workflow', { workflow_id: workflowData.id });
			saveAs(blob, name + '.json');
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_URL: {
			try {
				const promptResponse = await message.prompt(
					locale.baseText('mainSidebar.prompt.workflowUrl') + ':',
					locale.baseText('mainSidebar.prompt.importWorkflowFromUrl') + ':',
					{
						confirmButtonText: locale.baseText('mainSidebar.prompt.import'),
						cancelButtonText: locale.baseText('mainSidebar.prompt.cancel'),
						inputErrorMessage: locale.baseText('mainSidebar.prompt.invalidUrl'),
						inputPattern: VALID_WORKFLOW_IMPORT_URL_REGEX,
					},
				);

				if (promptResponse.action === 'cancel') {
					return;
				}

				nodeViewEventBus.emit('importWorkflowUrl', { url: promptResponse.value });
			} catch (e) {}
			break;
		}
		case WORKFLOW_MENU_ACTIONS.IMPORT_FROM_FILE: {
			importFileRef.value?.click();
			break;
		}
		case WORKFLOW_MENU_ACTIONS.PUSH: {
			canvasStore.startLoading();
			try {
				await onSaveButtonClick();

				const status = await sourceControlStore.getAggregatedStatus();

				uiStore.openModalWithData({
					name: SOURCE_CONTROL_PUSH_MODAL_KEY,
					data: { eventBus: sourceControlModalEventBus, status },
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
					interpolate: { workflowName: props.name },
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
				await workflowsStore.deleteWorkflow(props.id);
			} catch (error) {
				toast.showError(error, locale.baseText('generic.deleteWorkflowError'));
				return;
			}
			uiStore.stateIsDirty = false;
			// Reset tab title since workflow is deleted.
			documentTitle.reset();
			toast.showMessage({
				title: locale.baseText('mainSidebar.showMessage.handleSelect1.title'),
				type: 'success',
			});

			await router.push({ name: VIEWS.WORKFLOWS });
			break;
		}
		default:
			break;
	}
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
}

function goToWorkflowHistoryUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow-history', 'upgrade-workflow-history');
}

function showCreateWorkflowSuccessToast(id?: string) {
	if (!id || ['new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(id)) {
		let toastTitle = locale.baseText('workflows.create.personal.toast.title');
		let toastText = locale.baseText('workflows.create.personal.toast.text');

		if (
			projectsStore.currentProject &&
			projectsStore.currentProject.id !== projectsStore.personalProject?.id
		) {
			toastTitle = locale.baseText('workflows.create.project.toast.title', {
				interpolate: { projectName: projectsStore.currentProject.name ?? '' },
			});

			toastText = locale.baseText('workflows.create.project.toast.text', {
				interpolate: { projectName: projectsStore.currentProject.name ?? '' },
			});
		}

		toast.showMessage({
			title: toastTitle,
			message: toastText,
			type: 'success',
		});
	}
}
</script>

<template>
	<div :class="$style.container">
		<BreakpointsObserver :value-x-s="15" :value-s-m="25" :value-m-d="50" class="name-container">
			<template #default="{ value }">
				<ShortenName :name="name" :limit="value" :custom="true" test-id="workflow-name-input">
					<template #default="{ shortenedName }">
						<InlineTextEdit
							:model-value="name"
							:preview-value="shortenedName"
							:is-edit-enabled="isNameEditEnabled"
							:max-length="MAX_WORKFLOW_NAME_LENGTH"
							:disabled="readOnly || (!isNewWorkflow && !workflowPermissions.update)"
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
			<WorkflowTagsDropdown
				v-if="isTagsEditEnabled && !readOnly && (isNewWorkflow || workflowPermissions.update)"
				ref="dropdown"
				v-model="appliedTagIds"
				:event-bus="tagsEventBus"
				:placeholder="i18n.baseText('workflowDetails.chooseOrCreateATag')"
				class="tags-edit"
				data-test-id="workflow-tags-dropdown"
				@blur="onTagsBlur"
				@esc="onTagsEditEsc"
			/>
			<div
				v-else-if="
					(tags ?? []).length === 0 && !readOnly && (isNewWorkflow || workflowPermissions.update)
				"
			>
				<span class="add-tag clickable" data-test-id="new-tag-link" @click="onTagsEditEnable">
					+ {{ i18n.baseText('workflowDetails.addTag') }}
				</span>
			</div>
			<WorkflowTagsContainer
				v-else
				:key="id"
				:tag-ids="workflowTagIds"
				:clickable="true"
				:responsive="true"
				data-test-id="workflow-tags"
				@click="onTagsEditEnable"
			/>
		</span>
		<span v-else class="tags"></span>

		<PushConnectionTracker class="actions">
			<span :class="`activator ${$style.group}`">
				<WorkflowActivator
					:workflow-active="active"
					:workflow-id="id"
					:workflow-permissions="workflowPermissions"
				/>
			</span>
			<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]">
				<div :class="$style.group">
					<CollaborationPane v-if="!isNewWorkflow" />
					<N8nButton
						type="secondary"
						data-test-id="workflow-share-button"
						@click="onShareButtonClick"
					>
						{{ i18n.baseText('workflowDetails.share') }}
					</N8nButton>
				</div>
				<template #fallback>
					<N8nTooltip>
						<N8nButton type="secondary" :class="['mr-2xs', $style.disabledShareButton]">
							{{ i18n.baseText('workflowDetails.share') }}
						</N8nButton>
						<template #content>
							<i18n-t
								:keypath="
									uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description
										.tooltip
								"
								tag="span"
							>
								<template #action>
									<a @click="goToUpgrade">
										{{
											i18n.baseText(
												uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable
													.button as BaseTextKey,
											)
										}}
									</a>
								</template>
							</i18n-t>
						</template>
					</N8nTooltip>
				</template>
			</EnterpriseEdition>
			<div :class="$style.group">
				<SaveButton
					type="primary"
					:saved="!uiStore.stateIsDirty && !isNewWorkflow"
					:disabled="
						isWorkflowSaving || readOnly || (!isNewWorkflow && !workflowPermissions.update)
					"
					:is-saving="isWorkflowSaving"
					:with-shortcut="!readOnly && workflowPermissions.update"
					:shortcut-tooltip="i18n.baseText('saveWorkflowButton.hint')"
					data-test-id="workflow-save-button"
					@click="onSaveButtonClick"
				/>
				<WorkflowHistoryButton
					:workflow-id="props.id"
					:is-feature-enabled="isWorkflowHistoryFeatureEnabled"
					:is-new-workflow="isNewWorkflow"
					@upgrade="goToWorkflowHistoryUpgrade"
				/>
			</div>
			<div :class="[$style.workflowMenuContainer, $style.group]">
				<input
					ref="importFileRef"
					:class="$style.hiddenInput"
					type="file"
					data-test-id="workflow-import-input"
					@change="handleFileImport()"
				/>
				<N8nActionDropdown
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

.name-container {
	margin-right: $--header-spacing;

	:deep(.el-input) {
		padding: 0;
	}
}

.name {
	color: $custom-font-dark;
	font-size: 15px;
	display: block;
}

.activator {
	color: $custom-font-dark;
	font-weight: 400;
	font-size: 13px;
	line-height: $--text-line-height;
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
	flex-wrap: nowrap;
}

@include mixins.breakpoint('xs-only') {
	.name {
		:deep(input) {
			min-width: 180px;
		}
	}
}
</style>

<style module lang="scss">
.container {
	position: relative;
	width: 100%;
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
}

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

.closeNodeViewDiscovery {
	position: absolute;
	right: var(--spacing-xs);
	top: var(--spacing-xs);
	cursor: pointer;
}
</style>
