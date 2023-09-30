<script setup lang="ts">
import { saveAs } from 'file-saver';
import { onBeforeMount, onUnmounted, ref, watchEffect, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables';
import type {
	WorkflowHistoryActionTypes,
	WorkflowVersionId,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import WorkflowHistoryContent from '@/components/WorkflowHistory/WorkflowHistoryContent.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useUIStore } from '@/stores/ui.store';

type WorkflowHistoryActionRecord = {
	[K in Uppercase<WorkflowHistoryActionTypes[number]>]: Lowercase<K>;
};

const workflowHistoryActionTypes: WorkflowHistoryActionTypes = [
	'restore',
	'clone',
	'open',
	'download',
];
const WORKFLOW_HISTORY_ACTIONS = workflowHistoryActionTypes.reduce(
	(record, key) => ({ ...record, [key.toUpperCase()]: key }),
	{} as WorkflowHistoryActionRecord,
);

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();
const uiStore = useUIStore();

const listLoading = ref(true);
const requestNumberOfItems = ref(20);
const lastReceivedItemsLength = ref(0);
const editorRoute = computed(() => ({
	name: VIEWS.WORKFLOW,
	params: {
		name: route.params.workflowId,
	},
}));

const loadMore = async (queryParams: WorkflowHistoryRequestParams) => {
	const history = await workflowHistoryStore.getWorkflowHistory(
		route.params.workflowId,
		queryParams,
	);
	lastReceivedItemsLength.value = history.length;
	workflowHistoryStore.addWorkflowHistory(history);
};

onBeforeMount(async () => {
	await loadMore({ take: requestNumberOfItems.value });
	listLoading.value = false;

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

onUnmounted(() => {
	workflowHistoryStore.reset();
});

const openInNewTab = (id: WorkflowVersionId) => {
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: route.params.workflowId,
			versionId: id,
		},
	});
	window.open(href, '_blank');
};

const downloadVersion = async (id: WorkflowVersionId) => {
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
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
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

const onPreview = async ({ event, id }: { event: MouseEvent; id: WorkflowVersionId }) => {
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

const onUpgrade = () => {
	uiStore.goToUpgrade('workflow-history', 'upgrade-workflow-history');
};

watchEffect(async () => {
	if (route.params.versionId) {
		const workflowVersion = await workflowHistoryStore.getWorkflowVersion(
			route.params.workflowId,
			route.params.versionId,
		);
		workflowHistoryStore.setActiveWorkflowVersion(workflowVersion);
	}
});
</script>
<template>
	<div :class="$style.view">
		<n8n-heading :class="$style.header" tag="h2" size="medium" bold>
			{{ workflowHistoryStore.activeWorkflowVersion?.workflow?.name }}
		</n8n-heading>
		<div :class="$style.corner">
			<n8n-heading tag="h2" size="medium" bold>
				{{ i18n.baseText('workflowHistory.title') }}
			</n8n-heading>
			<router-link :to="editorRoute">
				<n8n-button type="tertiary" icon="times" size="small" text square />
			</router-link>
		</div>
		<workflow-history-content
			:class="$style.contentComponent"
			:workflow-version="workflowHistoryStore.activeWorkflowVersion"
		/>
		<Suspense>
			<workflow-history-list
				:class="$style.listComponent"
				:items="workflowHistoryStore.workflowHistory"
				:lastReceivedItemsLength="lastReceivedItemsLength"
				:activeItem="workflowHistoryStore.activeWorkflowVersion"
				:actionTypes="workflowHistoryActionTypes"
				:requestNumberOfItems="requestNumberOfItems"
				:shouldUpgrade="workflowHistoryStore.shouldUpgrade"
				:maxRetentionPeriod="workflowHistoryStore.maxRetentionPeriod"
				:listLoading="listLoading"
				@action="onAction"
				@preview="onPreview"
				@load-more="loadMore"
				@upgrade="onUpgrade"
			/>
		</Suspense>
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
