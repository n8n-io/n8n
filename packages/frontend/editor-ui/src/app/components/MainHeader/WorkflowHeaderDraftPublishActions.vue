<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import ActionsMenu from '@/components/MainHeader/ActionsMenu.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import type { IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, useTemplateRef } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import { EnterpriseEditionFeature, WORKFLOW_PUBLISH_MODAL_KEY } from '@/constants';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/stores/ui.store';
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
const locale = useI18n();
const uiStore = useUIStore();

const isWorkflowHistoryFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

const goToWorkflowHistoryUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('workflow-history', 'upgrade-workflow-history');
};

const onPublishButtonClick = () => {
	// TODO: uncomment once the save doesn't automatically change the active version
	// emit('workflow:saved');
	uiStore.openModalWithData({
		name: WORKFLOW_PUBLISH_MODAL_KEY,
		data: {},
	});
};

defineExpose({
	importFileRef,
});
</script>

<template>
	<!-- TODO: add top right indicator on the button when the wf has changes -->
	<N8nButton type="tertiary" @click="onPublishButtonClick">
		{{ locale.baseText('workflows.publish') }}
	</N8nButton>
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
