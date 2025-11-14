<script lang="ts" setup>
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
import { useWorkflowsStore } from '@/stores/workflows.store';
import SaveButton from '@/components/SaveButton.vue';

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
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();

const isWorkflowHistoryFeatureEnabled = computed(() => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowHistory];
});

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
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

const hasWorkflowChanges = computed(
	() => workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId,
);

defineExpose({
	importFileRef,
});
</script>

<template>
	<div :class="$style.container">
		<SaveButton
			type="primary"
			:saved="!uiStore.stateIsDirty && !isNewWorkflow"
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
		<div :class="$style.publishButtonWrapper">
			<N8nButton type="secondary" @click="onPublishButtonClick">
				{{ locale.baseText('workflows.publish') }}
			</N8nButton>
			<span v-if="hasWorkflowChanges" :class="$style.publishButtonIndicator"></span>
		</div>
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
	</div>
</template>

<style lang="scss" module>
.container {
	display: contents;
}

.publish-button-wrapper {
	position: relative;
	display: inline-block;
}

.publish-button-indicator {
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
