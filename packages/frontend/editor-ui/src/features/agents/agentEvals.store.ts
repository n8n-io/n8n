import { defineStore } from 'pinia';
import { ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import { TIME } from '@/app/constants';

import * as agentEvalsApi from './agentEvals.api';
import type {
	AgentEvalDatasetRecord,
	AgentEvalRatingRecord,
	AgentEvalResultRecord,
	AgentEvalRunRecord,
	AgentEvalRunStatus,
	AgentEvalVote,
	GenerateDraftCasesOptions,
} from './agentEvals.types';
import { AGENT_EVAL_RESULTS_DEFAULT_TAKE } from './agentEvals.types';
import type { PendingReview, ReviewDraft } from './utils/agent-eval-review';
import { canSaveDraft, readCorrectionText } from './utils/agent-eval-review';

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
	loading: boolean;
	loadingMore: boolean;
};

/**
 * How often an in-flight run is re-checked. The summary route is counts-only, so
 * this stays cheap; the interval is a compromise between a live-feeling progress
 * and not hammering the instance for a run that takes minutes.
 */
const RUN_POLL_INTERVAL_MS = 5 * TIME.SECOND;

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
	loading: false,
	loadingMore: false,
});

/**
 * Client state for an agent's eval datasets, runs and per-case review.
 */
export const useAgentEvalsStore = defineStore(STORES.AGENT_EVALS, () => {
	const rootStore = useRootStore();

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
	let pollTimer: ReturnType<typeof setTimeout> | null = null;
	let pollingActive = false;

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
	 * Loads a run's first page of cases together with every latest rating in the
	 * run. Ratings are read whole rather than per page: the route returns one row
	 * per rated case, which keeps the reviewed tally right before the user pages.
	 */
	const openRun = async (projectId: string, agentId: string, runId: string) => {
		const key = openKeyFor(projectId, agentId, runId);
		latestOpenKey = key;
		patchReview(runId, { loading: true });

		try {
			const [detail, ratings] = await Promise.all([
				agentEvalsApi.getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
					take: AGENT_EVAL_RESULTS_DEFAULT_TAKE,
					skip: 0,
				}),
				agentEvalsApi.listLatestRatingsForRun(rootStore.restApiContext, projectId, agentId, runId),
			]);
			if (latestOpenKey !== key) return;

			const { results, ...run } = detail;
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
				ratingsByResultId: indexRatings(ratings),
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

	const beginVote = (runId: string, resultId: string, vote: AgentEvalVote) => {
		const draft = startingDraft(runId, resultId);
		if (vote === 'up') {
			// Agreement never carries a reason, so the field is cleared rather than
			// left to travel with a vote that must not send it.
			setDraft(runId, resultId, {
				...draft,
				vote,
				comment: '',
				panel: draft.correction ? 'answer' : 'reason',
			});
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
		pollingActive = false;
		if (pollTimer !== null) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
	};

	// Self-rescheduling rather than an interval, so a slow response can't stack up
	// overlapping requests.
	const schedulePoll = (projectId: string, agentId: string, runId: string) => {
		if (!pollingActive) return;

		pollTimer = setTimeout(async () => {
			pollTimer = null;
			if (!pollingActive) return;

			// A backgrounded tab doesn't need progress; it re-reads when it comes back.
			if (!document.hidden) {
				try {
					const summary = await agentEvalsApi.getRunSummary(
						rootStore.restApiContext,
						projectId,
						agentId,
						runId,
					);
					const current = getReview(runId);
					if (current.run) {
						patchReview(runId, { run: { ...current.run, status: summary.status } });
					}

					if (!isPendingStatus(summary.status)) {
						stopPollingRun();
						// Settled: re-read so the cases and their answers replace the
						// placeholder rows the run started with.
						await openRun(projectId, agentId, runId);
						return;
					}
				} catch {
					// A dropped poll is not worth surfacing — the next tick retries, and
					// the run is unaffected either way.
				}
			}

			schedulePoll(projectId, agentId, runId);
		}, RUN_POLL_INTERVAL_MS);
	};

	/** Watches an in-flight run until it settles, then reloads it once. */
	const startPollingRun = (projectId: string, agentId: string, runId: string) => {
		stopPollingRun();
		pollingActive = true;
		schedulePoll(projectId, agentId, runId);
	};

	/** Runs the dataset's cases again against the agent's current config. */
	const startRun = async (projectId: string, agentId: string, datasetId: string) => {
		startingRunByDatasetId.value = { ...startingRunByDatasetId.value, [datasetId]: true };
		try {
			const run = await agentEvalsApi.startRun(
				rootStore.restApiContext,
				projectId,
				agentId,
				datasetId,
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
		startRun,
	};
});

const indexRatings = (ratings: AgentEvalRatingRecord[]) =>
	ratings.reduce<Record<string, AgentEvalRatingRecord>>((acc, rating) => {
		acc[rating.resultId] = rating;
		return acc;
	}, {});
