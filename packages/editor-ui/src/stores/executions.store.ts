import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ExecutionStatus, IDataObject, ExecutionSummary } from 'n8n-workflow';
import type {
	ExecutionFilterType,
	ExecutionsQueryFilter,
	IExecutionDeleteFilter,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
} from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { makeRestApiRequest, unflattenExecutionData } from '@/utils/apiUtils';
import { executionFilterToQueryFilter, getDefaultExecutionFilters } from '@/utils/executionUtils';

export const useExecutionsStore = defineStore('executions', () => {
	const rootStore = useRootStore();

	const loading = ref(false);
	const itemsPerPage = ref(10);

	const activeExecution = ref<ExecutionSummary | null>(null);

	const filters = ref<ExecutionFilterType>(getDefaultExecutionFilters());
	const executionsFilters = computed<ExecutionsQueryFilter>(() =>
		executionFilterToQueryFilter(filters.value),
	);
	const currentExecutionsFilters = computed<Partial<ExecutionFilterType>>(() => ({
		...(filters.value.workflowId !== 'all' ? { workflowId: filters.value.workflowId } : {}),
	}));

	const autoRefresh = ref(true);
	const autoRefreshTimeout = ref<NodeJS.Timeout | null>(null);
	const autoRefreshDelay = ref(4 * 1000); // Refresh data every 4 secs

	const executionsById = ref<Record<string, ExecutionSummary>>({});
	const executionsCount = ref(0);
	const executionsCountEstimated = ref(false);
	const executions = computed(() => {
		const data = Object.values(executionsById.value);

		data.sort((a, b) => {
			return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
		});

		return data;
	});

	const executionsByWorkflowId = computed(() =>
		executions.value.reduce<Record<string, ExecutionSummary[]>>((acc, execution) => {
			if (!acc[execution.workflowId]) {
				acc[execution.workflowId] = [];
			}
			acc[execution.workflowId].push(execution);
			return acc;
		}, {}),
	);

	const currentExecutionsById = ref<Record<string, ExecutionSummary>>({});
	const currentExecutions = computed(() => {
		const data = Object.values(currentExecutionsById.value);

		data.sort((a, b) => {
			return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
		});

		return data;
	});

	const currentExecutionsByWorkflowId = computed(() =>
		currentExecutions.value.reduce<Record<string, ExecutionSummary[]>>((acc, execution) => {
			if (!acc[execution.workflowId]) {
				acc[execution.workflowId] = [];
			}
			acc[execution.workflowId].push(execution);
			return acc;
		}, {}),
	);

	const allExecutions = computed(() => [...currentExecutions.value, ...executions.value]);

	function addExecution(execution: ExecutionSummary) {
		executionsById.value[execution.id] = {
			...execution,
			status: execution.status ?? getExecutionStatus(execution),
			mode: execution.mode,
		};
	}

	function addCurrentExecution(execution: ExecutionSummary) {
		currentExecutionsById.value[execution.id] = {
			...execution,
			status: execution.status ?? getExecutionStatus(execution),
			mode: execution.mode,
		};
	}

	function removeExecution(id: string) {
		const { [id]: _, ...rest } = executionsById.value;
		executionsById.value = rest;
	}

	function setFilters(value: ExecutionFilterType) {
		filters.value = value;
	}

	async function initialize(workflowId?: string) {
		if (workflowId) {
			filters.value.workflowId = workflowId;
		}
		await fetchExecutions();
		await startAutoRefreshInterval(workflowId);
	}

	function getExecutionStatus(execution: ExecutionSummary): ExecutionStatus {
		if (execution.status) {
			return execution.status;
		} else {
			if (execution.waitTill) {
				return 'waiting';
			} else if (execution.stoppedAt === undefined) {
				return 'running';
			} else if (execution.finished) {
				return 'success';
			} else if (execution.stoppedAt !== null) {
				return 'error';
			} else {
				return 'unknown';
			}
		}
	}

	async function fetchExecutions(
		filter = executionsFilters.value,
		lastId?: string,
		firstId?: string,
	) {
		loading.value = true;
		try {
			const data = await makeRestApiRequest<IExecutionsListResponse>(
				rootStore.getRestApiContext,
				'GET',
				'/executions',
				{
					...(filter ? { filter } : {}),
					...(firstId ? { firstId } : {}),
					...(lastId ? { lastId } : {}),
					limit: itemsPerPage.value,
				},
			);

			currentExecutionsById.value = {};
			data.results.forEach((execution) => {
				if (['new', 'running'].includes(execution.status as string)) {
					addCurrentExecution(execution);
				} else {
					addExecution(execution);
				}
			});

			executionsCount.value = data.count;
			executionsCountEstimated.value = data.estimated;
		} catch (e) {
			throw e;
		} finally {
			loading.value = false;
		}
	}

	async function fetchExecution(id: string): Promise<IExecutionResponse | undefined> {
		const response = await makeRestApiRequest<IExecutionFlattedResponse>(
			rootStore.getRestApiContext,
			'GET',
			`/executions/${id}`,
		);

		return response ? unflattenExecutionData(response) : undefined;
	}

	async function loadAutoRefresh(workflowId?: string): Promise<void> {
		const autoRefreshExecutionFilters = {
			...executionsFilters.value,
			...(workflowId ? { workflowId } : {}),
		};

		autoRefreshTimeout.value = setTimeout(async () => {
			if (autoRefresh.value) {
				await fetchExecutions(autoRefreshExecutionFilters);
				void startAutoRefreshInterval(workflowId);
			}
		}, autoRefreshDelay.value);
	}

	async function startAutoRefreshInterval(workflowId?: string) {
		stopAutoRefreshInterval();
		await loadAutoRefresh(workflowId);
	}

	function stopAutoRefreshInterval() {
		if (autoRefreshTimeout.value) {
			clearTimeout(autoRefreshTimeout.value);
			autoRefreshTimeout.value = null;
		}
	}

	async function stopCurrentExecution(executionId: string): Promise<IExecutionsStopData> {
		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'POST',
			`/executions/${executionId}/stop`,
		);
	}

	async function retryExecution(id: string, loadWorkflow?: boolean): Promise<boolean> {
		return await makeRestApiRequest(
			rootStore.getRestApiContext,
			'POST',
			`/executions/${id}/retry`,
			loadWorkflow
				? {
						loadWorkflow: true,
					}
				: undefined,
		);
	}

	async function deleteExecutions(sendData: IExecutionDeleteFilter): Promise<void> {
		await makeRestApiRequest(
			rootStore.getRestApiContext,
			'POST',
			'/executions/delete',
			sendData as unknown as IDataObject,
		);

		if (sendData.ids) {
			sendData.ids.forEach(removeExecution);
		}

		if (sendData.deleteBefore) {
			const deleteBefore = new Date(sendData.deleteBefore);
			allExecutions.value.forEach((execution) => {
				if (new Date(execution.startedAt) < deleteBefore) {
					removeExecution(execution.id);
				}
			});
		}
	}

	function resetData() {
		executionsById.value = {};
		currentExecutionsById.value = {};
		executionsCount.value = 0;
		executionsCountEstimated.value = false;
	}

	function reset() {
		itemsPerPage.value = 10;
		filters.value = getDefaultExecutionFilters();
		autoRefresh.value = true;
		resetData();
		stopAutoRefreshInterval();
	}

	return {
		loading,
		executionsById,
		executions,
		executionsCount,
		executionsCountEstimated,
		executionsByWorkflowId,
		currentExecutions,
		currentExecutionsByWorkflowId,
		activeExecution,
		fetchExecutions,
		fetchExecution,
		getExecutionStatus,
		autoRefresh,
		autoRefreshTimeout,
		startAutoRefreshInterval,
		stopAutoRefreshInterval,
		initialize,
		filters,
		setFilters,
		executionsFilters,
		currentExecutionsFilters,
		allExecutions,
		stopCurrentExecution,
		retryExecution,
		deleteExecutions,
		resetData,
		reset,
	};
});
