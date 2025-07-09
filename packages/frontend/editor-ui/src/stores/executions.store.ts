import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { IDataObject, ExecutionSummary, AnnotationVote, ExecutionStatus } from 'n8n-workflow';
import type {
	ExecutionFilterType,
	ExecutionsQueryFilter,
	ExecutionSummaryWithScopes,
	IExecutionDeleteFilter,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
} from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import {
	unflattenExecutionData,
	executionFilterToQueryFilter,
	getDefaultExecutionFilters,
} from '@/utils/executionUtils';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';

export const useExecutionsStore = defineStore('executions', () => {
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const settingsStore = useSettingsStore();

	const loading = ref(false);
	const itemsPerPage = ref(10);

	const activeExecution = ref<ExecutionSummary | null>(null);

	const filters = ref<ExecutionFilterType>(getDefaultExecutionFilters());
	const executionsFilters = computed<ExecutionsQueryFilter>(() => {
		const filter = executionFilterToQueryFilter(filters.value);

		if (projectsStore.currentProjectId) {
			filter.projectId = projectsStore.currentProjectId;
		}

		return filter;
	});
	const currentExecutionsFilters = computed<Partial<ExecutionFilterType>>(() => ({
		...(filters.value.workflowId !== 'all' ? { workflowId: filters.value.workflowId } : {}),
	}));

	const autoRefresh = ref(true);
	const autoRefreshTimeout = ref<NodeJS.Timeout | null>(null);
	const autoRefreshDelay = ref(4 * 1000); // Refresh data every 4 secs

	const executionsById = ref<Record<string, ExecutionSummaryWithScopes>>({});
	const executionsCount = ref(0);
	const executionsCountEstimated = ref(false);
	const executions = computed(() => {
		const data = Object.values(executionsById.value);

		data.sort((a, b) => {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

	const currentExecutionsById = ref<Record<string, ExecutionSummaryWithScopes>>({});
	const startedAtSortFn = (a: ExecutionSummary, b: ExecutionSummary) =>
		new Date(b.startedAt ?? b.createdAt).getTime() - new Date(a.startedAt ?? a.createdAt).getTime();

	/**
	 * Prioritize `running` over `new` executions, then sort by start timestamp.
	 */
	const statusThenStartedAtSortFn = (a: ExecutionSummary, b: ExecutionSummary) => {
		if (a.status && b.status) {
			const statusPriority: { [key: string]: number } = { running: 1, new: 2 };
			const statusComparison = statusPriority[a.status] - statusPriority[b.status];

			if (statusComparison !== 0) return statusComparison;
		}

		return startedAtSortFn(a, b);
	};

	const sortFn = settingsStore.isConcurrencyEnabled ? statusThenStartedAtSortFn : startedAtSortFn;

	const currentExecutions = computed(() => {
		const data = Object.values(currentExecutionsById.value);

		data.sort(sortFn);

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

	function addExecution(execution: ExecutionSummaryWithScopes) {
		executionsById.value = {
			...executionsById.value,
			[execution.id]: {
				...execution,
				mode: execution.mode,
			},
		};
	}

	function addCurrentExecution(execution: ExecutionSummaryWithScopes) {
		currentExecutionsById.value[execution.id] = {
			...execution,
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

	async function fetchExecutions(
		filter = executionsFilters.value,
		lastId?: string,
		firstId?: string,
	) {
		loading.value = true;
		try {
			const data = await makeRestApiRequest<IExecutionsListResponse>(
				rootStore.restApiContext,
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
			return data;
		} finally {
			loading.value = false;
		}
	}

	async function fetchExecution(id: string): Promise<IExecutionResponse | undefined> {
		const response = await makeRestApiRequest<IExecutionFlattedResponse>(
			rootStore.restApiContext,
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

	async function annotateExecution(
		id: string,
		data: { tags?: string[]; vote?: AnnotationVote | null },
	): Promise<void> {
		const updatedExecution: ExecutionSummaryWithScopes = await makeRestApiRequest(
			rootStore.restApiContext,
			'PATCH',
			`/executions/${id}`,
			data,
		);

		addExecution(updatedExecution);

		if (updatedExecution.id === activeExecution.value?.id) {
			activeExecution.value = updatedExecution;
		}
	}

	async function stopCurrentExecution(executionId: string): Promise<IExecutionsStopData> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'POST',
			`/executions/${executionId}/stop`,
		);
	}

	async function retryExecution(id: string, loadWorkflow?: boolean): Promise<ExecutionStatus> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
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
			rootStore.restApiContext,
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
				if (new Date(execution.startedAt ?? execution.createdAt) < deleteBefore) {
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
		annotateExecution,
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
		addExecution,
		resetData,
		reset,
		itemsPerPage,
	};
});
