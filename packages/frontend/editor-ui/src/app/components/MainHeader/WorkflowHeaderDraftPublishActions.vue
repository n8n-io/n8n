<script lang="ts" setup>
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { WORKFLOW_PUBLISH_MODAL_KEY, AutoSaveState } from '@/app/constants';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRouter } from 'vue-router';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import {
	getLastPublishedVersion,
	generateVersionName,
} from '@/features/workflows/workflowHistory/utils';
import { nodeViewEventBus } from '@/app/event-bus';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	isNewWorkflow: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsDropdownMenu>>('actionsMenu');

const readOnlyForPublish = computed(() => {
	if (props.isNewWorkflow) return props.readOnly;
	return (
		props.readOnly ||
		props.isArchived ||
		(!props.workflowPermissions.update && !props.workflowPermissions.publish)
	);
});

const locale = useI18n();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const router = useRouter();

const autosaveStore = useWorkflowAutosaveStore();
const { saveCurrentWorkflow, cancelAutoSave } = useWorkflowSaving({ router });

const autoSaveForPublish = ref(false);

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving && !autoSaveForPublish.value;
});

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

/**
 * Cancel autosave if scheduled or wait for it to finish if in progress
 * Save immediately if autosave idle or cancelled
 */
const saveBeforePublish = async () => {
	let saved = true;
	if (autosaveStore.autoSaveState === AutoSaveState.InProgress && autosaveStore.pendingAutoSave) {
		autoSaveForPublish.value = true;
		try {
			await autosaveStore.pendingAutoSave;
		} catch {
			saved = false;
		} finally {
			autoSaveForPublish.value = false;
		}
	} else if (autosaveStore.autoSaveState === AutoSaveState.Scheduled) {
		cancelAutoSave();
	}

	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		autoSaveForPublish.value = true;
		saved = await saveCurrentWorkflow({}, true);
		autoSaveForPublish.value = false;
	}

	return saved;
};

const onPublishButtonClick = async () => {
	// Save the workflow first
	const saved = await saveBeforePublish();
	if (!saved) {
		// If save failed, don't open the modal
		return;
	}

	uiStore.openModalWithData({
		name: WORKFLOW_PUBLISH_MODAL_KEY,
		data: {},
	});
};

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const publishButtonEnabled = computed(() => {
	if (!props.workflowPermissions.publish) {
		return false;
	}

	if (!containsTrigger.value) {
		return false;
	}

	if (workflowsStore.nodesIssuesExist) {
		return false;
	}

	return (
		(workflowsStore.workflow.versionId &&
			workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId) ||
		uiStore.stateIsDirty
	);
});

const publishTooltipText = computed(() => {
	if (!props.workflowPermissions.publish) {
		return i18n.baseText('workflows.publish.permissionDenied');
	}

	const wfHasAnyChanges =
		workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId;

	if (!containsTrigger.value) {
		return i18n.baseText('workflows.publishModal.noTriggerMessage');
	}

	if (workflowsStore.nodesIssuesExist) {
		return i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
			interpolate: { count: workflowsStore.nodesWithIssues.length },
			adjustToNumber: workflowsStore.nodesWithIssues.length,
		});
	}

	if (!wfHasAnyChanges && !uiStore.stateIsDirty) {
		return i18n.baseText('workflows.publishModal.noChanges');
	}

	return '';
});

const activeVersion = computed(() => workflowsStore.workflow.activeVersion);

const activeVersionName = computed(() => {
	if (!activeVersion.value) {
		return '';
	}
	return activeVersion.value.name || generateVersionName(activeVersion.value.versionId);
});

const latestPublishDate = computed(() => {
	const latestPublish = getLastPublishedVersion(activeVersion.value?.workflowPublishHistory ?? []);
	return latestPublish?.createdAt;
});

onMounted(() => {
	nodeViewEventBus.on('publishWorkflow', onPublishButtonClick);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('publishWorkflow', onPublishButtonClick);
});

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<CollaborationPane v-if="!isNewWorkflow" />
		<div
			v-if="activeVersion"
			:class="$style.activeVersionIndicator"
			data-test-id="workflow-active-version-indicator"
		>
			<N8nTooltip>
				<template #content>
					{{ activeVersionName }}<br />{{ i18n.baseText('workflowHistory.item.active') }}
					<TimeAgo v-if="latestPublishDate" :date="latestPublishDate" />
				</template>
				<N8nIcon icon="circle-check" color="success" size="xlarge" :class="$style.icon" />
			</N8nTooltip>
		</div>
		<div v-if="!readOnlyForPublish" :class="$style.publishButtonWrapper">
			<N8nTooltip :disabled="!publishTooltipText">
				<template #content>
					{{ publishTooltipText }}
				</template>
				<N8nButton
					:loading="autoSaveForPublish"
					:disabled="!publishButtonEnabled || isWorkflowSaving"
					type="secondary"
					data-test-id="workflow-open-publish-modal-button"
					@click="onPublishButtonClick"
				>
					{{ locale.baseText('workflows.publish') }}
				</N8nButton>
			</N8nTooltip>
		</div>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
		<ActionsDropdownMenu
			:id="id"
			ref="actionsMenu"
			:workflow-permissions="workflowPermissions"
			:is-new-workflow="isNewWorkflow"
			:read-only="props.readOnly"
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
	display: inline-block;
}
</style>
