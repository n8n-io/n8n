<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import ActionsMenu from '@/components/MainHeader/ActionsMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, useTemplateRef } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import { EnterpriseEditionFeature } from '@/constants';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

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

const settingsStore = useSettingsStore();
const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsMenu>>('actionsMenu');
const pageRedirectionHelper = usePageRedirectionHelper();

const isWorkflowHistoryFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

function goToWorkflowHistoryUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow-history', 'upgrade-workflow-history');
}

defineExpose({
	importFileRef,
});
</script>

<template>
	<WorkflowHistoryButton
		:workflow-id="props.id"
		:is-feature-enabled="isWorkflowHistoryFeatureEnabled"
		:is-new-workflow="isNewWorkflow"
		@upgrade="goToWorkflowHistoryUpgrade"
	/>
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
</template>
