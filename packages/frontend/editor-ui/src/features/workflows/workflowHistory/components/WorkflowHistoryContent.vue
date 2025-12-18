<script setup lang="ts">
import { computed, ref } from 'vue';
import type { IWorkflowDb, UserAction } from '@/Interface';
import type { WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import WorkflowPreview from '@/app/components/WorkflowPreview.vue';
import WorkflowHistoryActions from '@/features/workflows/workflowHistory/components/WorkflowHistoryActions.vue';
import { useI18n } from '@n8n/i18n';
import type { IUser } from 'n8n-workflow';

import { formatTimestamp, generateVersionName } from '@/features/workflows/workflowHistory/utils';
import type { WorkflowHistoryAction } from '@/features/workflows/workflowHistory/types';

const i18n = useI18n();

const focusPanelState = ref<{ width: number; active: boolean }>({ width: 0, active: false });

const onFocusPanelStateChanged = (state: { width: number; active: boolean }) => {
	focusPanelState.value = state;
};

const props = defineProps<{
	workflow: IWorkflowDb | null;
	workflowVersion: WorkflowVersion | null;
	actions: Array<UserAction<IUser>>;
	isVersionActive?: boolean;
	isListLoading?: boolean;
	isFirstItemShown?: boolean;
}>();

const emit = defineEmits<{
	action: [value: WorkflowHistoryAction];
}>();

const workflowVersionPreview = computed<IWorkflowDb | undefined>(() => {
	if (!props.workflowVersion || !props.workflow) {
		return;
	}
	const { pinData, ...workflow } = props.workflow;
	return {
		...workflow,
		nodes: props.workflowVersion.nodes,
		connections: props.workflowVersion.connections,
	};
});

const formattedCreatedAt = computed<string>(() => {
	if (!props.workflowVersion) {
		return '';
	}
	const { date, time } = formatTimestamp(props.workflowVersion.createdAt);
	return i18n.baseText('workflowHistory.item.createdAt', { interpolate: { date, time } });
});

const versionNameDisplay = computed(() => {
	if (props.workflowVersion?.name) {
		return props.workflowVersion.name;
	}
	return props.isVersionActive && props.workflowVersion
		? generateVersionName(props.workflowVersion.versionId)
		: formattedCreatedAt.value;
});

const description = computed(() => props.workflowVersion?.description ?? '');

const onAction = (value: WorkflowHistoryAction) => {
	emit('action', value);
};
</script>

<template>
	<div :class="$style.content">
		<WorkflowPreview
			v-if="props.workflowVersion"
			:workflow="workflowVersionPreview"
			:loading="props.isListLoading"
			loader-type="spinner"
			@focus-panel-state-changed="onFocusPanelStateChanged"
		/>
		<WorkflowHistoryActions
			v-if="props.workflowVersion"
			:workflow-version="props.workflowVersion"
			:actions="props.actions"
			:is-version-active="props.isVersionActive"
			:is-first-item-shown="props.isFirstItemShown"
			:formatted-created-at="formattedCreatedAt"
			:version-name-display="versionNameDisplay"
			:description="description"
			:focus-panel-width="focusPanelState.width"
			:is-focus-panel-active="focusPanelState.active"
			@action="onAction"
		/>
	</div>
</template>

<style module lang="scss">
.content {
	position: absolute;
	display: block;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
}
</style>
