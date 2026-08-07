import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEvalsStore } from '../agentEvals.store';
import type {
	AgentEvalDatasetRecord,
	AgentEvalRatingRecord,
	AgentEvalResultRecord,
	AgentEvalRunRecord,
} from '../agentEvals.types';

const {
	getDatasets,
	generateDraftCases,
	listRuns,
	getRunDetail,
	getRunSummary,
	listLatestRatingsForRun,
	rateResult,
	startRun,
} = vi.hoisted(() => ({
	getDatasets: vi.fn(),
	generateDraftCases: vi.fn(),
	listRuns: vi.fn(),
	getRunDetail: vi.fn(),
	getRunSummary: vi.fn(),
	listLatestRatingsForRun: vi.fn(),
	rateResult: vi.fn(),
	startRun: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets,
	generateDraftCases,
	listRuns,
	getRunDetail,
	getRunSummary,
	listLatestRatingsForRun,
	rateResult,
	startRun,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const DATASET_ID = 'dataset-1';
const RUN_ID = 'run-1';
const REST_CONTEXT = { instanceId: 'test-instance-id' };

const dataset = (id: string, name = `dataset-${id}`): AgentEvalDatasetRecord => ({
	id,
	name,
	description: null,
	agentId: AGENT_ID,
	columnMapping: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'dt-1' },
});

const run = (id: string): AgentEvalRunRecord => ({
	id,
	datasetId: DATASET_ID,
	agentVersionId: null,
	// A run settles as `completed`; only a per-case result is `success`.
	status: 'completed',
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:01:00.000Z',
	metrics: null,
	errorCode: null,
	errorDetails: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:01:00.000Z',
});

const result = (id: string): AgentEvalResultRecord => ({
	id,
	runId: RUN_ID,
	sourceRowId: `row-${id}`,
	runIndex: 0,
	status: 'success',
	input: { input: `request ${id}` },
	output: { finalText: `answer ${id}` },
	toolCalls: null,
	metrics: null,
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:00:30.000Z',
	errorCode: null,
	errorDetails: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:30.000Z',
});

const rating = (
	resultId: string,
	overrides: Partial<AgentEvalRatingRecord> = {},
): AgentEvalRatingRecord => ({
	id: `rating-${resultId}`,
	resultId,
	vote: 'up',
	comment: null,
	correction: null,
	ratedById: 'user-1',
	createdAt: '2026-01-01T00:02:00.000Z',
	updatedAt: '2026-01-01T00:02:00.000Z',
	...overrides,
});

const runDetail = (results: AgentEvalResultRecord[], count: number) => ({
	...run(RUN_ID),
	results: { count, data: results },
});

const mockRun = (options: {
	results: AgentEvalResultRecord[];
	count: number;
	ratings: AgentEvalRatingRecord[];
}) => {
	getRunDetail.mockResolvedValue(runDetail(options.results, options.count));
	listLatestRatingsForRun.mockResolvedValue(options.ratings);
};

describe('useAgentEvalsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('fetchDatasets', () => {
		it('caches datasets under the agent id', async () => {
			getDatasets.mockResolvedValue([dataset('d1')]);
			const store = useAgentEvalsStore();

			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			expect(getDatasets).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
			);
			expect(store.getDatasets(AGENT_ID)).toHaveLength(1);
			// Another agent's cache must stay empty — switching agents in the
			// builder should never surface the previous agent's datasets.
			expect(store.getDatasets('agent-2')).toEqual([]);
		});

		it('distinguishes "not loaded" from "loaded but empty"', async () => {
			getDatasets.mockResolvedValue([]);
			const store = useAgentEvalsStore();

			expect(store.isLoaded(AGENT_ID)).toBe(false);
			await store.fetchDatasets(PROJECT_ID, AGENT_ID);

			expect(store.isLoaded(AGENT_ID)).toBe(true);
			expect(store.getDatasets(AGENT_ID)).toEqual([]);
		});

		it('clears the loading flag when the request rejects', async () => {
			getDatasets.mockRejectedValue(new Error('boom'));
			const store = useAgentEvalsStore();

			await expect(store.fetchDatasets(PROJECT_ID, AGENT_ID)).rejects.toThrow('boom');

			expect(store.isLoadingDatasets(AGENT_ID)).toBe(false);
		});
	});

	describe('generateDraftCases', () => {
		it('re-reads the dataset list once the server has persisted the drafts', async () => {
			generateDraftCases.mockResolvedValue({
				datasetId: 'd1',
				dataTableId: 'dt-1',
				cases: [{ input: 'hi', whatToCheck: 'is polite' }],
			});
			getDatasets.mockResolvedValue([dataset('d1')]);
			const store = useAgentEvalsStore();

			const result = await store.generateDraftCases(PROJECT_ID, AGENT_ID, { count: 3 });

			expect(generateDraftCases).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				{ count: 3 },
			);
			expect(result.cases).toHaveLength(1);
			// The generate response carries drafts, not the dataset row, so the
			// cache has to come from the follow-up read.
			expect(getDatasets).toHaveBeenCalledTimes(1);
			expect(store.getDatasets(AGENT_ID).map((d) => d.id)).toEqual(['d1']);
		});

		it('clears the generating flag when generation rejects', async () => {
			generateDraftCases.mockRejectedValue(new Error('no model'));
			const store = useAgentEvalsStore();

			await expect(store.generateDraftCases(PROJECT_ID, AGENT_ID)).rejects.toThrow('no model');

			expect(store.isGeneratingCases(AGENT_ID)).toBe(false);
		});
	});

	describe('resolveLatestRunId', () => {
		it('reads a single-row window and caches the newest run', async () => {
			listRuns.mockResolvedValue({ count: 3, data: [run('r2')] });
			const store = useAgentEvalsStore();

			await expect(store.resolveLatestRunId(PROJECT_ID, AGENT_ID, DATASET_ID)).resolves.toBe('r2');

			expect(listRuns).toHaveBeenCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, DATASET_ID, {
				take: 1,
				skip: 0,
			});
			expect(store.getLatestRunId(DATASET_ID)).toBe('r2');
		});

		it('caches null when the dataset has never been run', async () => {
			listRuns.mockResolvedValue({ count: 0, data: [] });
			const store = useAgentEvalsStore();

			await expect(store.resolveLatestRunId(PROJECT_ID, AGENT_ID, DATASET_ID)).resolves.toBeNull();

			// Distinct from "not resolved yet", which is undefined.
			expect(store.getLatestRunId(DATASET_ID)).toBeNull();
		});
	});

	describe('openRun', () => {
		it('hydrates cases, the envelope count and ratings keyed by result', async () => {
			mockRun({ results: [result('c1'), result('c2')], count: 7, ratings: [rating('c1')] });
			const store = useAgentEvalsStore();

			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			const review = store.getReview(RUN_ID);

			expect(review.results.map((r) => r.id)).toEqual(['c1', 'c2']);
			// The total comes from the envelope, not the page length.
			expect(review.resultsCount).toBe(7);
			expect(review.ratingsByResultId.c1.vote).toBe('up');
			expect(review.loading).toBe(false);
		});

		it('keeps a second run isolated from the first', async () => {
			mockRun({ results: [result('c1')], count: 1, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			mockRun({ results: [result('c9')], count: 1, ratings: [] });
			await store.openRun(PROJECT_ID, AGENT_ID, 'run-2');

			expect(store.getReview(RUN_ID).results.map((r) => r.id)).toEqual(['c1']);
			expect(store.getReview('run-2').results.map((r) => r.id)).toEqual(['c9']);
		});

		// A rating can belong to a case on a later page; it still has to count.
		it('counts a rating whose case is not on the first page', async () => {
			mockRun({ results: [result('c1')], count: 60, ratings: [rating('c1'), rating('c55')] });
			const store = useAgentEvalsStore();

			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.reviewedCount(RUN_ID)).toBe(2);
		});

		it('discards a response that lands after the target run changed', async () => {
			const store = useAgentEvalsStore();
			mockRun({ results: [result('stale')], count: 1, ratings: [] });
			const slow = store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			mockRun({ results: [result('fresh')], count: 1, ratings: [] });
			await store.openRun(PROJECT_ID, AGENT_ID, 'run-2');
			await slow;

			expect(store.getReview(RUN_ID).results).toEqual([]);
		});

		// Cases settle one at a time, so a reviewer can be part-way through a reason
		// on a finished case while the run is still going — and the poll re-reads the
		// run the moment it settles. Re-reading must not delete what they typed.
		it('keeps a half-typed draft when the run is re-read', async () => {
			mockRun({ results: [result('c1')], count: 1, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			store.beginVote(RUN_ID, 'c1', 'down');
			store.setDraftComment(RUN_ID, 'c1', 'half a thought');

			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({
				vote: 'down',
				comment: 'half a thought',
			});
		});

		it('clears loading when the read rejects', async () => {
			getRunDetail.mockRejectedValue(new Error('boom'));
			listLatestRatingsForRun.mockResolvedValue([]);
			const store = useAgentEvalsStore();

			await expect(store.openRun(PROJECT_ID, AGENT_ID, RUN_ID)).rejects.toThrow('boom');

			expect(store.getReview(RUN_ID).loading).toBe(false);
		});
	});

	describe('loadMoreResults', () => {
		it('pages from the loaded length, appends and refreshes the count', async () => {
			mockRun({ results: [result('c1')], count: 3, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			getRunDetail.mockResolvedValue(runDetail([result('c2')], 3));

			await store.loadMoreResults(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(getRunDetail).toHaveBeenLastCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, RUN_ID, {
				take: 50,
				skip: 1,
			});
			expect(store.getReview(RUN_ID).results.map((r) => r.id)).toEqual(['c1', 'c2']);
			// Ratings cover the whole run already, so paging must not re-read them.
			expect(listLatestRatingsForRun).toHaveBeenCalledTimes(1);
		});

		it('does not duplicate a case the page repeats', async () => {
			mockRun({ results: [result('c1')], count: 2, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			getRunDetail.mockResolvedValue(runDetail([result('c1'), result('c2')], 2));

			await store.loadMoreResults(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.getReview(RUN_ID).results.map((r) => r.id)).toEqual(['c1', 'c2']);
		});

		it('is a no-op once every case is loaded', async () => {
			mockRun({ results: [result('c1')], count: 1, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			getRunDetail.mockClear();

			await store.loadMoreResults(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(getRunDetail).not.toHaveBeenCalled();
		});
	});

	describe('drafts', () => {
		const openWith = async (ratings: AgentEvalRatingRecord[] = []) => {
			mockRun({ results: [result('c1')], count: 1, ratings });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			return store;
		};

		it('opens the reason panel on a thumbs-down', async () => {
			const store = await openWith();

			store.beginVote(RUN_ID, 'c1', 'down');

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({ vote: 'down', panel: 'reason' });
		});

		// Switching to agreement must not carry the reason along with it.
		it('clears a typed reason when the vote flips to thumbs-up', async () => {
			const store = await openWith();
			store.beginVote(RUN_ID, 'c1', 'down');
			store.setDraftComment(RUN_ID, 'c1', 'it was off-task');

			store.beginVote(RUN_ID, 'c1', 'up');

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({ vote: 'up', comment: '' });
		});

		it('seeds a draft from the persisted rating', async () => {
			const store = await openWith([
				rating('c1', {
					vote: 'down',
					comment: 'off-task',
					correction: { finalText: 'the better answer' },
				}),
			]);

			store.beginNoteEdit(RUN_ID, 'c1');

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({
				vote: 'down',
				comment: 'off-task',
				correction: 'the better answer',
			});
		});

		// An edited answer is a disagreement, so it inherits the reason requirement
		// rather than becoming a way around it.
		it('selects a thumbs-down when the answer editor opens on an unrated case', async () => {
			const store = await openWith();

			store.beginAnswerEdit(RUN_ID, 'c1');

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({ vote: 'down', panel: 'both' });
		});

		it('leaves an existing vote alone when the answer editor opens', async () => {
			const store = await openWith([rating('c1', { vote: 'up' })]);

			store.beginAnswerEdit(RUN_ID, 'c1');

			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({ vote: 'up', panel: 'answer' });
		});

		it('discards the draft but keeps the persisted rating', async () => {
			const store = await openWith([rating('c1', { vote: 'up' })]);
			store.beginVote(RUN_ID, 'c1', 'down');

			store.cancelDraft(RUN_ID, 'c1');

			expect(store.getDraft(RUN_ID, 'c1')).toBeUndefined();
			expect(store.getReview(RUN_ID).ratingsByResultId.c1.vote).toBe('up');
		});
	});

	describe('saveReview', () => {
		const openAndDraft = async () => {
			mockRun({ results: [result('c1')], count: 1, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			return store;
		};

		it('posts a thumbs-down with its reason and no correction key', async () => {
			const store = await openAndDraft();
			store.beginVote(RUN_ID, 'c1', 'down');
			store.setDraftComment(RUN_ID, 'c1', 'it was off-task');
			rateResult.mockResolvedValue(rating('c1', { vote: 'down', comment: 'it was off-task' }));

			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			expect(rateResult).toHaveBeenCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, 'c1', {
				vote: 'down',
				comment: 'it was off-task',
			});
		});

		it('posts a thumbs-up with no comment key at all', async () => {
			const store = await openAndDraft();
			store.beginVote(RUN_ID, 'c1', 'up');
			rateResult.mockResolvedValue(rating('c1'));

			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			expect(rateResult).toHaveBeenCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, 'c1', {
				vote: 'up',
			});
		});

		it('sends an edit as correction.finalText', async () => {
			const store = await openAndDraft();
			store.beginAnswerEdit(RUN_ID, 'c1');
			store.setDraftComment(RUN_ID, 'c1', 'answered off-task');
			store.setDraftCorrection(RUN_ID, 'c1', 'Weather is not something I plan.');
			rateResult.mockResolvedValue(rating('c1', { vote: 'down' }));

			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			expect(rateResult).toHaveBeenCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, 'c1', {
				vote: 'down',
				comment: 'answered off-task',
				correction: { finalText: 'Weather is not something I plan.' },
			});
		});

		it('refuses to save a thumbs-down with no reason', async () => {
			const store = await openAndDraft();
			store.beginVote(RUN_ID, 'c1', 'down');

			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			expect(rateResult).not.toHaveBeenCalled();
		});

		it('counts the case as reviewed before the request settles', async () => {
			const store = await openAndDraft();
			store.beginVote(RUN_ID, 'c1', 'up');
			let release: (value: AgentEvalRatingRecord) => void = () => {};
			rateResult.mockReturnValue(
				new Promise<AgentEvalRatingRecord>((resolve) => {
					release = resolve;
				}),
			);

			const saving = store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');
			expect(store.reviewedCount(RUN_ID)).toBe(1);

			release(rating('c1'));
			await saving;

			expect(store.reviewedCount(RUN_ID)).toBe(1);
			expect(store.getReview(RUN_ID).pendingByResultId).toEqual({});
			expect(store.getReview(RUN_ID).ratingsByResultId.c1.id).toBe('rating-c1');
		});

		it('restores the draft verbatim and rethrows when the save fails', async () => {
			const store = await openAndDraft();
			store.beginVote(RUN_ID, 'c1', 'down');
			store.setDraftComment(RUN_ID, 'c1', 'it was off-task');
			store.setDraftCorrection(RUN_ID, 'c1', 'a better answer');
			rateResult.mockRejectedValue(new Error('offline'));

			await expect(store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1')).rejects.toThrow('offline');

			// Nothing the reviewer typed may be lost to a failed request.
			expect(store.getDraft(RUN_ID, 'c1')).toMatchObject({
				vote: 'down',
				comment: 'it was off-task',
				correction: 'a better answer',
			});
			expect(store.reviewedCount(RUN_ID)).toBe(0);
			expect(store.getReview(RUN_ID).pendingByResultId).toEqual({});
		});
	});

	describe('polling an in-flight run', () => {
		const openInFlight = async () => {
			getRunDetail.mockResolvedValue({
				...run(RUN_ID),
				status: 'running',
				results: { count: 1, data: [result('c1')] },
			});
			listLatestRatingsForRun.mockResolvedValue([]);
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			return store;
		};

		const summary = (status: string) => ({
			runId: RUN_ID,
			status,
			counts: { total: 1, success: 0, error: 0, cancelled: 0, pending: 1 },
		});

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('reports a loaded run as in flight only while it is unsettled', async () => {
			const store = await openInFlight();
			expect(store.isRunInFlight(RUN_ID)).toBe(true);

			getRunDetail.mockResolvedValue(runDetail([result('c1')], 1));
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.isRunInFlight(RUN_ID)).toBe(false);
		});

		// Progress has to appear immediately; waiting a full interval on a run the
		// user just started reads as nothing happening.
		it('reads the tallies straight away rather than after an interval', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);

			expect(getRunSummary).toHaveBeenCalledTimes(1);
			expect(store.getReview(RUN_ID).counts).toEqual({
				total: 1,
				success: 0,
				error: 0,
				cancelled: 0,
				pending: 1,
			});
			store.stopPollingRun();
		});

		// Cases land one at a time, so the rows have to be re-read as they do —
		// otherwise they stay frozen as they were when the run started.
		it('re-reads the cases when a case finishes mid-run', async () => {
			const store = await openInFlight();
			const pendingCounts = (pending: number) => ({
				runId: RUN_ID,
				status: 'running',
				counts: { total: 3, success: 3 - pending, error: 0, cancelled: 0, pending },
			});
			getRunSummary.mockResolvedValue(pendingCounts(3));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			const readsAfterFirstTick = getRunDetail.mock.calls.length;

			// Second tick: one fewer case pending than the tick before it.
			getRunSummary.mockResolvedValue(pendingCounts(2));
			await vi.advanceTimersByTimeAsync(5_000);

			expect(getRunDetail.mock.calls.length).toBe(readsAfterFirstTick + 1);
			store.stopPollingRun();
		});

		it('does not re-read the cases when nothing has progressed', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			const readsAfterFirstTick = getRunDetail.mock.calls.length;
			await vi.advanceTimersByTimeAsync(5_000);

			expect(getRunDetail.mock.calls.length).toBe(readsAfterFirstTick);
			store.stopPollingRun();
		});

		it('keeps checking while the run is still running', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);

			// The immediate read plus one per interval.
			expect(getRunSummary).toHaveBeenCalledTimes(3);
			store.stopPollingRun();
		});

		it('re-reads the run once it settles, then stops', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('completed'));
			getRunDetail.mockResolvedValue(runDetail([result('c1')], 1));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(5_000);
			const callsAfterSettle = getRunSummary.mock.calls.length;
			await vi.advanceTimersByTimeAsync(15_000);

			expect(callsAfterSettle).toBe(1);
			// No further polls, and the settled run has been re-read.
			expect(getRunSummary).toHaveBeenCalledTimes(1);
			expect(store.getReview(RUN_ID).run?.status).toBe('completed');
		});

		// Stopping cannot un-send the read already in flight, but it must prevent
		// every one after it.
		it('makes no further checks once stopped', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			const afterImmediate = getRunSummary.mock.calls.length;

			store.stopPollingRun();
			await vi.advanceTimersByTimeAsync(15_000);

			expect(getRunSummary).toHaveBeenCalledTimes(afterImmediate);
		});

		// A dropped poll must not end the watch — the run is still going.
		it('keeps watching after a failed check', async () => {
			const store = await openInFlight();
			getRunSummary.mockRejectedValueOnce(new Error('offline'));
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);

			// The immediate read plus one per interval.
			expect(getRunSummary).toHaveBeenCalledTimes(3);
			store.stopPollingRun();
		});

		it('replaces an existing watcher rather than running two', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			store.startPollingRun(PROJECT_ID, AGENT_ID, 'run-2');
			await vi.advanceTimersByTimeAsync(5_000);

			// Only the surviving watcher keeps polling: the replaced one contributes
			// its immediate read and nothing after it.
			const runIds = getRunSummary.mock.calls.map((c) => c[3]);
			expect(runIds.filter((id) => id === RUN_ID)).toHaveLength(1);
			expect(runIds.filter((id) => id === 'run-2').length).toBeGreaterThan(1);
			store.stopPollingRun();
		});
	});

	describe('startRun', () => {
		it('caches the new run as the dataset latest and clears the flag', async () => {
			startRun.mockResolvedValue(run('r-new'));
			const store = useAgentEvalsStore();

			await store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID);

			expect(store.getLatestRunId(DATASET_ID)).toBe('r-new');
			expect(store.isStartingRun(DATASET_ID)).toBe(false);
		});

		it('clears the flag when the run fails to start', async () => {
			startRun.mockRejectedValue(new Error('at capacity'));
			const store = useAgentEvalsStore();

			await expect(store.startRun(PROJECT_ID, AGENT_ID, DATASET_ID)).rejects.toThrow('at capacity');

			expect(store.isStartingRun(DATASET_ID)).toBe(false);
		});
	});
});
