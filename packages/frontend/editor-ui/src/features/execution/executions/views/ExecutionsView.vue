<script lang="ts" setup>
import type { ExecutionFilterType } from '../executions.types';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import GlobalExecutionsList from '../components/global/GlobalExecutionsList.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useExecutionsStore } from '../executions.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { storeToRefs } from 'pinia';
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import ResourcesListLoadingState from '@/app/components/layouts/ResourcesListLoadingState.vue';
import { useWorkflowsEmptyState } from '@/features/workflows/composables/useWorkflowsEmptyState';
import { VIEWS } from '@/app/constants';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsListStore = useWorkflowsListStore();
const executionsStore = useExecutionsStore();
const insightsStore = useInsightsStore();
const documentTitle = useDocumentTitle();
const toast = useToast();
const workflowDocumentStore = injectWorkflowDocumentStore();

const overview = useProjectPages();
const { readOnlyEnv, projectPermissions } = useWorkflowsEmptyState();

const { executionsCount, concurrentExecutionsCount, filters, allExecutions } =
	storeToRefs(executionsStore);

// The settled latch unblocks the skeleton on fetch failure; the store flag keeps revisits skeleton-free.
const workflowsFetchSettled = ref(false);

const projectId = computed(() => {
	const value = route.params?.projectId;
	return typeof value === 'string' ? value : undefined;
});

const workflowCount = computed(() => workflowsListStore.allWorkflows.length);
const hasFetchedWorkflowsForProject = computed(() =>
	workflowsListStore.hasFetchedAllWorkflows(projectId.value),
);
const hasNoWorkflows = computed(
	() => hasFetchedWorkflowsForProject.value && workflowCount.value === 0,
);

const resolvingWorkflowsEmptiness = computed(
	() => !workflowsFetchSettled.value && !hasFetchedWorkflowsForProject.value,
);

const goToCreateWorkflow = () => {
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: { projectId: projectId.value },
	});
};

async function loadWorkflowsForCurrentProject() {
	workflowsFetchSettled.value = false;
	try {
		await loadWorkflows();
	} finally {
		workflowsFetchSettled.value = true;
	}
}

onBeforeMount(async () => {
	await loadWorkflowsForCurrentProject();

	void externalHooks.run('executionsList.openDialog');
	telemetry.track('User opened Executions log', {
		workflow_id: workflowDocumentStore.value.workflowId,
	});
});

watch(projectId, async () => {
	await loadWorkflowsForCurrentProject();
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
		await workflowsListStore.fetchAllWorkflows(projectId.value);
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
	<ResourcesListLoadingState
		v-if="resolvingWorkflowsEmptiness"
		data-test-id="executions-loading-state"
	/>
	<PageViewLayout v-else-if="hasNoWorkflows">
		<template #header>
			<ProjectHeader>
				<InsightsSummary
					v-if="overview.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<div>
			<ResourcesListEmptyState
				resource-key="workflows"
				:button-disabled="readOnlyEnv || !projectPermissions.workflow.create"
				:disabled-tooltip-text="
					readOnlyEnv ? i18n.baseText('readOnlyEnv.cantAdd.workflow') : undefined
				"
				@click:button="goToCreateWorkflow"
			/>
		</div>
	</PageViewLayout>
	<GlobalExecutionsList
		v-else
		:executions="allExecutions"
		:filters="filters"
		:total="executionsCount"
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
