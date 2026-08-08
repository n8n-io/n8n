import { defineStore } from 'pinia';
import { ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import { DEFAULT_ID_COLUMN_NAME } from '@/features/core/dataTable/constants';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

import * as agentEvalsApi from './agentEvals.api';
import type {
	AgentEvalCase,
	AgentEvalDatasetRecord,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	GenerateDraftCasesOptions,
} from './agentEvals.types';
import { AGENT_EVAL_CASES_PAGE_SIZE } from './constants';
import {
	toAgentEvalCase,
	toAgentEvalCases,
	toDataTableRow,
	type AgentEvalCaseSource,
} from './utils/agentEvalCases.utils';

/** The two fields a case is edited through; the row id identifies which row they land on. */
type AgentEvalCaseValue = Pick<AgentEvalCase, 'input' | 'whatToCheck'>;

/**
 * Client state for an agent's eval datasets, their cases and their runs.
 *
 * Cases are rows of the dataset's Data Table rather than a resource on the eval
 * API, so they are read and written through the Data Table store. Keeping that
 * here means the components never learn a case is a table row.
 *
 * Per-case results and ratings are deliberately absent: nothing renders them yet.
 */
export const useAgentEvalsStore = defineStore(STORES.AGENT_EVALS, () => {
	const rootStore = useRootStore();
	const dataTableStore = useDataTableStore();

	// Keyed by agentId so switching agents inside the builder can't render the
	// previous agent's datasets.
	const datasetsByAgentId = ref<Record<string, AgentEvalDatasetRecord[]>>({});

	// Flag maps are typed as optional because a missing key means "not in flight" —
	// `Record<string, boolean>` would claim every id is present.
	const loadingDatasets = ref<Record<string, boolean | undefined>>({});
	const generatingCases = ref<Record<string, boolean | undefined>>({});

	// Cases key by datasetId, not agentId: one agent accumulates a dataset per
	// generation, and each has its own rows.
	const casesByDatasetId = ref<Record<string, AgentEvalCase[]>>({});
	// The server's total, which can exceed the page held above — it's what the run
	// button counts, since a run covers every row in the table.
	const casesCountByDatasetId = ref<Record<string, number>>({});
	const loadingCases = ref<Record<string, boolean | undefined>>({});
	// Keyed `datasetId:rowId` so one row saving can't disable its siblings.
	const mutatingCases = ref<Record<string, boolean | undefined>>({});

	const latestRunByDatasetId = ref<Record<string, AgentEvalRunRecord>>({});
	const runSummariesByRunId = ref<Record<string, AgentEvalRunSummary>>({});
	const startingRunByDatasetId = ref<Record<string, boolean | undefined>>({});
	const cancellingRunByDatasetId = ref<Record<string, boolean | undefined>>({});

	/**
	 * A request from another surface to focus an agent's eval tab, optionally
	 * generating on arrival — raised by the assistant's post-setup suggestion.
	 *
	 * Held here rather than emitted on the event bus because the builder that
	 * serves the request may not be mounted yet when it's raised (the assistant
	 * has to reveal the agent artifact first). A watcher can consume a request
	 * that predates it; a fire-and-forget event would be dropped.
	 */
	const pendingEvalsFocus = ref<{ agentId: string; generate: boolean } | null>(null);

	const requestEvalsFocus = (agentId: string, generate = false) => {
		pendingEvalsFocus.value = { agentId, generate };
	};

	/** Claims the request when it names this agent, so only one builder acts on it. */
	const consumeEvalsFocus = (agentId: string) => {
		const request = pendingEvalsFocus.value;
		if (request?.agentId !== agentId) return null;
		pendingEvalsFocus.value = null;
		return request;
	};

	/**
	 * Drops an unclaimed request for this agent. Called by the surface that raised
	 * it when it goes away: without this, a request no builder ever picked up
	 * would sit here for the rest of the session and then fire in an unrelated
	 * context, jumping to Evals and generating cases the user didn't ask for at
	 * that moment.
	 *
	 * Scoped by agent for the same reason `consumeEvalsFocus` is — a surface
	 * tearing down must not discard a request some other surface just raised.
	 */
	const clearEvalsFocus = (agentId: string) => {
		if (pendingEvalsFocus.value?.agentId !== agentId) return;
		pendingEvalsFocus.value = null;
	};

	const getDatasets = (agentId: string) => datasetsByAgentId.value[agentId] ?? [];

	// Absence of a cache entry is "not loaded yet", not "none" — callers that
	// need to distinguish the two should check `isLoaded` before `getDatasets`.
	const isLoaded = (agentId: string) => datasetsByAgentId.value[agentId] !== undefined;

	const isLoadingDatasets = (agentId: string) => loadingDatasets.value[agentId] === true;

	const isGeneratingCases = (agentId: string) => generatingCases.value[agentId] === true;

	const getCases = (datasetId: string) => casesByDatasetId.value[datasetId] ?? [];

	const getCasesCount = (datasetId: string) => casesCountByDatasetId.value[datasetId] ?? 0;

	// Same "absence is not emptiness" contract as `isLoaded`.
	const areCasesLoaded = (datasetId: string) => casesByDatasetId.value[datasetId] !== undefined;

	const isLoadingCases = (datasetId: string) => loadingCases.value[datasetId] === true;

	const isMutatingCase = (datasetId: string, rowId: number) =>
		mutatingCases.value[`${datasetId}:${rowId}`] === true;

	const getLatestRun = (datasetId: string) => latestRunByDatasetId.value[datasetId] ?? null;

	const getRunSummary = (runId: string) => runSummariesByRunId.value[runId] ?? null;

	const isStartingRun = (datasetId: string) => startingRunByDatasetId.value[datasetId] === true;

	const isCancellingRun = (datasetId: string) => cancellingRunByDatasetId.value[datasetId] === true;

	const setDatasets = (agentId: string, datasets: AgentEvalDatasetRecord[]) => {
		datasetsByAgentId.value = { ...datasetsByAgentId.value, [agentId]: datasets };
	};

	const setCases = (datasetId: string, cases: AgentEvalCase[]) => {
		casesByDatasetId.value = { ...casesByDatasetId.value, [datasetId]: cases };
	};

	const setCasesCount = (datasetId: string, count: number) => {
		casesCountByDatasetId.value = { ...casesCountByDatasetId.value, [datasetId]: count };
	};

	const setMutatingCase = (datasetId: string, rowId: number, mutating: boolean) => {
		mutatingCases.value = { ...mutatingCases.value, [`${datasetId}:${rowId}`]: mutating };
	};

	const setLatestRun = (datasetId: string, run: AgentEvalRunRecord) => {
		latestRunByDatasetId.value = { ...latestRunByDatasetId.value, [datasetId]: run };
	};

	const fetchDatasets = async (projectId: string, agentId: string) => {
		loadingDatasets.value = { ...loadingDatasets.value, [agentId]: true };
		try {
			const datasets = await agentEvalsApi.getDatasets(
				rootStore.restApiContext,
				projectId,
				agentId,
			);
			setDatasets(agentId, datasets);
			return datasets;
		} finally {
			loadingDatasets.value = { ...loadingDatasets.value, [agentId]: false };
		}
	};

	// The response carries the drafts, not the dataset row, so the list is
	// re-read rather than patched. Best-effort: generation already succeeded
	// server-side and cost model credits, so a transient refresh failure must not
	// surface as a generation failure (user retries → duplicate dataset). A stale
	// cache self-heals on the next fetch.
	const generateDraftCases = async (
		projectId: string,
		agentId: string,
		options: GenerateDraftCasesOptions = {},
	) => {
		generatingCases.value = { ...generatingCases.value, [agentId]: true };
		try {
			const result = await agentEvalsApi.generateDraftCases(
				rootStore.restApiContext,
				projectId,
				agentId,
				options,
			);
			await fetchDatasets(projectId, agentId).catch(() => null);
			return result;
		} finally {
			generatingCases.value = { ...generatingCases.value, [agentId]: false };
		}
	};

	// Sorted by row id so the numbering the view shows is stable across reads, and
	// read as one page: generation caps a dataset well below the page size.
	//
	// `projectId` is the agent's, which the Data Table routes scope on. That holds for
	// every dataset this UI can produce, since generation creates the table in the
	// agent's own project — but a dataset attached through the API can point at a table
	// in another project, and the runner resolves that case properly where this cannot.
	// Such a dataset surfaces as a failed read rather than silently empty rows.
	const fetchCases = async (projectId: string, source: AgentEvalCaseSource) => {
		loadingCases.value = { ...loadingCases.value, [source.datasetId]: true };
		try {
			const { count, data } = await dataTableStore.fetchDataTableContent(
				source.dataTableId,
				projectId,
				1,
				AGENT_EVAL_CASES_PAGE_SIZE,
				`${DEFAULT_ID_COLUMN_NAME}:asc`,
			);
			const cases = toAgentEvalCases(data, source.columns);
			setCases(source.datasetId, cases);
			setCasesCount(source.datasetId, count);
			return cases;
		} finally {
			loadingCases.value = { ...loadingCases.value, [source.datasetId]: false };
		}
	};

	// Appends rather than refetching, so the list can't reorder under the user
	// mid-review. The total moves regardless of whether the returned row could be
	// mapped — the row exists server-side either way, and an unmappable one heals
	// on the next read.
	const createCase = async (
		projectId: string,
		source: AgentEvalCaseSource,
		value: AgentEvalCaseValue,
	) => {
		const inserted = await dataTableStore.insertRow(
			source.dataTableId,
			projectId,
			toDataTableRow(value, source.columns),
		);
		setCasesCount(source.datasetId, getCasesCount(source.datasetId) + 1);

		const created = inserted ? toAgentEvalCase(inserted, source.columns) : null;
		if (created) setCases(source.datasetId, [...getCases(source.datasetId), created]);

		return created;
	};

	// Patches in place only once the write is acknowledged. No optimistic update:
	// the route answers with a boolean rather than the row, so a rollback would
	// need a snapshot to restore and a rule for what happens if a poll lands in
	// between — for a sub-second single-row write that isn't worth the ambiguity.
	const updateCase = async (
		projectId: string,
		source: AgentEvalCaseSource,
		rowId: number,
		value: AgentEvalCaseValue,
	) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const updated = await dataTableStore.updateRow(
				source.dataTableId,
				projectId,
				rowId,
				toDataTableRow(value, source.columns),
			);
			if (!updated) return false;

			setCases(
				source.datasetId,
				getCases(source.datasetId).map((c) => (c.rowId === rowId ? { ...c, ...value } : c)),
			);
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};

	const deleteCase = async (projectId: string, source: AgentEvalCaseSource, rowId: number) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const deleted = await dataTableStore.deleteRows(source.dataTableId, projectId, [rowId]);
			if (!deleted) return false;

			const remaining = getCases(source.datasetId).filter((c) => c.rowId !== rowId);
			setCases(source.datasetId, remaining);
			setCasesCount(source.datasetId, Math.max(0, getCasesCount(source.datasetId) - 1));
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};

	// Resolves once the run is seeded, not once it finishes — the caller polls
	// `fetchRunSummary` from there.
	const startRun = async (projectId: string, agentId: string, datasetId: string) => {
		startingRunByDatasetId.value = { ...startingRunByDatasetId.value, [datasetId]: true };
		try {
			const run = await agentEvalsApi.startRun(
				rootStore.restApiContext,
				projectId,
				agentId,
				datasetId,
			);
			setLatestRun(datasetId, run);
			return run;
		} finally {
			startingRunByDatasetId.value = { ...startingRunByDatasetId.value, [datasetId]: false };
		}
	};

	// Records the cancelled run as the server returns it. The cases already in flight
	// settle on their own, so callers keep polling rather than treating this as the end.
	const cancelRun = async (
		projectId: string,
		agentId: string,
		datasetId: string,
		runId: string,
	) => {
		cancellingRunByDatasetId.value = { ...cancellingRunByDatasetId.value, [datasetId]: true };
		try {
			const run = await agentEvalsApi.cancelRun(
				rootStore.restApiContext,
				projectId,
				agentId,
				runId,
			);
			setLatestRun(datasetId, run);
			return run;
		} finally {
			cancellingRunByDatasetId.value = { ...cancellingRunByDatasetId.value, [datasetId]: false };
		}
	};

	// Takes the datasetId the run belongs to because the summary doesn't carry it,
	// and the cached run's status has to stay coherent with the counts the view
	// renders beside it.
	const fetchRunSummary = async (
		projectId: string,
		agentId: string,
		datasetId: string,
		runId: string,
	) => {
		const summary = await agentEvalsApi.getRunSummary(
			rootStore.restApiContext,
			projectId,
			agentId,
			runId,
		);
		runSummariesByRunId.value = { ...runSummariesByRunId.value, [runId]: summary };

		const cached = latestRunByDatasetId.value[datasetId];
		if (cached?.id === runId && cached.status !== summary.status) {
			setLatestRun(datasetId, { ...cached, status: summary.status });
		}

		return summary;
	};

	// Newest run only. This is what lets a reload mid-run pick the run back up
	// instead of rendering an idle view that never updates.
	const fetchLatestRun = async (projectId: string, agentId: string, datasetId: string) => {
		const { data } = await agentEvalsApi.listRuns(
			rootStore.restApiContext,
			projectId,
			agentId,
			datasetId,
			{ skip: 0, take: 1 },
		);
		const run = data[0] ?? null;
		if (run) setLatestRun(datasetId, run);

		return run;
	};

	return {
		getDatasets,
		isLoaded,
		isLoadingDatasets,
		isGeneratingCases,
		fetchDatasets,
		generateDraftCases,
		getCases,
		getCasesCount,
		areCasesLoaded,
		isLoadingCases,
		isMutatingCase,
		fetchCases,
		createCase,
		updateCase,
		deleteCase,
		getLatestRun,
		getRunSummary,
		isStartingRun,
		isCancellingRun,
		startRun,
		cancelRun,
		fetchRunSummary,
		fetchLatestRun,
		pendingEvalsFocus,
		requestEvalsFocus,
		consumeEvalsFocus,
		clearEvalsFocus,
	};
});
