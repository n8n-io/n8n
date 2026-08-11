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
	AgentEvalRunSummary,
	AgentEvalVote,
	GenerateDraftCasesOptions,
} from './agentEvals.types';
import { AGENT_EVAL_RESULTS_DEFAULT_TAKE, MAX_ITEMS_PER_PAGE } from './agentEvals.types';
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
		} catch {
			// A dropped poll is not worth surfacing — the next tick retries, and the
			// run is unaffected either way.
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

		void (async () => {
			const settled = await pollRunOnce(projectId, agentId, runId);
			// Replaced while that read was in flight: the newer watcher owns the timer.
			if (generation !== pollGeneration) return;
			if (settled) stopPollingRun();
			else schedulePoll(projectId, agentId, runId, generation);
		})();
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
		startRun,
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
