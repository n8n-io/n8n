<script lang="ts" setup>
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { N8nPublishIndicator } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useRouter } from 'vue-router';
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

defineEmits<{
	'workflow:saved': [];
}>();

const locale = useI18n();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const router = useRouter();
const { saveCurrentWorkflow } = useWorkflowSaving({ router });
// We're dropping the save button soon with the autosave so this will also be dropped
const autoSaveForPublish = ref(false);

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving && !autoSaveForPublish.value;
});

const onPublishButtonClick = async () => {
	// If there are unsaved changes, save the workflow first
	if (uiStore.stateIsDirty || props.isNewWorkflow) {
		autoSaveForPublish.value = true;
		const saved = await saveCurrentWorkflow({}, true);
		autoSaveForPublish.value = false;
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

const onPublishAction = async (
	action: 'publish' | 'quick-publish' | 'save-draft' | 'unpublish',
) => {
	switch (action) {
		case 'publish':
			await onPublishButtonClick();
			break;
		case 'quick-publish':
			// TODO: Implement quick publish functionality
			console.log('Quick publish action');
			break;
		case 'save-draft':
			// Save the current workflow
			await saveCurrentWorkflow({}, true);
			break;
		case 'unpublish':
			// TODO: Implement unpublish functionality
			console.log('Unpublish action');
			break;
	}
};

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const isWorkflowSaved = computed(() => {
	return !uiStore.stateIsDirty && !props.isNewWorkflow;
});

const showPublishIndicator = computed(() => {
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

defineExpose({});

const publishStatus = computed<'published' | 'unpublished' | 'draft' | 'unpublishedDraft'>(() => {
	if (workflowsStore.workflow.activeVersion) {
		if (showPublishIndicator.value) {
			return 'unpublished';
		}
		return 'published';
	}

	if (showPublishIndicator.value) {
		return 'unpublishedDraft';
	}
	return 'draft';
});
</script>

<template>
	<div :class="$style.container">
		<CollaborationPane v-if="!isNewWorkflow" />
		<div
			v-if="!isArchived && workflowPermissions.update"
			:class="$style.activeVersionIndicator"
			data-test-id="workflow-active-version-indicator"
		>
			<N8nPublishIndicator
				:status="publishStatus"
				variant="actions"
				@click="onPublishButtonClick"
				@action="onPublishAction"
			/>
		</div>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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
