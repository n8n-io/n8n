<script lang="ts" setup>
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import {
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_UNPUBLISH,
	AutoSaveState,
	EnterpriseEditionFeature,
} from '@/app/constants';
import {
	type ActionDropdownItem,
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRouter } from 'vue-router';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import {
	getLastPublishedVersion,
	generateVersionName,
} from '@/features/workflows/workflowHistory/utils';
import { nodeViewEventBus } from '@/app/event-bus';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';
import TimeAgo from '../TimeAgo.vue';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { useToast } from '@/app/composables/useToast';
import { createEventBus } from '@n8n/utils/event-bus';
import type { WorkflowVersionFormModalEventBusEvents } from '@/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useKeybindings } from '@/app/composables/useKeybindings';

const props = defineProps<{
	id: IWorkflowDb['id'];
	tags: readonly string[];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	isNewWorkflow: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsDropdownMenu>>('actionsMenu');

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const collaborationStore = useCollaborationStore();
const projectStore = useProjectsStore();
const workflowHistoryStore = useWorkflowHistoryStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const router = useRouter();
const toast = useToast();

const saveStore = useWorkflowSaveStore();
const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router });
const workflowActivate = useWorkflowActivate();

const isNamedVersionsEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.NamedVersions],
);

const autoSaveForPublish = ref(false);

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

type WorkflowPublishState =
	| 'not-published-not-eligible' // No trigger nodes or has errors
	| 'not-published-eligible' // Can be published for first time
	| 'published-no-changes' // Published and up to date
	| 'published-with-changes' // Published but has unpublished changes
	| 'published-node-issues' // Published but has node issues
	| 'published-invalid-trigger'; // Published but no trigger nodes

const workflowPublishState = computed((): WorkflowPublishState => {
	const hasBeenPublished = !!workflowsStore.workflow.activeVersion;
	const hasChanges =
		workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId ||
		uiStore.hasUnsavedWorkflowChanges;

	// Not published states
	if (!hasBeenPublished) {
		const canPublish = containsTrigger.value && !workflowsStore.nodesIssuesExist;
		return canPublish ? 'not-published-eligible' : 'not-published-not-eligible';
	}

	// Published states
	if (!containsTrigger.value) {
		return 'published-invalid-trigger';
	}

	if (workflowsStore.nodesIssuesExist) {
		return 'published-node-issues';
	}

	return hasChanges ? 'published-with-changes' : 'published-no-changes';
});

const collaborationReadOnly = computed(() => collaborationStore.shouldBeReadOnly);
const hasUpdatePermission = computed(() => props.workflowPermissions.update);
const hasPublishPermission = computed(() => props.workflowPermissions.publish);
const hasUnpublishPermission = computed(() => props.workflowPermissions.unpublish);

const isPersonalSpace = computed(() => projectStore.currentProject?.type === ProjectTypes.Personal);

/**
 * Cancel autosave if scheduled or wait for it to finish if in progress
 * Save immediately if autosave idle or cancelled
 */
const saveBeforePublish = async () => {
	let saved = false;
	if (saveStore.autoSaveState === AutoSaveState.InProgress && saveStore.pendingSave) {
		autoSaveForPublish.value = true;
		try {
			await saveStore.pendingSave;
			saved = true;
		} catch {
			// Autosave failed, will attempt manual save below
		} finally {
			autoSaveForPublish.value = false;
		}
	} else if (saveStore.autoSaveState === AutoSaveState.Scheduled) {
		cancelAutoSave();
	}

	if (!saved || uiStore.stateIsDirty || props.isNewWorkflow) {
		autoSaveForPublish.value = true;
		saved = await saveCurrentWorkflow({}, true);
		autoSaveForPublish.value = false;
	}

	return saved;
};

const onPublishButtonClick = async () => {
	// If there are unsaved changes, save the workflow first
	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		const saved = await saveBeforePublish();
		if (!saved) {
			// If save failed, don't open the modal
			return;
		}
	}

	uiStore.openModalWithData({
		name: WORKFLOW_PUBLISH_MODAL_KEY,
		data: {},
	});
};

const publishButtonConfig = computed(() => {
	// Handle permission-denied state first
	if (!hasPublishPermission.value) {
		const defaultConfigForNoPermission = {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: false,
			indicatorClass: '',
			tooltip: isPersonalSpace.value
				? i18n.baseText('workflows.publish.personalSpaceRestricted')
				: i18n.baseText('workflows.publish.permissionDenied'),
			showVersionInfo: false,
		};
		const isWorkflowPublished = !!workflowsStore.workflow.activeVersion;
		if (isWorkflowPublished) {
			return {
				...defaultConfigForNoPermission,
				showIndicator: true,
				showVersionInfo: true,
				indicatorClass: 'published',
			};
		} else {
			return defaultConfigForNoPermission;
		}
	}

	// Handle new workflow state
	if (props.isNewWorkflow) {
		return {
			text: i18n.baseText('workflows.publish'),
			enabled: containsTrigger.value && !workflowsStore.nodesIssuesExist,
			showIndicator: false,
			indicatorClass: '',
			tooltip: !containsTrigger.value
				? i18n.baseText('workflows.publishModal.noTriggerMessage')
				: workflowsStore.nodesIssuesExist
					? i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
							interpolate: { count: workflowsStore.nodesWithIssues.length },
							adjustToNumber: workflowsStore.nodesWithIssues.length,
						})
					: '',
			showVersionInfo: false,
		};
	}

	// Map workflow state to UI configuration
	const configs = {
		'not-published-not-eligible': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: false,
			indicatorClass: '',
			tooltip: !containsTrigger.value
				? i18n.baseText('workflows.publishModal.noTriggerMessage')
				: i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
						interpolate: { count: workflowsStore.nodesWithIssues.length },
						adjustToNumber: workflowsStore.nodesWithIssues.length,
					}),
			showVersionInfo: false,
		},
		'not-published-eligible': {
			text: i18n.baseText('workflows.publish'),
			enabled: true,
			showIndicator: false,
			indicatorClass: '',
			tooltip: '',
			showVersionInfo: false,
		},
		'published-no-changes': {
			text: i18n.baseText('generic.published'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'published',
			tooltip: '',
			showVersionInfo: true,
		},
		'published-with-changes': {
			text: i18n.baseText('workflows.publish'),
			enabled: true,
			showIndicator: true,
			indicatorClass: 'changes',
			tooltip: i18n.baseText('workflows.publishModal.changes'),
			showVersionInfo: false,
		},
		'published-node-issues': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'error',
			tooltip: i18n.baseText(
				'workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title',
				{
					interpolate: { count: workflowsStore.nodesWithIssues.length },
					adjustToNumber: workflowsStore.nodesWithIssues.length,
				},
			),
			showVersionInfo: true,
		},
		'published-invalid-trigger': {
			text: i18n.baseText('workflows.publish'),
			enabled: false,
			showIndicator: true,
			indicatorClass: 'changes',
			tooltip: i18n.baseText('workflows.publishModal.noTriggerMessage'),
			showVersionInfo: true,
		},
	};

	return configs[workflowPublishState.value];
});

const shouldHidePublishButton = computed(() => {
	if (props.isNewWorkflow) return false;
	return props.isArchived || (!hasUpdatePermission.value && !hasPublishPermission.value);
});

const shouldDisablePublishButton = computed(() => {
	return (
		props.isNewWorkflow ||
		collaborationReadOnly.value ||
		!publishButtonConfig.value.enabled ||
		!hasPublishPermission.value
	);
});

const activeVersion = computed(() => workflowsStore.workflow.activeVersion);

const activeVersionName = computed(() => {
	if (!activeVersion.value) {
		return '';
	}
	return activeVersion.value.name ?? generateVersionName(activeVersion.value.versionId);
});

const latestPublishDate = computed(() => {
	const latestPublish = getLastPublishedVersion(activeVersion.value?.workflowPublishHistory ?? []);
	return latestPublish?.createdAt;
});

const enum VERSION_ACTIONS {
	PUBLISH = 'publish',
	NAME_VERSION = 'name-version',
	UNPUBLISH = 'unpublish',
}

const versionMenuActions = computed<Array<ActionDropdownItem<VERSION_ACTIONS>>>(() => {
	const actions: Array<ActionDropdownItem<VERSION_ACTIONS>> = [
		{
			id: VERSION_ACTIONS.PUBLISH,
			label: i18n.baseText('workflows.publish'),
			shortcut: { shiftKey: true, keys: ['P'] },
			disabled: shouldDisablePublishButton.value,
		},
	];

	if (isNamedVersionsEnabled.value) {
		actions.push({
			id: VERSION_ACTIONS.NAME_VERSION,
			label: i18n.baseText('generic.nameVersion'),
			shortcut: { metaKey: true, keys: ['S'] },
			disabled: !hasUpdatePermission.value || !workflowsStore.workflow.versionId,
		});
	}

	actions.push({
		id: VERSION_ACTIONS.UNPUBLISH,
		label: i18n.baseText('workflows.unpublish'),
		disabled: !activeVersion.value || collaborationReadOnly.value || !hasUnpublishPermission.value,
		divided: true,
		shortcut: { metaKey: true, keys: ['U'] },
	});

	return actions;
});

const onNameVersion = async () => {
	// If there are unsaved changes, save the workflow first
	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		const saved = await saveBeforePublish();
		if (!saved) {
			return;
		}
	}

	const versionId = workflowsStore.workflow.versionId;
	const versionData = workflowsStore.versionData;

	const nameVersionEventBus = createEventBus<WorkflowVersionFormModalEventBusEvents>();
	const modalData = ref({
		versionId,
		versionName: versionData?.name ?? undefined,
		description: versionData?.description ?? undefined,
		modalTitle: i18n.baseText('workflowHistory.nameVersionModal.title'),
		submitButtonLabel: i18n.baseText('workflowHistory.nameVersionModal.confirmButton'),
		submitting: false,
		eventBus: nameVersionEventBus,
	});

	nameVersionEventBus.once(
		'submit',
		async (submitData: { versionId: string; name: string; description: string }) => {
			modalData.value.submitting = true;

			try {
				await workflowHistoryStore.updateWorkflowHistoryVersion(props.id, versionId, {
					name: submitData.name,
					description: submitData.description,
				});

				workflowsStore.setWorkflowVersionData({
					versionId,
					name: submitData.name,
					description: submitData.description,
				});

				toast.showMessage({
					title: i18n.baseText('workflowHistory.action.nameVersion.success.title'),
					type: 'success',
				});

				uiStore.closeModal(WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY);
			} catch (error) {
				toast.showError(error, i18n.baseText('workflowHistory.action.nameVersion.error.title'));
			} finally {
				modalData.value.submitting = false;
			}
		},
	);

	uiStore.openModalWithData({
		name: WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
		data: modalData.value,
	});
};

const onUnpublish = () => {
	if (!activeVersion.value) {
		toast.showMessage({
			title: i18n.baseText('workflowHistory.action.unpublish.notAvailable'),
			type: 'warning',
		});
		return;
	}

	const unpublishEventBus = createEventBus();
	unpublishEventBus.once('unpublish', async () => {
		const success = await workflowActivate.unpublishWorkflowFromHistory(props.id);
		uiStore.closeModal(WORKFLOW_HISTORY_VERSION_UNPUBLISH);
		if (success) {
			toast.showMessage({
				title: i18n.baseText('workflowHistory.action.unpublish.success.title'),
				type: 'success',
			});
		}
	});

	uiStore.openModalWithData({
		name: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
		data: {
			versionName: activeVersion.value.name,
			eventBus: unpublishEventBus,
		},
	});
};

const onDropdownMenuSelect = async (action: VERSION_ACTIONS) => {
	switch (action) {
		case VERSION_ACTIONS.PUBLISH:
			await onPublishButtonClick();
			break;
		case VERSION_ACTIONS.NAME_VERSION:
			await onNameVersion();
			break;
		case VERSION_ACTIONS.UNPUBLISH:
			onUnpublish();
			break;
		default:
			break;
	}
};

useKeybindings({
	shift_p: {
		disabled: () => shouldDisablePublishButton.value,
		run: async () => {
			await onPublishButtonClick();
		},
	},
	'ctrl+s': {
		disabled: () =>
			!isNamedVersionsEnabled.value ||
			!hasUpdatePermission.value ||
			!workflowsStore.workflow.versionId,
		run: async () => {
			await onNameVersion();
		},
	},
	'ctrl+u': {
		disabled: () =>
			!activeVersion.value || !hasPublishPermission.value || collaborationReadOnly.value,
		run: onUnpublish,
	},
});

onMounted(() => {
	nodeViewEventBus.on('publishWorkflow', onPublishButtonClick);
	nodeViewEventBus.on('unpublishWorkflow', onUnpublish);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('publishWorkflow', onPublishButtonClick);
	nodeViewEventBus.off('unpublishWorkflow', onUnpublish);
});

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<CollaborationPane v-if="!isNewWorkflow" />
		<div v-if="!shouldHidePublishButton" :class="$style.publishButtonWrapper">
			<div :class="$style.buttonGroup">
				<N8nTooltip
					:disabled="
						workflowPublishState === 'not-published-eligible' && props.workflowPermissions.publish
					"
					:show-after="300"
					:offset="15"
				>
					<template #content>
						<div>
							<template v-if="publishButtonConfig.tooltip">
								{{ publishButtonConfig.tooltip }} <br />
							</template>
							<template v-if="activeVersion && publishButtonConfig.showVersionInfo">
								<span data-test-id="workflow-active-version-info">{{ activeVersionName }}</span
								><br />{{ i18n.baseText('workflowHistory.item.active') }}
								<TimeAgo v-if="latestPublishDate" :date="latestPublishDate" />
							</template>
						</div>
					</template>
					<N8nButton
						:class="$style.groupButtonLeft"
						:loading="autoSaveForPublish"
						:disabled="!publishButtonConfig.enabled || shouldDisablePublishButton"
						variant="subtle"
						data-test-id="workflow-open-publish-modal-button"
						@click="onPublishButtonClick"
					>
						<div :class="[$style.flex]">
							<span
								v-if="publishButtonConfig.showIndicator"
								data-test-id="workflow-active-version-indicator"
								:class="{
									[$style.indicatorDot]: true,
									[$style.indicatorPublished]: publishButtonConfig.indicatorClass === 'published',
									[$style.indicatorChanges]: publishButtonConfig.indicatorClass === 'changes',
									[$style.indicatorIssues]: publishButtonConfig.indicatorClass === 'error',
								}"
							/>
							<span
								:class="[
									workflowPublishState === 'published-no-changes' && $style.indicatorPublishedText,
								]"
							>
								{{ publishButtonConfig.text }}
							</span>
						</div>
					</N8nButton>
				</N8nTooltip>
				<N8nActionDropdown
					:items="versionMenuActions"
					placement="bottom-end"
					data-test-id="version-menu"
					@select="onDropdownMenuSelect"
				>
					<template #activator>
						<N8nIconButton
							:class="$style.groupButtonRight"
							variant="subtle"
							icon="chevron-down"
							data-test-id="version-menu-button"
						/>
					</template>
				</N8nActionDropdown>
			</div>
		</div>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
		<ActionsDropdownMenu
			:id="id"
			ref="actionsMenu"
			:workflow-permissions="workflowPermissions"
			:is-new-workflow="isNewWorkflow"
			:is-archived="isArchived"
			:name="name"
			:tags="tags"
			:current-folder="currentFolder"
			:meta="meta"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: contents;
}

.activeVersionIndicator {
	display: inline-flex;
	align-items: center;

	.icon:focus {
		outline: none;
	}
}

.publishButtonWrapper {
	position: relative;
	display: inline-flex;
	margin-right: var(--spacing--2xs);
}

.buttonGroup {
	display: inline-flex;
}

.groupButtonLeft,
.groupButtonLeft:disabled,
.groupButtonLeft:hover:disabled {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right-color: transparent;
}

.groupButtonLeft:hover {
	border-right-color: inherit;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.buttonGroup:has(.groupButtonLeft:not(:disabled):hover) .groupButtonRight {
	border-left-color: transparent;
}

.indicatorDot {
	height: var(--spacing--2xs);
	width: var(--spacing--2xs);
	border-radius: 50%;
	display: inline-block;
	margin-right: var(--spacing--2xs);
}

.indicatorPublished {
	background-color: var(--color--mint-600);
}

.indicatorPublishedText {
	color: var(--color--text--tint-1);
}

.indicatorChanges {
	background-color: var(--color--yellow-500);
}

.indicatorIssues {
	background-color: var(--color--red-600);
}

.flex {
	display: flex;
	align-items: center;
}
</style>
