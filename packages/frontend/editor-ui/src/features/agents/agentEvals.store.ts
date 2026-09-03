import { defineStore } from 'pinia';
import { ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import { TIME } from '@/app/constants';
import { DEFAULT_ID_COLUMN_NAME } from '@/features/core/dataTable/constants';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';

import * as agentEvalsApi from './agentEvals.api';
import type {
	AgentEvalCase,
	AgentEvalDatasetRecord,
	AgentEvalRatingRecord,
	AgentEvalResultRecord,
	AgentEvalRunRecord,
	AgentEvalRunStatus,
	AgentEvalRunSummary,
	AgentEvalVote,
	GenerateDraftCasesOptions,
} from './agentEvals.types';
import { AGENT_EVAL_RESULTS_DEFAULT_TAKE, MAX_ITEMS_PER_PAGE } from './agentEvals.types';
import { AGENT_EVAL_CASES_PAGE_SIZE } from './constants';
import type { PendingReview, ReviewDraft } from './utils/agent-eval-review';
import { canSaveDraft, readCorrectionText } from './utils/agent-eval-review';
import {
	toAgentEvalCase,
	toAgentEvalCases,
	toDataTableRow,
	type AgentEvalCaseSource,
} from './utils/agentEvalCases.utils';

/** The two fields a case is edited through; the row id identifies which row they land on. */
type AgentEvalCaseValue = Pick<AgentEvalCase, 'input' | 'whatToCheck'> & { type?: string };

/**
 * Per-run review state: the run, a page of its cases, the latest rating on each,
 * and whatever the reviewer is currently typing.
 *
 * Drafts, in-flight votes and persisted ratings are three separate maps rather
 * than one merged record. That is what lets a row distinguish "saved" from "still
 * being typed" — and lets a failed save put the reviewer's words back rather than
 * lose them.
 */
type RunReviewState = {
	run: AgentEvalRunRecord | null;
	/** `runIndex` ascending, appended to by `loadMoreResults`. */
	results: AgentEvalResultRecord[];
	/** Total cases in the run, from the page envelope — not `results.length`. */
	resultsCount: number;
	ratingsByResultId: Record<string, AgentEvalRatingRecord>;
	pendingByResultId: Record<string, PendingReview>;
	draftsByResultId: Record<string, ReviewDraft>;
	/**
	 * Per-status tallies from the summary route, so a run in flight can report how
	 * far it has got. Null until the first poll — the run-detail route doesn't
	 * carry them.
	 */
	counts: AgentEvalRunSummary['counts'] | null;
	loading: boolean;
	loadingMore: boolean;
};

/**
 * How often an in-flight run is re-checked. The summary route is counts-only, so
 * this stays cheap; the interval is a compromise between a live-feeling progress
 * and not hammering the instance for a run that takes minutes.
 */
const RUN_POLL_INTERVAL_MS = 5 * TIME.SECOND;

/** Stop watching a run that never settles, so a forgotten tab can't poll indefinitely. */
const RUN_POLL_TIMEOUT_MS = 10 * TIME.MINUTE;
/** One failed poll is a blip worth retrying; a sustained run of them means we've lost the run. */
const RUN_POLL_MAX_ERRORS = 3;

/** A run in one of these states is still doing work. */
const isPendingStatus = (status: AgentEvalRunStatus | undefined) =>
	status === 'new' || status === 'running';

const emptyRunReview = (): RunReviewState => ({
	run: null,
	results: [],
	resultsCount: 0,
	ratingsByResultId: {},
	pendingByResultId: {},
	draftsByResultId: {},
	counts: null,
	loading: false,
	loadingMore: false,
});

/**
 * Client state for an agent's eval datasets, runs and per-case review.
 */
export const useAgentEvalsStore = defineStore(STORES.AGENT_EVALS, () => {
	const rootStore = useRootStore();
	const dataTableStore = useDataTableStore();

	// Keyed by agentId so switching agents inside the builder can't render the
	// previous agent's datasets.
	const datasetsByAgentId = ref<Record<string, AgentEvalDatasetRecord[]>>({});

	const loadingDatasets = ref<Record<string, boolean>>({});
	const generatingCases = ref<Record<string, boolean>>({});

	// Keyed by runId: a run's cases can never render under a different run.
	const reviewByRunId = ref<Record<string, RunReviewState>>({});

	// The newest run per dataset. Lets the review view find something to show
	// without owning a run list of its own.
	const latestRunIdByDatasetId = ref<Record<string, string | null>>({});
	const startingRunByDatasetId = ref<Record<string, boolean>>({});

	// Tracks the most recently requested run so a response that lands after the
	// user moved on is discarded rather than written into a state nobody reads.
	let latestOpenKey: string | null = null;
	const openKeyFor = (projectId: string, agentId: string, runId: string) =>
		`${projectId}:${agentId}:${runId}`;

	// One watcher at a time: only one run is on screen, and a stale timer writing
	// into a run nobody is looking at is pure waste.
	//
	// A generation counter rather than an on/off flag: a watcher's first read is
	// already in flight when it gets replaced, and a boolean would let that read
	// reschedule itself under the *new* watcher's flag — leaving two timers running.
	let pollTimer: ReturnType<typeof setTimeout> | null = null;
	let pollGeneration = 0;
	/** Wall clock past which the current watch gives up; null when not watching. */
	let pollDeadline: number | null = null;
	let pollConsecutiveErrors = 0;

	// Set when a watch stops without seeing its run settle, so the view can say the
	// progress it is showing is no longer being updated.
	const lostTrackByRunId = ref<Record<string, boolean | undefined>>({});

	// Cases key by datasetId, not agentId: one agent accumulates a dataset per
	// generation, and each has its own rows.
	const casesByDatasetId = ref<Record<string, AgentEvalCase[]>>({});
	// The server's total, which can exceed the page held above — it's what the run
	// button counts, since a run covers every row in the table.
	const casesCountByDatasetId = ref<Record<string, number>>({});
	const loadingCases = ref<Record<string, boolean | undefined>>({});
	// Keyed `datasetId:rowId` so one row saving can't disable its siblings.
	const mutatingCases = ref<Record<string, boolean | undefined>>({});
	const cancellingRunByDatasetId = ref<Record<string, boolean | undefined>>({});
	// A case table's owning project, which the Data Table routes scope on. Keyed by
	// table id because it is a property of the table, not of the agent reading it.
	const tableProjectByDataTableId = ref<Record<string, string | undefined>>({});
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

	const setDatasets = (agentId: string, datasets: AgentEvalDatasetRecord[]) => {
		datasetsByAgentId.value = { ...datasetsByAgentId.value, [agentId]: datasets };
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

	// ---- runs + review ----

	const getReview = (runId: string): RunReviewState =>
		reviewByRunId.value[runId] ?? emptyRunReview();

	const patchReview = (runId: string, patch: Partial<RunReviewState>) => {
		const current = reviewByRunId.value[runId] ?? emptyRunReview();
		reviewByRunId.value = { ...reviewByRunId.value, [runId]: { ...current, ...patch } };
	};

	const getLatestRunId = (datasetId: string) => latestRunIdByDatasetId.value[datasetId];

	const isStartingRun = (datasetId: string) => startingRunByDatasetId.value[datasetId] === true;

	const getCases = (datasetId: string) => casesByDatasetId.value[datasetId] ?? [];

	const getCasesCount = (datasetId: string) => casesCountByDatasetId.value[datasetId] ?? 0;

	/** Absence of an entry is "not read yet", not "no cases" — the two render differently. */
	const areCasesLoaded = (datasetId: string) => casesByDatasetId.value[datasetId] !== undefined;

	const isLoadingCases = (datasetId: string) => loadingCases.value[datasetId] === true;

	const isMutatingCase = (datasetId: string, rowId: number) =>
		mutatingCases.value[`${datasetId}:${rowId}`] === true;

	const isCancellingRun = (datasetId: string) => cancellingRunByDatasetId.value[datasetId] === true;

	/** True when a watch stopped without its run settling — the counts shown are frozen. */
	const hasLostTrackOfRun = (runId: string) => lostTrackByRunId.value[runId] === true;

	const setCases = (datasetId: string, cases: AgentEvalCase[]) => {
		casesByDatasetId.value = { ...casesByDatasetId.value, [datasetId]: cases };
	};

	const setCasesCount = (datasetId: string, count: number) => {
		casesCountByDatasetId.value = { ...casesCountByDatasetId.value, [datasetId]: count };
	};

	const setMutatingCase = (datasetId: string, rowId: number, mutating: boolean) => {
		mutatingCases.value = { ...mutatingCases.value, [`${datasetId}:${rowId}`]: mutating };
	};

	// The Data Table routes scope on the project in the path, which is *the table's*
	// project — not necessarily the agent's. Generation co-locates the two, but a
	// dataset attached through the API may point at a table in another project (the
	// runner resolves that case via `getProjectIdForDataTable`, so such datasets are
	// runnable and must be editable too).
	//
	// Only a resolved answer is cached. Caching the fallback would pin the agent's
	// project for the rest of the session after a single transient failure, so the
	// card's retry would keep re-reading the wrong project and never recover.
	const resolveTableProjectId = async (agentProjectId: string, dataTableId: string) => {
		const cached = tableProjectByDataTableId.value[dataTableId];
		if (cached) return cached;

		// `fetchDataTableById` is the store's existing global point lookup: it does not
		// touch the list state, and it returns null when the user lacks `dataTable:list`
		// rather than firing a request that would be refused.
		const resolved = await dataTableStore
			.fetchDataTableById(dataTableId)
			.then((table) => table?.projectId)
			.catch(() => undefined);

		if (!resolved) return agentProjectId;

		tableProjectByDataTableId.value = {
			...tableProjectByDataTableId.value,
			[dataTableId]: resolved,
		};
		return resolved;
	};

	// Sorted by row id so the numbering the view shows is stable across reads, and
	// read as one page: the page size is the row route's own ceiling.
	const fetchCases = async (projectId: string, source: AgentEvalCaseSource) => {
		loadingCases.value = { ...loadingCases.value, [source.datasetId]: true };
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			const { count, data } = await dataTableStore.fetchDataTableContent(
				source.dataTableId,
				tableProjectId,
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
		const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
		const inserted = await dataTableStore.insertRow(
			source.dataTableId,
			tableProjectId,
			toDataTableRow(value, source.columns),
		);
		setCasesCount(source.datasetId, getCasesCount(source.datasetId) + 1);

		const created = inserted ? toAgentEvalCase(inserted, source.columns) : null;
		if (created) setCases(source.datasetId, [...getCases(source.datasetId), created]);

		return created;
	};

	// Patches in place only once the write is acknowledged. No optimistic update:
	// the route answers with a boolean rather than the row, so a rollback would need
	// a snapshot to restore for a sub-second single-row write.
	const updateCase = async (
		projectId: string,
		source: AgentEvalCaseSource,
		rowId: number,
		value: AgentEvalCaseValue,
	) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			const updated = await dataTableStore.updateRow(
				source.dataTableId,
				tableProjectId,
				rowId,
				toDataTableRow(value, source.columns),
			);
			if (!updated) return false;

			setCases(
				source.datasetId,
				getCases(source.datasetId).map((c) =>
					c.rowId === rowId
						? {
								...c,
								input: value.input,
								whatToCheck: value.whatToCheck,
								// A free-text type is the check's label; the column itself isn't a case field.
								...(value.type !== undefined ? { label: value.type } : {}),
							}
						: c,
				),
			);
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};

	const deleteCase = async (projectId: string, source: AgentEvalCaseSource, rowId: number) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			const deleted = await dataTableStore.deleteRows(source.dataTableId, tableProjectId, [rowId]);
			if (!deleted) return false;

			setCases(
				source.datasetId,
				getCases(source.datasetId).filter((c) => c.rowId !== rowId),
			);
			setCasesCount(source.datasetId, Math.max(0, getCasesCount(source.datasetId) - 1));
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};

	/**
	 * The newest run of a dataset, or `null` when it has never been run. Runs come
	 * back newest-first, so a single-row window is enough.
	 */
	const resolveLatestRunId = async (projectId: string, agentId: string, datasetId: string) => {
		const page = await agentEvalsApi.listRuns(
			rootStore.restApiContext,
			projectId,
			agentId,
			datasetId,
			{ take: 1, skip: 0 },
		);
		const runId = page.data[0]?.id ?? null;
		latestRunIdByDatasetId.value = { ...latestRunIdByDatasetId.value, [datasetId]: runId };
		return runId;
	};

	/**
	 * The window a re-read must cover so it doesn't collapse what the reviewer has
	 * paged in — capped at what the route will actually serve.
	 *
	 * `take` is clamped server-side, not rejected, so asking for more than the cap
	 * quietly returns fewer rows than are already on screen. A run may hold more
	 * cases than one request can carry, so past the cap a re-read is skipped
	 * entirely rather than allowed to truncate the list.
	 */
	const loadedWindow = (runId: string) =>
		Math.max(getReview(runId).results.length, AGENT_EVAL_RESULTS_DEFAULT_TAKE);

	const canRefreshWholeWindow = (runId: string) =>
		getReview(runId).results.length <= MAX_ITEMS_PER_PAGE;

	/**
	 * Refreshed rows, keeping any the reviewer paged in while the read was running.
	 *
	 * Every re-read covers a window captured before it started, so replacing the list
	 * wholesale would silently drop rows appended since — jumping the view back a
	 * page. Splicing by index is sound because a run's cases are seeded once and
	 * always ordered by `runIndex`, so position i is the same case in both lists.
	 */
	const spliceRefreshed = (
		held: AgentEvalResultRecord[],
		refreshed: AgentEvalResultRecord[],
	): AgentEvalResultRecord[] =>
		held.length > refreshed.length ? [...refreshed, ...held.slice(refreshed.length)] : refreshed;

	/**
	 * Reads back a window wider than one request by walking pages.
	 *
	 * `take` is clamped server-side, so a window past the cap cannot be fetched in
	 * one go — and asking anyway silently returns fewer rows than are on screen.
	 * Only used where correctness beats request count (settling a run), never on the
	 * polling path.
	 */
	const readResultsWindow = async (
		projectId: string,
		agentId: string,
		runId: string,
		target: number,
	) => {
		const collected: AgentEvalResultRecord[] = [];
		let run: AgentEvalRunRecord | null = null;
		let total = 0;

		while (collected.length < target) {
			const detail = await agentEvalsApi.getRunDetail(
				rootStore.restApiContext,
				projectId,
				agentId,
				runId,
				{
					take: Math.min(AGENT_EVAL_RESULTS_DEFAULT_TAKE, target - collected.length),
					skip: collected.length,
				},
			);
			const { results, ...rest } = detail;
			run = rest;
			total = results.count;
			if (results.data.length === 0) break;
			collected.push(...results.data);
			if (collected.length >= total) break;
		}

		return { run, results: collected, total };
	};

	/**
	 * The one-off read when a run finishes: every case now has a final status and an
	 * answer, and any rating submitted while it was running needs picking up.
	 *
	 * Results and ratings are refreshed independently, because they fail differently
	 * — the results window can exceed what a single request carries, the ratings
	 * route is unpaginated and always readable in one.
	 */
	const settleRun = async (projectId: string, agentId: string, runId: string) => {
		const target = loadedWindow(runId);
		const [window, ratings] = await Promise.all([
			readResultsWindow(projectId, agentId, runId, target),
			agentEvalsApi.listLatestRatingsForRun(rootStore.restApiContext, projectId, agentId, runId),
		]);

		const current = getReview(runId);
		patchReview(runId, {
			...(window.run ? { run: window.run } : {}),
			results: spliceRefreshed(current.results, window.results),
			resultsCount: window.total,
			ratingsByResultId: mergeRatings(current.ratingsByResultId, ratings),
		});
	};

	/**
	 * Loads a run's cases together with every latest rating in the run. Ratings are
	 * read whole rather than per page: the route returns one row per rated case,
	 * which keeps the reviewed tally right before the user pages.
	 *
	 * `take` defaults to one page, but a re-read of a run already on screen passes
	 * the window the reviewer has open — otherwise settling a run they had paged
	 * through would silently drop them back to the first page.
	 */
	const openRun = async (
		projectId: string,
		agentId: string,
		runId: string,
		take: number = AGENT_EVAL_RESULTS_DEFAULT_TAKE,
	) => {
		const key = openKeyFor(projectId, agentId, runId);
		latestOpenKey = key;
		patchReview(runId, { loading: true });

		try {
			const [detail, ratings] = await Promise.all([
				agentEvalsApi.getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
					take,
					skip: 0,
				}),
				agentEvalsApi.listLatestRatingsForRun(rootStore.restApiContext, projectId, agentId, runId),
			]);
			if (latestOpenKey !== key) return;

			const { results, ...run } = detail;
			const current = getReview(runId);
			// Drafts and in-flight votes are deliberately left alone. Cases settle
			// individually, so a reviewer can be part-way through a reason on a
			// finished case while the run is still going — and the poll re-reads the
			// run the moment it settles. Clearing here would delete what they typed
			// with no warning. A draft that outlives a visit is still their work, and
			// the row already marks it unsaved.
			patchReview(runId, {
				run,
				results: results.data,
				resultsCount: results.count,
				// Newest per case wins — see `mergeRatings`. Neither side can be trusted
				// to be current: a save that landed during this read is missing from it,
				// and a re-vote is represented by the row it replaced.
				ratingsByResultId: mergeRatings(current.ratingsByResultId, ratings),
				loading: false,
			});
		} finally {
			if (latestOpenKey === key) patchReview(runId, { loading: false });
		}
	};

	/** Appends the next page of cases. Ratings are already loaded for the whole run. */
	const loadMoreResults = async (projectId: string, agentId: string, runId: string) => {
		const state = getReview(runId);
		if (state.loadingMore || state.results.length >= state.resultsCount) return;

		patchReview(runId, { loadingMore: true });
		try {
			const detail = await agentEvalsApi.getRunDetail(
				rootStore.restApiContext,
				projectId,
				agentId,
				runId,
				{ take: AGENT_EVAL_RESULTS_DEFAULT_TAKE, skip: state.results.length },
			);
			const current = getReview(runId);
			const seen = new Set(current.results.map((result) => result.id));
			patchReview(runId, {
				results: [...current.results, ...detail.results.data.filter((r) => !seen.has(r.id))],
				resultsCount: detail.results.count,
			});
		} finally {
			patchReview(runId, { loadingMore: false });
		}
	};

	// Explicitly optional: index access alone would claim every case has a draft.
	const getDraft = (runId: string, resultId: string): ReviewDraft | undefined =>
		reviewByRunId.value[runId]?.draftsByResultId[resultId];

	const setDraft = (runId: string, resultId: string, draft: ReviewDraft) => {
		const state = getReview(runId);
		patchReview(runId, {
			draftsByResultId: { ...state.draftsByResultId, [resultId]: draft },
		});
	};

	/** The draft a row starts from: whatever is already persisted on it. */
	const draftFromRating = (rating: AgentEvalRatingRecord | undefined): ReviewDraft => ({
		vote: rating?.vote ?? null,
		comment: rating?.comment ?? '',
		correction: readCorrectionText(rating?.correction ?? null) ?? '',
		panel: 'reason',
	});

	const startingDraft = (runId: string, resultId: string): ReviewDraft =>
		getDraft(runId, resultId) ?? draftFromRating(getReview(runId).ratingsByResultId[resultId]);

	/**
	 * Whether switching this case to agreement would throw away a reason or a rewrite.
	 *
	 * Reads the persisted rating and the draft directly rather than the row's view:
	 * a view is shadowed by any open draft, so a reviewer who had just opened the
	 * note editor would look unrated and lose the note without being asked.
	 */
	const wouldDiscardOnAgreement = (runId: string, resultId: string) => {
		const state = getReview(runId);
		const saved = state.ratingsByResultId[resultId];
		// Checked independently, not chained: `??` treats an empty-string comment as a
		// present value and stops, skipping the correction — so a saved rewrite would
		// be discarded whenever its rating carried `comment: ''`, which the API allows.
		if (saved?.comment?.trim() || readCorrectionText(saved?.correction ?? null)?.trim()) {
			return true;
		}

		const draft = state.draftsByResultId[resultId];
		return Boolean(draft && (draft.comment.trim() || draft.correction.trim()));
	};

	const beginVote = (runId: string, resultId: string, vote: AgentEvalVote) => {
		const draft = startingDraft(runId, resultId);
		if (vote === 'up') {
			// Agreement carries neither a reason nor a rewrite: both exist only because
			// the answer was judged wrong. Clearing them keeps what the row shows equal
			// to what a save would send — a draft holding a note it must not send would
			// mislead on both counts.
			setDraft(runId, resultId, { ...draft, vote, comment: '', correction: '', panel: 'reason' });
			return;
		}
		setDraft(runId, resultId, {
			...draft,
			vote,
			panel: draft.correction ? 'both' : 'reason',
		});
	};

	/**
	 * Opens the answer editor. On a case with no vote yet this selects a
	 * thumbs-down, which in turn requires a reason: an edited answer *is* a
	 * disagreement, and letting the editor stand in for a vote would route around
	 * the one question the review asks. An existing vote is left alone rather than
	 * silently rewritten.
	 */
	const beginAnswerEdit = (runId: string, resultId: string) => {
		const draft = startingDraft(runId, resultId);
		const vote = draft.vote ?? 'down';
		setDraft(runId, resultId, {
			...draft,
			vote,
			panel: vote === 'down' ? 'both' : 'answer',
		});
	};

	/** Reopens the reason on an already-reviewed case. */
	const beginNoteEdit = (runId: string, resultId: string) => {
		const draft = startingDraft(runId, resultId);
		setDraft(runId, resultId, {
			...draft,
			vote: draft.vote ?? 'down',
			panel: draft.correction ? 'both' : 'reason',
		});
	};

	const setDraftComment = (runId: string, resultId: string, comment: string) => {
		setDraft(runId, resultId, { ...startingDraft(runId, resultId), comment });
	};

	const setDraftCorrection = (runId: string, resultId: string, correction: string) => {
		setDraft(runId, resultId, { ...startingDraft(runId, resultId), correction });
	};

	/** Discards the draft. Anything already persisted on the case is untouched. */
	const cancelDraft = (runId: string, resultId: string) => {
		const state = getReview(runId);
		const { [resultId]: _discarded, ...rest } = state.draftsByResultId;
		patchReview(runId, { draftsByResultId: rest });
	};

	/**
	 * Persists a row's draft. The vote moves to `pending` first so the row reads as
	 * saved immediately; a failure restores the draft verbatim and rethrows, since
	 * silently dropping what someone typed is worse than showing them an error.
	 */
	const saveReview = async (
		projectId: string,
		agentId: string,
		runId: string,
		resultId: string,
	) => {
		const draft = getDraft(runId, resultId);
		if (!draft?.vote || !canSaveDraft(draft)) return;

		const correction = draft.correction.trim();
		const comment = draft.comment.trim();
		const pending: PendingReview = {
			vote: draft.vote,
			comment: comment || null,
			correction: correction || null,
		};

		const before = getReview(runId);
		const { [resultId]: _draft, ...remainingDrafts } = before.draftsByResultId;
		patchReview(runId, {
			draftsByResultId: remainingDrafts,
			pendingByResultId: { ...before.pendingByResultId, [resultId]: pending },
		});

		try {
			const record = await agentEvalsApi.rateResult(
				rootStore.restApiContext,
				projectId,
				agentId,
				resultId,
				{
					vote: draft.vote,
					// Omitted rather than sent empty: the API treats absence as "no
					// comment", and a 👍 must never carry one.
					...(comment ? { comment } : {}),
					...(correction ? { correction: { finalText: correction } } : {}),
				},
			);

			const settled = getReview(runId);
			const { [resultId]: _pending, ...remainingPending } = settled.pendingByResultId;
			patchReview(runId, {
				pendingByResultId: remainingPending,
				ratingsByResultId: { ...settled.ratingsByResultId, [resultId]: record },
			});
			return record;
		} catch (error) {
			const failed = getReview(runId);
			const { [resultId]: _pending, ...remainingPending } = failed.pendingByResultId;
			patchReview(runId, {
				pendingByResultId: remainingPending,
				draftsByResultId: { ...failed.draftsByResultId, [resultId]: draft },
			});
			throw error;
		}
	};

	/**
	 * Cases carrying a review, whether persisted or still in flight. The union is
	 * what makes the tally move the moment someone votes, and move back if the save
	 * fails.
	 */
	const reviewedCount = (runId: string) => {
		const state = getReview(runId);
		return new Set([
			...Object.keys(state.ratingsByResultId),
			...Object.keys(state.pendingByResultId),
		]).size;
	};

	/** True while the loaded run still has work to do. */
	const isRunInFlight = (runId: string) => isPendingStatus(getReview(runId).run?.status);

	const stopPollingRun = () => {
		pollGeneration += 1;
		pollDeadline = null;
		pollConsecutiveErrors = 0;
		if (pollTimer !== null) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
	};

	/**
	 * Re-reads the cases without disturbing the review on top of them. Keeps the
	 * window the reviewer has already paged open, so a refresh mid-run can't
	 * collapse it back to the first page.
	 */
	const refreshResults = async (projectId: string, agentId: string, runId: string) => {
		const detail = await agentEvalsApi.getRunDetail(
			rootStore.restApiContext,
			projectId,
			agentId,
			runId,
			{ take: loadedWindow(runId), skip: 0 },
		);
		const { results, ...run } = detail;
		patchReview(runId, {
			run,
			results: spliceRefreshed(getReview(runId).results, results.data),
			resultsCount: results.count,
		});
	};

	/** One check of an in-flight run. Resolves true once the run has settled. */
	const pollRunOnce = async (projectId: string, agentId: string, runId: string) => {
		try {
			const summary = await agentEvalsApi.getRunSummary(
				rootStore.restApiContext,
				projectId,
				agentId,
				runId,
			);
			const current = getReview(runId);
			patchReview(runId, {
				counts: summary.counts,
				...(current.run ? { run: { ...current.run, status: summary.status } } : {}),
			});

			if (!isPendingStatus(summary.status)) {
				// Settled: always re-read. Rows loaded while the run was in flight still
				// carry a queued/running status and no answer, so skipping this would
				// leave them waiting on an agent that has already finished — and any
				// rating submitted during the run would stay missing.
				await settleRun(projectId, agentId, runId);
				return true;
			}

			// Re-read on every tick, not only when a tally moves. The summary folds
			// `new` and `running` into a single `pending`, so a case *starting* changes
			// no count — keying the refresh off the counts would leave every row frozen
			// on whatever status it had when the run began.
			//
			// Skipped on the first tick only, because `openRun` has just read the cases.
			//
			// The cost is a full run-detail read per tick, and each row carries its
			// input/output JSON. That is fine for the handful of cases generation
			// produces; a statuses-only route is what would make it cheap at scale.
			if (current.counts !== null && canRefreshWholeWindow(runId)) {
				await refreshResults(projectId, agentId, runId);
			}

			pollConsecutiveErrors = 0;
		} catch {
			// A dropped poll is not worth surfacing — the next tick retries, and the
			// run is unaffected either way. A sustained run of them is different: the
			// counts on screen have stopped tracking the run, so stop claiming they are
			// live rather than retrying forever.
			pollConsecutiveErrors += 1;
			if (pollConsecutiveErrors >= RUN_POLL_MAX_ERRORS) {
				lostTrackByRunId.value = { ...lostTrackByRunId.value, [runId]: true };
				return true;
			}
		}
		return false;
	};

	// Self-rescheduling rather than an interval, so a slow response can't stack up
	// overlapping requests.
	const schedulePoll = (projectId: string, agentId: string, runId: string, generation: number) => {
		if (generation !== pollGeneration) return;

		pollTimer = setTimeout(async () => {
			pollTimer = null;
			if (generation !== pollGeneration) return;

			// Guards a run that never reports settled — without this a forgotten tab
			// polls for as long as it stays open.
			if (pollDeadline !== null && Date.now() > pollDeadline) {
				lostTrackByRunId.value = { ...lostTrackByRunId.value, [runId]: true };
				stopPollingRun();
				return;
			}

			// A backgrounded tab doesn't need progress; it re-reads when it comes back.
			if (!document.hidden && (await pollRunOnce(projectId, agentId, runId))) {
				stopPollingRun();
				return;
			}

			schedulePoll(projectId, agentId, runId, generation);
		}, RUN_POLL_INTERVAL_MS);
	};

	/**
	 * Watches an in-flight run until it settles, reporting progress as it goes.
	 * Reads once straight away so a freshly started run shows its tallies
	 * immediately rather than after a blank interval.
	 */
	const startPollingRun = (projectId: string, agentId: string, runId: string) => {
		stopPollingRun();
		const generation = pollGeneration;
		pollDeadline = Date.now() + RUN_POLL_TIMEOUT_MS;
		lostTrackByRunId.value = { ...lostTrackByRunId.value, [runId]: false };

		void (async () => {
			const settled = await pollRunOnce(projectId, agentId, runId);
			// Replaced while that read was in flight: the newer watcher owns the timer.
			if (generation !== pollGeneration) return;
			if (settled) stopPollingRun();
			else schedulePoll(projectId, agentId, runId, generation);
		})();
	};

	// Asks the runner to stop. The cases already in flight settle on their own, so
	// polling continues until the summary reports nothing pending — treating the
	// cancel response as the end would strand the tallies mid-count.
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
			patchReview(runId, { run });
			return run;
		} finally {
			cancellingRunByDatasetId.value = { ...cancellingRunByDatasetId.value, [datasetId]: false };
		}
	};

	/** Runs the dataset's cases again against the agent's current config. */
	const startRun = async (
		projectId: string,
		agentId: string,
		datasetId: string,
		options: { rowIds?: string[] } = {},
	) => {
		startingRunByDatasetId.value = { ...startingRunByDatasetId.value, [datasetId]: true };
		try {
			const run = await agentEvalsApi.startRun(
				rootStore.restApiContext,
				projectId,
				agentId,
				datasetId,
				options,
			);
			latestRunIdByDatasetId.value = { ...latestRunIdByDatasetId.value, [datasetId]: run.id };
			return run;
		} finally {
			startingRunByDatasetId.value = { ...startingRunByDatasetId.value, [datasetId]: false };
		}
	};

	return {
		getDatasets,
		isLoaded,
		isLoadingDatasets,
		isGeneratingCases,
		fetchDatasets,
		generateDraftCases,
		getReview,
		getLatestRunId,
		isStartingRun,
		resolveLatestRunId,
		openRun,
		loadMoreResults,
		getDraft,
		beginVote,
		wouldDiscardOnAgreement,
		beginAnswerEdit,
		beginNoteEdit,
		setDraftComment,
		setDraftCorrection,
		cancelDraft,
		saveReview,
		reviewedCount,
		isRunInFlight,
		startPollingRun,
		stopPollingRun,
		hasLostTrackOfRun,
		startRun,
		cancelRun,
		isCancellingRun,
		getCases,
		getCasesCount,
		areCasesLoaded,
		isLoadingCases,
		isMutatingCase,
		fetchCases,
		createCase,
		updateCase,
		deleteCase,
		pendingEvalsFocus,
		requestEvalsFocus,
		consumeEvalsFocus,
		clearEvalsFocus,
	};
});

/**
 * Folds a fetched ratings list over what is already held, newest per case wins.
 *
 * A plain spread in either direction is wrong. `listLatestRatingsForRun` returns
 * the latest rating *as of its own read*, so a vote saved while that read was in
 * flight is either missing from it (letting the fetch win would drop a rating the
 * server holds) or represented by the row it replaced (letting the fetch win would
 * revert the row to the vote the reviewer just changed). Recency is the only
 * ordering that is right in both directions.
 */
const mergeRatings = (
	held: Record<string, AgentEvalRatingRecord>,
	fetched: AgentEvalRatingRecord[],
) => {
	const merged = { ...held };
	for (const rating of fetched) {
		const mine = merged[rating.resultId];
		// Strictly newer, so a tie keeps what is held. Two ratings can share a
		// millisecond, and the server's ordering between them is arbitrary — but a
		// held record is one this client just saved or last read, so preferring it
		// means an in-flight read can never undo the most recent vote.
		if (!mine || ratedAt(rating) > ratedAt(mine)) merged[rating.resultId] = rating;
	}
	return merged;
};

/** Unparseable timestamps sort oldest, so a readable record is always preferred. */
const ratedAt = (rating: AgentEvalRatingRecord) => {
	const ms = Date.parse(rating.createdAt);
	return Number.isNaN(ms) ? -Infinity : ms;
};
