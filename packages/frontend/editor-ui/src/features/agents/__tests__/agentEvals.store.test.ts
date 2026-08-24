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

		// A vote saved while this read is in flight is absent from the response it
		// returns; replacing the map would make a rating the server already holds
		// vanish from the list.
		it('keeps a locally saved rating the ratings response has not caught up with', async () => {
			mockRun({ results: [result('c1'), result('c2')], count: 2, ratings: [] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			store.beginVote(RUN_ID, 'c1', 'up');
			rateResult.mockResolvedValue(rating('c1'));
			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			// The run settles; the ratings route still hasn't returned c1's rating.
			mockRun({ results: [result('c1'), result('c2')], count: 2, ratings: [] });
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.getReview(RUN_ID).ratingsByResultId.c1).toBeDefined();
			expect(store.reviewedCount(RUN_ID)).toBe(1);
		});

		// The ratings route returns the latest rating as of *its own* read, which can
		// predate a re-vote saved while it was in flight. Letting it win would revert
		// the row to the vote the reviewer just replaced.
		it('keeps a newer local rating when the fetched one is the row it replaced', async () => {
			const older = rating('c1', {
				id: 'r-old',
				vote: 'down',
				comment: 'was wrong',
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			mockRun({ results: [result('c1')], count: 1, ratings: [older] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			// Reviewer changes their mind; the save lands first.
			store.beginVote(RUN_ID, 'c1', 'up');
			rateResult.mockResolvedValue(
				rating('c1', { id: 'r-new', vote: 'up', createdAt: '2026-01-01T00:05:00.000Z' }),
			);
			await store.saveReview(PROJECT_ID, AGENT_ID, RUN_ID, 'c1');

			// A re-read still carrying the superseded rating must not undo that.
			mockRun({ results: [result('c1')], count: 1, ratings: [older] });
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.getReview(RUN_ID).ratingsByResultId.c1).toMatchObject({
				id: 'r-new',
				vote: 'up',
			});
		});

		it('accepts a fetched rating that is newer than the one held', async () => {
			mockRun({
				results: [result('c1')],
				count: 1,
				ratings: [rating('c1', { id: 'r-old', vote: 'up', createdAt: '2026-01-01T00:00:00.000Z' })],
			});
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			// Someone else re-rated the case in the meantime.
			mockRun({
				results: [result('c1')],
				count: 1,
				ratings: [
					rating('c1', {
						id: 'r-newer',
						vote: 'down',
						comment: 'no',
						createdAt: '2026-01-01T01:00:00.000Z',
					}),
				],
			});
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			expect(store.getReview(RUN_ID).ratingsByResultId.c1).toMatchObject({ id: 'r-newer' });
		});

		// Settling a run the reviewer had paged through must not drop them back to
		// the first page.
		it('re-reads over the window already paged in, not just the first page', async () => {
			mockRun({
				results: Array.from({ length: 50 }, (_, i) => result(`c${i}`)),
				count: 120,
				ratings: [],
			});
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);

			getRunDetail.mockResolvedValue(
				runDetail(
					Array.from({ length: 100 }, (_, i) => result(`c${i}`)),
					120,
				),
			);
			await store.loadMoreResults(PROJECT_ID, AGENT_ID, RUN_ID);
			expect(store.getReview(RUN_ID).results).toHaveLength(100);

			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID, 100);

			expect(getRunDetail).toHaveBeenLastCalledWith(REST_CONTEXT, PROJECT_ID, AGENT_ID, RUN_ID, {
				take: 100,
				skip: 0,
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

	describe('wouldDiscardOnAgreement', () => {
		const openWithRating = async (overrides: Partial<AgentEvalRatingRecord>) => {
			mockRun({ results: [result('c1')], count: 1, ratings: [rating('c1', overrides)] });
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			return store;
		};

		it('is false for a bare vote with nothing attached', async () => {
			const store = await openWithRating({ vote: 'up' });

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(false);
		});

		it('is true when a note would be lost', async () => {
			const store = await openWithRating({ vote: 'down', comment: 'off-task' });

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(true);
		});

		it('is true when a rewrite would be lost', async () => {
			const store = await openWithRating({ vote: 'down', correction: { finalText: 'better' } });

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(true);
		});

		// The API accepts `comment: ''`, and chaining the two checks with `??` treated
		// that as a present value — skipping the correction and discarding the rewrite.
		it('still protects a rewrite when the stored note is an empty string', async () => {
			const store = await openWithRating({
				vote: 'down',
				comment: '',
				correction: { finalText: 'better' },
			});

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(true);
		});

		it('ignores whitespace-only stored text', async () => {
			const store = await openWithRating({ vote: 'down', comment: '   ' });

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(false);
		});

		it('protects text the reviewer has typed but not saved', async () => {
			const store = await openWithRating({ vote: 'up' });
			store.beginVote(RUN_ID, 'c1', 'down');
			store.setDraftComment(RUN_ID, 'c1', 'half a thought');

			expect(store.wouldDiscardOnAgreement(RUN_ID, 'c1')).toBe(true);
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
		// A case going queued -> running moves no tally, because the summary folds
		// both into `pending`. Refreshing only on a count change would leave every
		// row frozen on the status it had when the run started.
		it('re-reads the cases every tick, even when no tally has moved', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			const readsAfterFirstTick = getRunDetail.mock.calls.length;

			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);

			expect(getRunDetail.mock.calls.length).toBe(readsAfterFirstTick + 2);
			store.stopPollingRun();
		});

		// A dropped poll is a blip worth retrying, but a sustained run of them means the
		// counts on screen have stopped tracking the run — say so rather than retry
		// forever while looking live.
		it('gives up and reports lost track after a sustained run of failed polls', async () => {
			const store = await openInFlight();
			getRunSummary.mockRejectedValue(new Error('offline'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			expect(store.hasLostTrackOfRun(RUN_ID)).toBe(false);

			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);

			expect(store.hasLostTrackOfRun(RUN_ID)).toBe(true);

			// Given up means given up — no further reads.
			const reads = getRunSummary.mock.calls.length;
			await vi.advanceTimersByTimeAsync(30_000);
			expect(getRunSummary.mock.calls.length).toBe(reads);
		});

		it('recovers its error budget when a poll succeeds again', async () => {
			const store = await openInFlight();
			getRunSummary
				.mockRejectedValueOnce(new Error('offline'))
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);
			await vi.advanceTimersByTimeAsync(5_000);

			expect(store.hasLostTrackOfRun(RUN_ID)).toBe(false);
			store.stopPollingRun();
		});

		// Without a deadline a forgotten tab polls a wedged run for as long as it is open.
		it('gives up on a run that never settles', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(10 * 60_000 + 5_000);

			expect(store.hasLostTrackOfRun(RUN_ID)).toBe(true);

			const reads = getRunSummary.mock.calls.length;
			await vi.advanceTimersByTimeAsync(30_000);
			expect(getRunSummary.mock.calls.length).toBe(reads);
		});

		// `openRun` has just read them, so the first tick has nothing to refresh.
		it('does not re-read the cases on the very first tick', async () => {
			const store = await openInFlight();
			getRunSummary.mockResolvedValue(summary('running'));
			const readsBeforePolling = getRunDetail.mock.calls.length;

			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);

			expect(getRunDetail.mock.calls.length).toBe(readsBeforePolling);
			store.stopPollingRun();
		});

		// `take` is clamped server-side rather than rejected, so a re-read past the cap
		// returns fewer rows than are already on screen. Skipping beats truncating.
		it('skips the refresh once more rows are loaded than one read can carry', async () => {
			getRunDetail.mockResolvedValue(
				runDetail(
					Array.from({ length: 251 }, (_, i) => result(`c${i}`)),
					400,
				),
			);
			listLatestRatingsForRun.mockResolvedValue([]);
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID, 251);
			expect(store.getReview(RUN_ID).results).toHaveLength(251);

			getRunSummary.mockResolvedValue(summary('running'));
			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			const reads = getRunDetail.mock.calls.length;
			await vi.advanceTimersByTimeAsync(5_000);

			expect(getRunDetail.mock.calls.length).toBe(reads);
			expect(store.getReview(RUN_ID).results).toHaveLength(251);
			store.stopPollingRun();
		});

		// A re-read covers the window it captured before starting, so rows the reviewer
		// pages in meanwhile sit beyond it — replacing the list would jump them back.
		it('keeps cases paged in while the settle read was walking pages', async () => {
			const all = Array.from({ length: 120 }, (_, i) => result(`c${i}`));
			getRunDetail.mockImplementation(
				async (
					_ctx: unknown,
					_p: string,
					_a: string,
					_r: string,
					q: { take: number; skip: number },
				) => ({
					...run(RUN_ID),
					results: { count: all.length, data: all.slice(q.skip, q.skip + q.take) },
				}),
			);
			listLatestRatingsForRun.mockResolvedValue([]);
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID);
			expect(store.getReview(RUN_ID).results).toHaveLength(50);

			getRunSummary.mockResolvedValue({
				runId: RUN_ID,
				status: 'completed',
				counts: { total: 120, success: 120, error: 0, cancelled: 0, pending: 0 },
			});

			// Settle and a page-in race each other; both must be reflected.
			const settling = store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await store.loadMoreResults(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);
			void settling;

			expect(store.getReview(RUN_ID).results).toHaveLength(100);
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

		// The settle reload goes through `openRun`, which defaults to one page — so
		// without the preserved window a reviewer who had paged through a long run
		// would be yanked back to the first 50 the moment it finished.
		it('settles over the window the reviewer had paged in', async () => {
			// Honours take/skip so paging is observable — a mock returning every row
			// regardless would make a single unpaged read look correct.
			const all = Array.from({ length: 60 }, (_, i) => result(`c${i}`));
			getRunDetail.mockImplementation(
				async (
					_ctx: unknown,
					_p: string,
					_a: string,
					_r: string,
					q: { take: number; skip: number },
				) => ({
					...run(RUN_ID),
					results: { count: all.length, data: all.slice(q.skip, q.skip + q.take) },
				}),
			);
			listLatestRatingsForRun.mockResolvedValue([]);
			const store = useAgentEvalsStore();
			await store.openRun(PROJECT_ID, AGENT_ID, RUN_ID, 60);
			expect(store.getReview(RUN_ID).results).toHaveLength(60);

			getRunSummary.mockResolvedValue({
				runId: RUN_ID,
				status: 'completed',
				counts: { total: 60, success: 60, error: 0, cancelled: 0, pending: 0 },
			});
			store.startPollingRun(PROJECT_ID, AGENT_ID, RUN_ID);
			await vi.advanceTimersByTimeAsync(0);

			// Paged, because a 60-row window can't be asked for in one clamped request:
			// 50 from the top, then the remaining 10.
			const windows = getRunDetail.mock.calls.slice(-2).map((c) => c[4]);
			expect(windows).toEqual([
				{ take: 50, skip: 0 },
				{ take: 10, skip: 50 },
			]);
			expect(store.getReview(RUN_ID).results).toHaveLength(60);
			store.stopPollingRun();
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

	describe('evals focus request', () => {
		it('has no request pending by default', () => {
			const store = useAgentEvalsStore();

			expect(store.pendingEvalsFocus).toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
		});

		it('survives until consumed, so a builder mounting later still sees it', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
			expect(store.consumeEvalsFocus(AGENT_ID)).toEqual({ agentId: AGENT_ID, generate: true });
		});

		it('is claimed once, so a second builder cannot re-run generation', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.consumeEvalsFocus(AGENT_ID)).not.toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
			expect(store.pendingEvalsFocus).toBeNull();
		});

		it('is left alone by a builder rendering a different agent', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID, true);

			expect(store.consumeEvalsFocus('other-agent')).toBeNull();
			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
		});

		it('defaults to focusing without generating', () => {
			const store = useAgentEvalsStore();

			store.requestEvalsFocus(AGENT_ID);

			expect(store.consumeEvalsFocus(AGENT_ID)).toEqual({ agentId: AGENT_ID, generate: false });
		});

		it('drops an abandoned request so it cannot fire in an unrelated context later', () => {
			const store = useAgentEvalsStore();
			store.requestEvalsFocus(AGENT_ID, true);

			store.clearEvalsFocus(AGENT_ID);

			expect(store.pendingEvalsFocus).toBeNull();
			expect(store.consumeEvalsFocus(AGENT_ID)).toBeNull();
		});

		it('leaves a request another surface raised for a different agent', () => {
			const store = useAgentEvalsStore();
			store.requestEvalsFocus(AGENT_ID, true);

			store.clearEvalsFocus('other-agent');

			expect(store.pendingEvalsFocus).toEqual({ agentId: AGENT_ID, generate: true });
		});
	});
});
