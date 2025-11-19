<script lang="ts" setup>
import ActionsMenu from '@/app/components/MainHeader/ActionsMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, useTemplateRef } from 'vue';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/app/constants';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import SaveButton from '@/app/components/SaveButton.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';

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

const emit = defineEmits<{
	'workflow:saved': [];
}>();

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsMenu>>('actionsMenu');
const locale = useI18n();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
});

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

const onPublishButtonClick = () => {
	// TODO: uncomment once the save doesn't automatically change the active version
	// emit('workflow:saved');
	uiStore.openModalWithData({
		name: WORKFLOW_PUBLISH_MODAL_KEY,
		data: {},
	});
};

const isWorkflowSaved = computed(() => {
	return !uiStore.stateIsDirty && !props.isNewWorkflow;
});

const workflowHasChanges = computed(() => {
	return (
		(workflowsStore.workflow.versionId &&
			workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId) ||
		!isWorkflowSaved.value
	);
});

const activeVersion = computed(() => workflowsStore.workflow.activeVersion);

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<SaveButton
			type="primary"
			:saved="isWorkflowSaved"
			:disabled="
				isWorkflowSaving ||
				readOnly ||
				isArchived ||
				(!isNewWorkflow && !workflowPermissions.update)
			"
			:is-saving="isWorkflowSaving"
			:with-shortcut="!readOnly && !isArchived && workflowPermissions.update"
			:shortcut-tooltip="i18n.baseText('saveWorkflowButton.hint')"
			data-test-id="workflow-save-button"
			@click="$emit('workflow:saved')"
		/>
		<div v-if="activeVersion" :class="$style.activeVersionIndicator">
			<N8nTooltip>
				<template #content>
					{{ activeVersion.versionId }}, {{ i18n.baseText('workflowHistory.item.active') }},
					<TimeAgo :date="activeVersion.createdAt" />
				</template>
				<N8nIcon icon="circle-check" color="success" size="xlarge" :class="$style.icon" />
			</N8nTooltip>
		</div>
		<div :class="$style.publishButtonWrapper">
			<N8nButton type="secondary" @click="onPublishButtonClick">
				{{ locale.baseText('workflows.publish') }}
			</N8nButton>
			<span v-if="workflowHasChanges" :class="$style.publishButtonIndicator"></span>
		</div>
		<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
		<ActionsMenu
			:id="id"
			ref="actionsMenu"
			:workflow-permissions="workflowPermissions"
			:is-new-workflow="isNewWorkflow"
			:read-only="readOnly"
			:is-archived="isArchived"
			:name="name"
			:tags="tags"
			:current-folder="currentFolder"
			:meta="meta"
			@workflow:saved="$emit('workflow:saved')"
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

.publishButtonIndicator {
	position: absolute;
	top: -2px;
	right: -2px;
	width: 7px;
	height: 7px;
	background-color: var(--color--primary);
	border-radius: 50%;
	box-shadow: 0 0 0 2px var(--color--background);
}
</style>
