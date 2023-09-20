<script setup lang="ts">
import { onBeforeMount, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables';
import type { TupleToUnion } from '@/utils/typeHelpers';
import type { WorkflowHistoryActionTypes, WorkflowHistory } from '@/types/workflowHistory';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import WorkflowHistoryContent from '@/components/WorkflowHistory/WorkflowHistoryContent.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';

const workflowHistoryActionTypes: WorkflowHistoryActionTypes = [
	'restore',
	'clone',
	'open',
	'download',
];
const workflowHistoryActionsRecord = workflowHistoryActionTypes.map((value) => ({
	[value.toUpperCase()]: value,
}));

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();

onBeforeMount(async () => {
	await workflowHistoryStore.getWorkflowHistory(route.params.workflowId);

	if (!route.params.versionId) {
		await router.replace({
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: route.params.workflowId,
				versionId: workflowHistoryStore.workflowHistory[0].id,
			},
		});
	}

	if (uiStore.stateIsDirty) {
		workflowHistoryStore.addUnsavedItem({
			id: 'unsaved',
			title: i18n.baseText('workflowHistory.item.unsaved.title'),
			authors: usersStore.currentUser?.fullName ?? '',
		});
	}
});

watchEffect(async () => {
	if (route.params.versionId) {
		await workflowHistoryStore.getWorkflowVersion(route.params.workflowId, route.params.versionId);
	}
});

const onAction = ({
	action,
	id,
}: {
	action: TupleToUnion<WorkflowHistoryActionTypes>;
	id: WorkflowHistory['id'];
}) => {
	console.log('action', { action, id });
};

const onPreview = async ({ id }: { id: WorkflowHistory['id'] }) => {
	await router.push({
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: route.params.workflowId,
			versionId: id,
		},
	});
};
</script>
<template>
	<div :class="$style.view">
		<n8n-heading :class="$style.header" tag="h2" size="medium" bold>
			{{ workflowHistoryStore.workflowVersion?.workflow.name }}
		</n8n-heading>
		<div :class="$style.corner">
			<n8n-heading tag="h2" size="medium" bold>{{
				i18n.baseText('workflowHistory.title')
			}}</n8n-heading>
			<n8n-button type="tertiary" icon="times" size="small" text square />
		</div>
		<workflow-history-content
			:class="$style.contentComponent"
			:workflow-version="workflowHistoryStore.workflowVersion"
		/>
		<workflow-history-list
			:class="$style.listComponent"
			:items="workflowHistoryStore.workflowHistory"
			:action-types="workflowHistoryActionTypes"
			:active-item-id="route.params.versionId"
			@action="onAction"
			@preview="onPreview"
		/>
	</div>
</template>
<style module lang="scss">
.view {
	display: grid;
	width: 100%;
	grid-template-areas: 'header corner' 'content list';
	grid-template-columns: auto 330px;
	grid-template-rows: 65px auto;
	background-color: var(--color-background-xlight);
}

.header {
	grid-area: header;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing-l);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.corner {
	grid-area: corner;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing-3xs) 0 var(--spacing-s);
	background-color: var(--color-background-lighter);
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-left: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
}

.contentComponent {
	grid-area: content;
}

.listComponent {
	grid-area: list;
	grid-area: list;
}
</style>
