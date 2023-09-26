<script setup lang="ts">
import { saveAs } from 'file-saver';
import { onBeforeMount, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables';
import type { TupleToUnion } from '@/utils/typeHelpers';
import type { WorkflowHistoryActionTypes, WorkflowHistory } from '@/types/workflowHistory';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import WorkflowHistoryContent from '@/components/WorkflowHistory/WorkflowHistoryContent.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';

type WorkflowHistoryActionRecord = {
	[K in Uppercase<TupleToUnion<WorkflowHistoryActionTypes>>]: Lowercase<K>;
};

const workflowHistoryActionTypes: WorkflowHistoryActionTypes = [
	'restore',
	'clone',
	'open',
	'download',
];
const WORKFLOW_HISTORY_ACTIONS: WorkflowHistoryActionRecord = workflowHistoryActionTypes.reduce(
	(record, key) => ({ ...record, [key.toUpperCase()]: key }),
	{} as WorkflowHistoryActionRecord,
);

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();

const takeItemsAtOnce = ref(20);

onBeforeMount(async () => {
	const history = await workflowHistoryStore.getWorkflowHistory(route.params.workflowId, {
		take: takeItemsAtOnce.value,
	});
	workflowHistoryStore.addWorkflowHistory(history);

	if (!route.params.versionId) {
		await router.replace({
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: route.params.workflowId,
				versionId: workflowHistoryStore.workflowHistory[0].versionId,
			},
		});
	}
});

const openInNewTab = (id: WorkflowHistory['versionId']) => {
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: route.params.workflowId,
			versionId: id,
		},
	});
	window.open(href, '_blank');
};

const downloadVersion = async (id: WorkflowHistory['versionId']) => {
	const workflowVersion = await workflowHistoryStore.getWorkflowVersion(
		route.params.workflowId,
		id,
	);
	if (workflowVersion?.workflow) {
		const { workflow } = workflowVersion;
		const blob = new Blob([JSON.stringify(workflow, null, 2)], {
			type: 'application/json;charset=utf-8',
		});
		saveAs(blob, workflow.name.replace(/[^a-z0-9]/gi, '_') + '.json');
	}
};

const onAction = async ({
	action,
	id,
}: {
	action: TupleToUnion<WorkflowHistoryActionTypes>;
	id: WorkflowHistory['versionId'];
}) => {
	switch (action) {
		case WORKFLOW_HISTORY_ACTIONS.OPEN:
			openInNewTab(id);
			break;
		case WORKFLOW_HISTORY_ACTIONS.DOWNLOAD:
			await downloadVersion(id);
			break;
	}
};

const onPreview = async ({ event, id }: { event: Event; id: WorkflowHistory['versionId'] }) => {
	if (event.metaKey || event.ctrlKey) {
		openInNewTab(id);
	} else {
		await router.push({
			name: VIEWS.WORKFLOW_HISTORY,
			params: {
				workflowId: route.params.workflowId,
				versionId: id,
			},
		});
	}
};

const loadMore = async ({ take }: { take: number }) => {
	const history = await workflowHistoryStore.getWorkflowHistory(route.params.workflowId, { take });
	workflowHistoryStore.addWorkflowHistory(history);
};

watchEffect(async () => {
	if (route.params.versionId) {
		const workflowVersion = await workflowHistoryStore.getWorkflowVersion(
			route.params.workflowId,
			route.params.versionId,
		);
		workflowHistoryStore.setWorkflowVersion(workflowVersion);
	}
});
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
			:active-item="workflowHistoryStore.workflowVersion"
			:action-types="workflowHistoryActionTypes"
			:watch-nth-item-from-end="5"
			:take-items-at-once="takeItemsAtOnce"
			@action="onAction"
			@preview="onPreview"
			@load-more="loadMore"
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
