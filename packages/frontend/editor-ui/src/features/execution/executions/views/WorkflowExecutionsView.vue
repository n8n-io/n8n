<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import WorkflowExecutionsList from '../components/workflow/WorkflowExecutionsList.vue';
import { useExecutionsStore } from '../executions.store';
import { useI18n } from '@n8n/i18n';
import type { ExecutionFilterType } from '../executions.types';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { NO_NETWORK_ERROR_CODE } from '@n8n/rest-api-client';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useRoute, useRouter } from 'vue-router';
import type { ExecutionSummary } from 'n8n-workflow';
import { useDebounce } from '@/app/composables/useDebounce';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { executionRetryMessage } from '../executions.utils';

const executionsStore = useExecutionsStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();
const nodeTypesStore = useNodeTypesStore();
const projectsStore = useProjectsStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { callDebounced } = useDebounce();

const { initializeWorkspace } = useCanvasOperations();

const loading = ref(false);
const loadingMore = ref(false);

const workflow = ref<IWorkflowDb | undefined>();

const workflowId = computed(() => {
	const name = route.params.name;
	return typeof name === 'string' ? name : undefined;
});

const executionId = computed(() => {
	const id = route.params.executionId;
	return typeof id === 'string' ? id : undefined;
});

const executions = computed(() =>
	workflowId.value
		? [
				...(executionsStore.currentExecutionsByWorkflowId[workflowId.value] ?? []),
				...(executionsStore.executionsByWorkflowId[workflowId.value] ?? []),
			]
		: [],
);

const execution = computed(() => {
	return executions.value.find((e) => e.id === executionId.value) ?? currentExecution.value;
});

const currentExecution = ref<ExecutionSummary | undefined>();

// Check if this is a new workflow by looking for the ?new query param
const isNewWorkflowRoute = computed(() => {
	return route.query.new === 'true';
});

watch(
	() => workflowId.value,
	async () => {
		await fetchWorkflow();
	},
);

watch(
	() => executionId.value,
	async () => {
		await fetchExecution();
	},
);

onMounted(async () => {
	await Promise.all([nodeTypesStore.loadNodeTypesIfNotLoaded(), fetchWorkflow()]);

	if (workflowId.value) {
		await Promise.all([executionsStore.initialize(workflowId.value), fetchExecution()]);
	}

	await initializeRoute();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	executionsStore.reset();
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});

async function fetchExecution() {
	if (!executionId.value) {
		return;
	}

	try {
		currentExecution.value = (await executionsStore.fetchExecution(
			executionId.value,
		)) as ExecutionSummary;
		executionsStore.activeExecution = currentExecution.value;
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeView.showError.openExecution.title'));
	}

	if (!currentExecution.value) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('openExecution.missingExeuctionId.title'),
			message: i18n.baseText('openExecution.missingExeuctionId.message'),
		});

		return;
	}
}

function onDocumentVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		executionsStore.stopAutoRefreshInterval();
	} else {
		void executionsStore.startAutoRefreshInterval(workflowId.value);
	}
}

async function initializeRoute() {
	if (route.name === VIEWS.EXECUTION_HOME && executions.value.length > 0 && workflow.value) {
		await router
			.replace({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: workflow.value.id, executionId: executions.value[0].id },
				query: route.query,
			})
			.catch(() => {});
	}
}

async function fetchWorkflow() {
	// Skip fetching if it's a new workflow that hasn't been saved yet
	if (isNewWorkflowRoute.value) {
		workflow.value = workflowsStore.workflow;
		return;
	}

	// Check if we are loading the Executions tab directly, without having loaded the workflow
	if (workflowId.value) {
		if (!workflowsListStore.workflowsById[workflowId.value]) {
			try {
				await workflowsListStore.fetchActiveWorkflows();
				const data = await workflowsListStore.fetchWorkflow(workflowId.value);
				await initializeWorkspace(data);
			} catch (error) {
				toast.showError(error, i18n.baseText('nodeView.showError.openWorkflow.title'));
			}

			workflow.value = workflowsListStore.getWorkflowById(workflowId.value);
			const workflowData = await workflowsListStore.fetchWorkflow(workflow.value.id);

			await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(workflowData.homeProject);
		} else {
			workflow.value = workflowsListStore.workflowsById[workflowId.value];
		}
	}
}

async function onAutoRefreshToggle(value: boolean) {
	if (value) {
		await executionsStore.startAutoRefreshInterval(workflowId.value);
	} else {
		executionsStore.stopAutoRefreshInterval();
	}
}

async function onRefreshData() {
	if (!workflowId.value) {
		return;
	}

	try {
		await executionsStore.fetchExecutions({
			...executionsStore.executionsFilters,
			workflowId: workflowId.value,
		});
	} catch (error) {
		if (error.errorCode === NO_NETWORK_ERROR_CODE) {
			toast.showMessage(
				{
					title: i18n.baseText('executionsList.showError.refreshData.title'),
					message: error.message,
					type: 'error',
					duration: 3500,
				},
				false,
			);
		} else {
			toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
		}
	}
}

async function onUpdateFilters(newFilters: ExecutionFilterType) {
	executionsStore.reset();
	executionsStore.setFilters(newFilters);
	await executionsStore.initialize(workflowId.value);
}

async function onExecutionStop(id?: string) {
	if (!id) {
		return;
	}
	try {
		await executionsStore.stopCurrentExecution(id);

		toast.showMessage({
			title: i18n.baseText('executionsList.showMessage.stopExecution.title'),
			message: i18n.baseText('executionsList.showMessage.stopExecution.message', {
				interpolate: { activeExecutionId: id },
			}),
			type: 'success',
		});

		await onRefreshData();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
	}
}

async function onExecutionDelete(id?: string) {
	if (!id) {
		return;
	}
	loading.value = true;
	try {
		const executionIndex = executions.value.findIndex((e: ExecutionSummary) => e.id === id);

		const nextExecution =
			executions.value[executionIndex + 1] ||
			executions.value[executionIndex - 1] ||
			executions.value[0];

		await executionsStore.deleteExecutions({
			ids: [id],
		});

		if (workflow.value) {
			if (executions.value.length > 0) {
				await router
					.replace({
						name: VIEWS.EXECUTION_PREVIEW,
						params: { name: workflow.value.id, executionId: nextExecution.id },
					})
					.catch(() => {});
			} else {
				// If there are no executions left, show empty state
				await router.replace({
					name: VIEWS.EXECUTION_HOME,
					params: { name: workflow.value.id },
				});
			}
		}
	} catch (error) {
		loading.value = false;
		toast.showError(error, i18n.baseText('executionsList.showError.handleDeleteSelected.title'));
		return;
	}
	loading.value = false;

	toast.showMessage({
		title: i18n.baseText('executionsList.showMessage.handleDeleteSelected.title'),
		type: 'success',
	});
}

async function onExecutionRetry(payload: { id: string; loadWorkflow: boolean }) {
	toast.showMessage({
		title: i18n.baseText('executionDetails.runningMessage'),
		type: 'info',
		duration: 2000,
	});

	await retryExecution(payload);
	await onRefreshData();

	telemetry.track('User clicked retry execution button', {
		workflow_id: workflow.value?.id,
		execution_id: payload.id,
		retry_type: payload.loadWorkflow ? 'current' : 'original',
	});
}

async function retryExecution(payload: { id: string; loadWorkflow: boolean }) {
	try {
		const retriedExecution = await executionsStore.retryExecution(payload.id, payload.loadWorkflow);

		const retryMessage = executionRetryMessage(retriedExecution.status);

		if (retryMessage) {
			toast.showMessage(retryMessage);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.retryExecution.title'));
	}
}

async function onLoadMore(): Promise<void> {
	if (!loadingMore.value) {
		await callDebounced(loadMore, { debounceTime: 1000 });
	}
}

async function loadMore(): Promise<void> {
	if (
		!!executionsStore.executionsFilters.status?.includes('running') ||
		executions.value.length >= executionsStore.executionsCount
	) {
		return;
	}

	loadingMore.value = true;

	let lastId: string | undefined;
	if (executions.value.length !== 0) {
		const lastItem = executions.value.slice(-1)[0];
		lastId = lastItem.id;
	}

	try {
		await executionsStore.fetchExecutions(executionsStore.executionsFilters, lastId);
	} catch (error) {
		loadingMore.value = false;
		toast.showError(error, i18n.baseText('executionsList.showError.loadMore.title'));
		return;
	}

	loadingMore.value = false;
}
</script>
<template>
	<WorkflowExecutionsList
		v-if="workflow"
		:executions="executions"
		:execution="execution"
		:workflow="workflow"
		:loading="loading"
		:loading-more="loadingMore"
		@execution:stop="onExecutionStop"
		@execution:delete="onExecutionDelete"
		@execution:retry="onExecutionRetry"
		@update:filters="onUpdateFilters"
		@update:auto-refresh="onAutoRefreshToggle"
		@load-more="onLoadMore"
		@reload="onRefreshData"
	/>
</template>
