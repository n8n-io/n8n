<script lang="ts" setup>
import type { ExecutionFilterType } from '@/Interface';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import GlobalExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useProjectPages } from '@/composables/useProjectPages';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { storeToRefs } from 'pinia';
import { onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();
const insightsStore = useInsightsStore();
const documentTitle = useDocumentTitle();
const toast = useToast();
const overview = useProjectPages();

const {
	executionsCount,
	executionsCountEstimated,
	concurrentExecutionsCount,
	filters,
	allExecutions,
} = storeToRefs(executionsStore);

onBeforeMount(async () => {
	await loadWorkflows();

	void externalHooks.run('executionsList.openDialog');
	telemetry.track('User opened Executions log', {
		workflow_id: workflowsStore.workflowId,
	});
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('executionsList.workflowExecutions'));
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);

	await executionsStore.initialize();
});

onBeforeUnmount(() => {
	executionsStore.reset();
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});

async function loadWorkflows() {
	try {
		await workflowsStore.fetchAllWorkflows(route.params?.projectId as string | undefined);
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.loadWorkflows.title'));
	}
}

function onDocumentVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		executionsStore.stopAutoRefreshInterval();
	} else {
		void executionsStore.startAutoRefreshInterval();
	}
}

async function onRefreshData() {
	try {
		await executionsStore.fetchExecutions();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
	}
}

async function onUpdateFilters(newFilters: ExecutionFilterType) {
	executionsStore.reset();
	executionsStore.setFilters(newFilters);
	await executionsStore.initialize();
}

async function onExecutionStop() {
	await onRefreshData();
}
</script>
<template>
	<GlobalExecutionsList
		:executions="allExecutions"
		:filters="filters"
		:total="executionsCount"
		:estimated-total="executionsCountEstimated"
		:concurrent-total="concurrentExecutionsCount"
		@execution:stop="onExecutionStop"
		@update:filters="onUpdateFilters"
	>
		<ProjectHeader>
			<InsightsSummary
				v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
				:loading="insightsStore.weeklySummary.isLoading"
				:summary="insightsStore.weeklySummary.state"
				time-range="week"
			/>
		</ProjectHeader>
	</GlobalExecutionsList>
</template>
