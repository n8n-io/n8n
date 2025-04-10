<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import GlobalExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useInsightsStore } from '@/features/insights/insights.store';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { storeToRefs } from 'pinia';
import type { ExecutionFilterType } from '@/Interface';
import { useOverview } from '@/composables/useOverview';

const route = useRoute();
const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();
const insightsStore = useInsightsStore();
const documentTitle = useDocumentTitle();
const toast = useToast();
const overview = useOverview();

const { executionsCount, executionsCountEstimated, filters, allExecutions } =
	storeToRefs(executionsStore);

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
		@execution:stop="onExecutionStop"
		@update:filters="onUpdateFilters"
	>
		<ProjectHeader>
			<InsightsSummary
				v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
				:loading="insightsStore.summary.isLoading"
				:summary="insightsStore.summary.state"
			/>
		</ProjectHeader>
	</GlobalExecutionsList>
</template>
