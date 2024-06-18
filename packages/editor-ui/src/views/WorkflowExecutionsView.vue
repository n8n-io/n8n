<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import WorkflowExecutionsList from '@/components/executions/workflow/WorkflowExecutionsList.vue';
import { useExecutionsStore } from '@/stores/executions.store';
import { useI18n } from '@/composables/useI18n';
import type { ExecutionFilterType, ITag, IWorkflowDb } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { NO_NETWORK_ERROR_CODE } from '@/utils/apiUtils';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import { useRoute, useRouter } from 'vue-router';
import type { ExecutionSummary } from 'n8n-workflow';
import { useDebounce } from '@/composables/useDebounce';
import { storeToRefs } from 'pinia';
import { useTelemetry } from '@/composables/useTelemetry';
import { useTagsStore } from '@/stores/tags.store';

const executionsStore = useExecutionsStore();
const workflowsStore = useWorkflowsStore();
const tagsStore = useTagsStore();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { callDebounced } = useDebounce();

const { filters } = storeToRefs(executionsStore);

const loading = ref(false);
const loadingMore = ref(false);

const workflow = ref<IWorkflowDb | undefined>();

const workflowId = computed(() => {
	return (route.params.name as string) || workflowsStore.workflowId;
});

const executionId = computed(() => route.params.executionId as string);

const executions = computed(() => [
	...(executionsStore.currentExecutionsByWorkflowId[workflowId.value] ?? []),
	...(executionsStore.executionsByWorkflowId[workflowId.value] ?? []),
]);

const execution = computed(() => {
	return executions.value.find((e) => e.id === executionId.value) ?? currentExecution.value;
});

const currentExecution = ref<ExecutionSummary | undefined>();

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
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	await Promise.all([
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		fetchWorkflow(),
		executionsStore.initialize(workflowId.value),
	]);
	await fetchExecution();
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
			.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: workflow.value.id, executionId: executions.value[0].id },
			})
			.catch(() => {});
	}
}

async function fetchWorkflow() {
	let data: IWorkflowDb | undefined = workflowsStore.workflowsById[workflowId.value];
	if (!data) {
		try {
			data = await workflowsStore.fetchWorkflow(workflowId.value);
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.openWorkflow.title'));
			return;
		}
	}

	if (!data) {
		throw new Error(
			i18n.baseText('nodeView.workflowWithIdCouldNotBeFound', {
				interpolate: { workflowId: workflowId.value },
			}),
		);
	}

	const tags = (data.tags ?? []) as ITag[];
	workflow.value = data;
	workflowsStore.setWorkflowName({ newName: data.name, setStateDirty: false });
	workflowsStore.setWorkflowTagIds(tags.map(({ id }) => id) ?? []);
	tagsStore.upsertTags(tags);
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

async function onExecutionStop(id: string) {
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

async function onExecutionDelete(id: string) {
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
		const retrySuccessful = await executionsStore.retryExecution(payload.id, payload.loadWorkflow);

		if (retrySuccessful) {
			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
				type: 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
				type: 'error',
			});
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
		:filters="filters"
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
