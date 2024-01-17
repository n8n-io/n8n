import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ExecutionStatus, IExecutionsSummary } from 'n8n-workflow';
import type {
	ExecutionFilterType,
	ExecutionsQueryFilter,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
} from '@/Interface';
import { useRootStore } from '@/stores/n8nRoot.store';
import { makeRestApiRequest, unflattenExecutionData } from '@/utils/apiUtils';
import { isEmpty } from '@/utils/typesUtils';
import { executionFilterToQueryFilter } from '@/utils/executionUtils';

export const useExecutionsStore = defineStore('executions', () => {
	const rootStore = useRootStore();

	const loading = ref(false);
	const itemsPerPage = ref(10);

	const filters = ref<ExecutionFilterType>(getDefaultFilters());
	const pastExecutionsFilters = computed<ExecutionsQueryFilter>(() =>
		executionFilterToQueryFilter(filters.value),
	);
	const currentExecutionsFilters = computed<Partial<ExecutionFilterType>>(() => ({
		...(filters.value.workflowId !== 'all' ? { workflowId: filters.value.workflowId } : {}),
	}));

	const autoRefresh = ref(true);
	const autoRefreshTimeout = ref<NodeJS.Timeout | null>(null);
	const autoRefreshDelay = ref(4 * 1000); // Refresh data every 4 secs

	const executionsById = ref<Record<string, IExecutionsSummary>>({});
	const executionsCount = ref(0);
	const executionsCountEstimated = ref(false);
	const executions = computed(() => {
		const data = Object.values(executionsById.value);

		data.sort((a, b) => {
			if (a.finished === undefined) {
				return -1;
			}
			if (b.finished === undefined) {
				return 1;
			}
			return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
		});

		return data;
	});

	const pastExecutions = computed(() => executions.value.filter((e) => e.status !== 'running'));
	const currentExecutions = computed(() => executions.value.filter((e) => e.status === 'running'));

	const filteredExecutions = computed(() => {
		const data: IExecutionsSummary[] = [];

		if (['all', 'running'].includes(filters.value.status)) {
			data.push(...currentExecutions.value);
		}

		if (['all', 'error', 'success', 'waiting'].includes(filters.value.status)) {
			data.push(...pastExecutions.value);
		}

		return filters.value.workflowId === 'all'
			? data
			: data.filter((execution) => execution.workflowId === filters.value.workflowId);
	});

	const executionsByWorkflowId = computed(() =>
		executions.value.reduce<Record<string, IExecutionsSummary[]>>((acc, execution) => {
			if (!acc[execution.workflowId]) {
				acc[execution.workflowId] = [];
			}
			acc[execution.workflowId].push(execution);
			return acc;
		}, {}),
	);

	function getDefaultFilters(): ExecutionFilterType {
		return {
			workflowId: 'all',
			status: 'all',
			startDate: '',
			endDate: '',
			tags: [],
			metadata: [],
		};
	}

	function addExecution(execution: IExecutionsSummary) {
		executionsById.value[execution.id] = {
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

	async function initialize() {
		filters.value = getDefaultFilters();
		setTimeout(async () => {
			await startAutoRefreshInterval();
		}, autoRefreshDelay.value);
	}

	function terminate() {
		stopAutoRefreshInterval();
	}

	function getExecutionStatus(execution: IExecutionsSummary): ExecutionStatus {
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
				return 'failed';
			} else {
				return 'unknown';
			}
		}
	}

	async function fetchPastExecutions(
		filter = pastExecutionsFilters.value,
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

			data.results.forEach(addExecution);

			executionsCount.value = data.count;
			executionsCountEstimated.value = data.estimated;
		} catch (e) {
			throw e;
		} finally {
			loading.value = false;
		}
	}

	async function fetchCurrentExecutions(filter = currentExecutionsFilters.value) {
		loading.value = true;
		try {
			const data = await makeRestApiRequest<IExecutionsSummary[]>(
				rootStore.getRestApiContext,
				'GET',
				'/executions-current',
				{
					...(filter ? { filter } : {}),
				},
			);

			data.forEach(addExecution);
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

	async function loadAutoRefresh(): Promise<void> {
		// We cannot use firstId here as some executions finish out of order. Let's say
		// You have execution ids 500 to 505 running.
		// Suppose 504 finishes before 500, 501, 502 and 503.
		// iF you use firstId, filtering id >= 504 you won't
		// ever get ids 500, 501, 502 and 503 when they finish
		const promises = [fetchPastExecutions(pastExecutionsFilters.value)];
		if (isEmpty(pastExecutionsFilters.value.metadata)) {
			promises.push(fetchCurrentExecutions({}));
		}
		await Promise.all(promises);

		// @TODO
		// this.adjustSelectionAfterMoreItemsLoaded();

		autoRefreshTimeout.value = setTimeout(() => {
			if (autoRefresh.value) {
				void startAutoRefreshInterval();
			}
		}, autoRefreshDelay.value);
	}

	async function startAutoRefreshInterval() {
		autoRefresh.value = true;
		await loadAutoRefresh();
	}

	function stopAutoRefreshInterval() {
		if (autoRefreshTimeout.value) {
			clearTimeout(autoRefreshTimeout.value);
			autoRefreshTimeout.value = null;
		}
	}

	return {
		loading,
		executionsById,
		executions,
		executionsCount,
		executionsCountEstimated,
		executionsByWorkflowId,
		fetchPastExecutions,
		fetchCurrentExecutions,
		fetchExecution,
		getExecutionStatus,
		autoRefresh,
		autoRefreshTimeout,
		startAutoRefreshInterval,
		stopAutoRefreshInterval,
		initialize,
		terminate,
		filters,
		setFilters,
		pastExecutionsFilters,
		currentExecutionsFilters,
		pastExecutions,
		currentExecutions,
		filteredExecutions,
	};
});
