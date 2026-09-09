import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
	IDataObject,
	ExecutionSummary,
	AnnotationVote,
	ExecutionStatus,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import type { ExecutionRedactionQueryDto, SerializedCursor } from '@n8n/api-types';
import { compareExecutionListItems } from '@n8n/api-types';
import type {
	ExecutionFilterType,
	ExecutionsQueryFilter,
	ExecutionSummaryWithScopes,
	IExecutionDeleteFilter,
	IExecutionFlattedResponse,
	IExecutionResponse,
	IExecutionsListResponse,
	IExecutionsStopData,
} from './executions.types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import {
	unflattenExecutionData,
	executionFilterToQueryFilter,
	getDefaultExecutionFilters,
} from './executions.utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

export const useExecutionsStore = defineStore('executions', () => {
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const settingsStore = useSettingsStore();

	const loading = ref(false);
	const initialLoadComplete = ref(false);
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
	const hasMoreExecutions = ref(true);
	const nextCursor = ref<SerializedCursor | null>(null);
	let loadedPages = 0;
	let activeFilterKey: string | undefined;
	const concurrentExecutionsCount = ref(0);
	const executions = computed(() => {
		const data = Object.values(executionsById.value);

		data.sort(compareExecutionListItems);

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

	/** One page of executions, straight from the server. Leaves the loaded list alone. */
	async function fetchExecutionsPage(filter: ExecutionsQueryFilter, cursor?: SerializedCursor) {
		return await makeRestApiRequest<IExecutionsListResponse>(
			rootStore.restApiContext,
			'GET',
			'/executions',
			{ filter, cursor, limit: itemsPerPage.value },
		);
	}

	/**
	 * `first` replaces the loaded pages, `more` appends the page after them, and
	 * `refresh` reloads the first page and keeps the rest.
	 */
	type PageToLoad = 'first' | 'more' | 'refresh';

	async function loadExecutionsPage(filter: ExecutionsQueryFilter, page: PageToLoad) {
		const filterKey = JSON.stringify(filter);

		// A different filter invalidates every loaded page, and every cursor into them.
		if (activeFilterKey !== filterKey) {
			executionsById.value = {};
			currentExecutionsById.value = {};
			nextCursor.value = null;
			loadedPages = 0;
			activeFilterKey = filterKey;
			page = 'first';
		}

		const cursor = page === 'more' ? nextCursor.value : null;
		if (page === 'more' && !cursor) return undefined; // the list has no next page

		loading.value = true;
		try {
			const data = await fetchExecutionsPage(filter, cursor ?? undefined);

			// The filter changed while the request was in flight, so its rows are stale.
			if (activeFilterKey !== filterKey) return data;

			// Only the top of the list carries the current set, and a cursor page holds
			// completed rows alone, so a page appended below must leave that set alone.
			if (page !== 'more') currentExecutionsById.value = {};
			data.results.forEach((execution) => {
				if (['new', 'running'].includes(execution.status as string)) {
					delete executionsById.value[execution.id];
					addCurrentExecution(execution);
				} else {
					delete currentExecutionsById.value[execution.id];
					addExecution(execution);
				}
			});

			// A refresh only reloads the top of the list, so it must not pull the
			// continuation back to page one once "load more" has moved it deeper.
			if (page !== 'refresh' || loadedPages <= 1) {
				nextCursor.value = data.nextCursor;
				hasMoreExecutions.value = data.nextCursor !== null;
			}
			if (page === 'first') loadedPages = 1;
			if (page === 'more') loadedPages += 1;

			// A cursor page counts every status, the first page counts completed only.
			// Keep the first page's total, so the count cannot change meaning midway.
			if (page !== 'more') executionsCount.value = data.count;
			concurrentExecutionsCount.value = data.concurrentExecutionsCount;
			return data;
		} finally {
			loading.value = false;
			initialLoadComplete.value = true;
		}
	}

	/** Load the first page, replacing the pages loaded so far. */
	async function fetchExecutions(filter = executionsFilters.value) {
		return await loadExecutionsPage(filter, 'first');
	}

	/** Append the page after the last one loaded. Does nothing at the end of the list. */
	async function loadMoreExecutions(filter = executionsFilters.value) {
		return await loadExecutionsPage(filter, 'more');
	}

	/** Reload the first page, keeping the pages already loaded below it. */
	async function refreshExecutions(filter = executionsFilters.value) {
		return await loadExecutionsPage(filter, 'refresh');
	}

	async function fetchExecution(
		id: string,
		queryParams?: ExecutionRedactionQueryDto,
	): Promise<IExecutionResponse | undefined> {
		const response = await makeRestApiRequest<IExecutionFlattedResponse>(
			rootStore.restApiContext,
			'GET',
			`/executions/${id}`,
			queryParams,
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
				await refreshExecutions(autoRefreshExecutionFilters);
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

	type FilterFields = Partial<{
		id: string;
		finished: boolean;
		mode: WorkflowExecuteMode;
		retryOf: string;
		retrySuccessId: string;
		status: ExecutionStatus[];
		workflowId: string;
		waitTill: boolean;
		metadata: Array<{ key: string; value: string; exactMatch?: boolean }>;
		startedAfter: string;
		startedBefore: string;
		annotationTags: string[]; // tag IDs
		vote: AnnotationVote;
		projectId: string;
	}>;

	type StopExecutionFilterQuery = { workflowId: string } & Pick<
		FilterFields,
		'startedAfter' | 'startedBefore' | 'mode' | 'workflowId' | 'status'
	>; // parsed from query params

	// Returns the amount of stopped executions
	async function stopManyExecutions(filter: Omit<StopExecutionFilterQuery, 'workflowId'>) {
		return await makeRestApiRequest<{ stopped: number }>(
			rootStore.restApiContext,
			'POST',
			'/executions/stopMany',
			{
				filter: { ...filter, workflowId: filters.value.workflowId },
			},
		);
	}

	async function stopCurrentExecution(executionId: string): Promise<IExecutionsStopData> {
		return await makeRestApiRequest(
			rootStore.restApiContext,
			'POST',
			`/executions/${executionId}/stop`,
		);
	}

	async function retryExecution(id: string, loadWorkflow?: boolean): Promise<IExecutionResponse> {
		const retriedExecution = await makeRestApiRequest<IExecutionResponse>(
			rootStore.restApiContext,
			'POST',
			`/executions/${id}/retry`,
			loadWorkflow
				? {
						loadWorkflow: true,
					}
				: undefined,
		);
		return retriedExecution;
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
		concurrentExecutionsCount.value = 0;
		hasMoreExecutions.value = true;
		nextCursor.value = null;
		loadedPages = 0;
		activeFilterKey = undefined;
	}

	function reset() {
		itemsPerPage.value = 10;
		filters.value = getDefaultExecutionFilters();
		autoRefresh.value = true;
		initialLoadComplete.value = false;
		resetData();
		stopAutoRefreshInterval();
	}

	return {
		loading,
		initialLoadComplete,
		annotateExecution,
		executionsById,
		executions,
		executionsCount,
		hasMoreExecutions,
		nextCursor,
		concurrentExecutionsCount,
		executionsByWorkflowId,
		currentExecutions,
		currentExecutionsByWorkflowId,
		activeExecution,
		fetchExecutions,
		loadMoreExecutions,
		refreshExecutions,
		fetchExecutionsPage,
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
		stopManyExecutions,
	};
});
