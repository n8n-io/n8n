import type {
	WorkflowReviewStatus,
	WorkflowReviewRequestForWorkflow,
	WorkflowReviewRequestList,
	WorkflowReviewStatusesResponse,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';

import {
	fetchWorkflowReviewRequests,
	fetchWorkflowReviewStatuses,
} from '@/features/workflow-reviews/workflowReviews.api';
import { useWorkflowReviewStatusStore } from './reviewStatus.store';

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	fetchWorkflowReviewRequests: vi.fn(),
	fetchWorkflowReviewStatuses: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWorkflowReviewRequests);
const fetchStatusesMock = vi.mocked(fetchWorkflowReviewStatuses);

const review = (
	overrides: Partial<WorkflowReviewRequestForWorkflow> = {},
): WorkflowReviewRequestForWorkflow => ({
	id: 'req-1',
	state: 'open',
	decision: 'pending',
	workflowVersionId: 'ver-1',
	description: null,
	createdAt: '2026-07-20T10:00:00.000Z',
	updatedAt: '2026-07-20T10:00:00.000Z',
	decisionBy: null,
	viewerCanOpen: false,
	...overrides,
});

const openReview = review();

const listOf = (...data: WorkflowReviewRequestForWorkflow[]): WorkflowReviewRequestList => ({
	count: data.length,
	data,
});

describe('reviewStatus.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	it('defaults to no open review before any fetch', () => {
		const store = useWorkflowReviewStatusStore();

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewRequest('workflow-1')).toBeNull();
	});

	it('requests the latest review of any state, once', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf(openReview));

		await store.fetchStatus('workflow-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), {
			workflowId: 'workflow-1',
			take: 1,
		});
		expect(store.latestReviewRequest('workflow-1')).toEqual(openReview);
		expect(store.hasOpenReview('workflow-1')).toBe(true);
		expect(store.openReviewRequest('workflow-1')).toEqual(openReview);
	});

	it('treats a latest changes-requested review as open', async () => {
		const store = useWorkflowReviewStatusStore();
		const changesRequested = review({
			decision: 'changes_requested',
			decisionBy: {
				id: 'user-2',
				email: 'reviewer@example.com',
				firstName: 'Rey',
				lastName: 'Viewer',
			},
		});
		fetchMock.mockResolvedValue(listOf(changesRequested));

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(true);
		expect(store.openReviewRequest('workflow-1')).toEqual(changesRequested);
	});

	it('does not treat a latest approved review as open, but keeps it as the latest', async () => {
		const store = useWorkflowReviewStatusStore();
		const approved = review({ state: 'closed', decision: 'approved' });
		fetchMock.mockResolvedValue(listOf(approved));

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewRequest('workflow-1')).toBeNull();
		expect(store.latestReviewRequest('workflow-1')).toEqual(approved);
	});

	it('does not treat a latest closed review without approval as open', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf(review({ state: 'closed', decision: 'pending' })));

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewRequest('workflow-1')).toBeNull();
	});

	it('adopts a freshly created review with the derived fields cleared', () => {
		const store = useWorkflowReviewStatusStore();

		store.setOpenReview('workflow-1', {
			id: 'req-9',
			state: 'open',
			decision: 'pending',
			workflowVersionId: 'ver-9',
			createdAt: '2026-07-20T10:00:00.000Z',
			updatedAt: '2026-07-20T10:00:00.000Z',
		});

		expect(store.latestReviewRequest('workflow-1')).toEqual(
			review({
				id: 'req-9',
				workflowVersionId: 'ver-9',
				// The caller just opened this review, so they may open it too
				viewerCanOpen: true,
			}),
		);
		expect(store.hasOpenReview('workflow-1')).toBe(true);
	});

	// R1 (P2): the mutation response has no description, so the creating dialog
	// supplies what it submitted — see LIGO-979_review.md.
	it('keeps the description the caller submitted with a freshly created review', () => {
		const store = useWorkflowReviewStatusStore();

		store.setOpenReview(
			'workflow-1',
			{
				id: 'req-9',
				state: 'open',
				decision: 'pending',
				workflowVersionId: 'ver-9',
				createdAt: '2026-07-20T10:00:00.000Z',
				updatedAt: '2026-07-20T10:00:00.000Z',
			},
			'Please review the retry logic',
		);

		expect(store.latestReviewRequest('workflow-1')?.description).toBe(
			'Please review the retry logic',
		);
	});

	it('stores null when the API returns no review', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf());

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).toHaveProperty('workflow-1', null);
	});

	it('discards an out-of-order response resolving after a newer one', async () => {
		const store = useWorkflowReviewStatusStore();

		let resolveFirst!: (value: WorkflowReviewRequestList) => void;
		fetchMock.mockReturnValueOnce(
			new Promise<WorkflowReviewRequestList>((resolve) => {
				resolveFirst = resolve;
			}),
		);
		const firstFetch = store.fetchStatus('workflow-1');

		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');
		expect(store.hasOpenReview('workflow-1')).toBe(true);

		// The stale first response resolves last and must be dropped.
		resolveFirst(listOf());
		await firstFetch;

		expect(store.hasOpenReview('workflow-1')).toBe(true);
	});

	it('discards an older successful response even when a newer request failed transiently', async () => {
		const store = useWorkflowReviewStatusStore();

		let resolveFirst!: (value: WorkflowReviewRequestList) => void;
		fetchMock.mockReturnValueOnce(
			new Promise<WorkflowReviewRequestList>((resolve) => {
				resolveFirst = resolve;
			}),
		);
		const firstFetch = store.fetchStatus('workflow-1');

		fetchMock.mockRejectedValueOnce(new Error('network down'));
		await store.fetchStatus('workflow-1');
		expect(store.hasOpenReview('workflow-1')).toBe(false);

		// Latest-wins: only the most recent fetch may write, so the older
		// success is dropped and the status stays unknown until the next sync.
		resolveFirst(listOf(openReview));
		await firstFetch;

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
	});

	it('does not let an older success overwrite a newer 404 that cleared the status', async () => {
		const store = useWorkflowReviewStatusStore();

		let resolveFirst!: (value: WorkflowReviewRequestList) => void;
		fetchMock.mockReturnValueOnce(
			new Promise<WorkflowReviewRequestList>((resolve) => {
				resolveFirst = resolve;
			}),
		);
		const firstFetch = store.fetchStatus('workflow-1');

		fetchMock.mockRejectedValueOnce(new ResponseError('gone', { httpStatusCode: 404 }));
		await store.fetchStatus('workflow-1');
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');

		resolveFirst(listOf(openReview));
		await firstFetch;

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
	});

	it.each([404, 403])('clears the stored status on %i', async (httpStatusCode) => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');
		expect(store.hasOpenReview('workflow-1')).toBe(true);

		fetchMock.mockRejectedValueOnce(new ResponseError('gone', { httpStatusCode }));
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
	});

	it('keeps the last known status on a transient error', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');

		fetchMock.mockRejectedValueOnce(new Error('network down'));
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(true);
	});

	it('keys statuses per workflow', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(true);
		expect(store.hasOpenReview('workflow-2')).toBe(false);
	});

	it('a later fetch with no open review clears a previously stored entry', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');

		fetchMock.mockResolvedValueOnce(listOf());
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).toHaveProperty('workflow-1', null);
	});

	describe('card statuses', () => {
		const cardStatus = (
			overrides: Partial<WorkflowReviewStatus['summary']> = {},
			viewerCanOpen = false,
		): WorkflowReviewStatus => ({
			summary: {
				id: 'req-1',
				state: 'open',
				decision: 'pending',
				workflowVersionId: 'ver-1',
				createdAt: '2026-07-20T10:00:00.000Z',
				updatedAt: '2026-07-20T10:00:00.000Z',
				...overrides,
			},
			viewerCanOpen,
		});

		const responseOf = (
			data: WorkflowReviewStatusesResponse['data'],
		): WorkflowReviewStatusesResponse => ({ data });

		it('fetches one batch and stores each result, null included', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValue(
				responseOf({ 'workflow-1': cardStatus({}, true), 'workflow-2': null }),
			);

			await store.fetchReviewStatuses(['workflow-1', 'workflow-2']);

			expect(fetchStatusesMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), [
				'workflow-1',
				'workflow-2',
			]);
			expect(store.reviewStatus('workflow-1')).toEqual(cardStatus({}, true));
			expect(store.reviewStatus('workflow-2')).toBeNull();
		});

		it('does not call the API for an empty batch', async () => {
			const store = useWorkflowReviewStatusStore();

			await store.fetchReviewStatuses([]);

			expect(fetchStatusesMock).not.toHaveBeenCalled();
		});

		it('deduplicates the requested ids', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValue(responseOf({ 'workflow-1': null }));

			await store.fetchReviewStatuses(['workflow-1', 'workflow-1']);

			expect(fetchStatusesMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), ['workflow-1']);
		});

		it('reports no open review for a requested id the response omitted', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValue(responseOf({ 'workflow-1': cardStatus() }));

			await store.fetchReviewStatuses(['workflow-1', 'workflow-2']);

			expect(store.reviewStatus('workflow-2')).toBeNull();
		});

		it('keeps the previous status visible while a refresh is in flight — no flicker', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValueOnce(responseOf({ 'workflow-1': cardStatus() }));
			await store.fetchReviewStatuses(['workflow-1']);

			let resolveSecond!: (value: WorkflowReviewStatusesResponse) => void;
			fetchStatusesMock.mockReturnValueOnce(
				new Promise<WorkflowReviewStatusesResponse>((resolve) => {
					resolveSecond = resolve;
				}),
			);
			const secondFetch = store.fetchReviewStatuses(['workflow-1']);

			// Mid-flight, the old value is still there.
			expect(store.reviewStatus('workflow-1')).toEqual(cardStatus());

			resolveSecond(responseOf({ 'workflow-1': null }));
			await secondFetch;
			expect(store.reviewStatus('workflow-1')).toBeNull();
		});

		it('clears the requested ids to no open review on failure, silently', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValueOnce(responseOf({ 'workflow-1': cardStatus() }));
			await store.fetchReviewStatuses(['workflow-1']);

			fetchStatusesMock.mockRejectedValueOnce(new ResponseError('gone', { httpStatusCode: 403 }));
			await store.fetchReviewStatuses(['workflow-1']);

			expect(store.reviewStatus('workflow-1')).toBeNull();
		});

		it('keeps the last known status when the batch fails transiently', async () => {
			const store = useWorkflowReviewStatusStore();
			const status = cardStatus();
			fetchStatusesMock.mockResolvedValueOnce(responseOf({ 'workflow-1': status }));
			await store.fetchReviewStatuses(['workflow-1']);

			fetchStatusesMock.mockRejectedValueOnce(new Error('network down'));
			await store.fetchReviewStatuses(['workflow-1']);

			expect(store.reviewStatus('workflow-1')).toEqual(status);
		});

		it('clears cached statuses on reset, so a new session starts empty', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValue(responseOf({ 'workflow-1': cardStatus() }));
			await store.fetchReviewStatuses(['workflow-1']);
			expect(store.reviewStatus('workflow-1')).not.toBeNull();

			store.reset();

			expect(store.reviewStatus('workflow-1')).toBeNull();
		});

		it('drops a response still in flight when reset happens, so it cannot write after logout', async () => {
			const store = useWorkflowReviewStatusStore();

			let resolveInFlight!: (value: WorkflowReviewStatusesResponse) => void;
			fetchStatusesMock.mockReturnValueOnce(
				new Promise<WorkflowReviewStatusesResponse>((resolve) => {
					resolveInFlight = resolve;
				}),
			);
			const inFlight = store.fetchReviewStatuses(['workflow-1']);

			store.reset();

			// The previous session's response lands after the reset and must be ignored.
			resolveInFlight(responseOf({ 'workflow-1': cardStatus() }));
			await inFlight;

			expect(store.reviewStatus('workflow-1')).toBeNull();
		});

		it('drops an out-of-order response so an older batch cannot restore stale status', async () => {
			const store = useWorkflowReviewStatusStore();

			let resolveFirst!: (value: WorkflowReviewStatusesResponse) => void;
			fetchStatusesMock.mockReturnValueOnce(
				new Promise<WorkflowReviewStatusesResponse>((resolve) => {
					resolveFirst = resolve;
				}),
			);
			const firstFetch = store.fetchReviewStatuses(['workflow-1']);

			fetchStatusesMock.mockResolvedValueOnce(responseOf({ 'workflow-1': null }));
			await store.fetchReviewStatuses(['workflow-1']);

			resolveFirst(responseOf({ 'workflow-1': cardStatus() }));
			await firstFetch;

			expect(store.reviewStatus('workflow-1')).toBeNull();
		});

		it('lets overlapping batches each write the workflows the other did not touch', async () => {
			const store = useWorkflowReviewStatusStore();

			let resolveFirst!: (value: WorkflowReviewStatusesResponse) => void;
			fetchStatusesMock.mockReturnValueOnce(
				new Promise<WorkflowReviewStatusesResponse>((resolve) => {
					resolveFirst = resolve;
				}),
			);
			const firstFetch = store.fetchReviewStatuses(['workflow-1', 'workflow-2']);

			// A newer batch covering only workflow-2 supersedes the first one there.
			fetchStatusesMock.mockResolvedValueOnce(responseOf({ 'workflow-2': cardStatus() }));
			await store.fetchReviewStatuses(['workflow-2']);

			resolveFirst(responseOf({ 'workflow-1': cardStatus({}, true), 'workflow-2': null }));
			await firstFetch;

			// workflow-1 was only requested by the first batch, so its result lands...
			expect(store.reviewStatus('workflow-1')).toEqual(cardStatus({}, true));
			// ...while workflow-2 keeps the newer batch's value.
			expect(store.reviewStatus('workflow-2')).toEqual(cardStatus());
		});

		it('keeps card statuses apart from the editor status', async () => {
			const store = useWorkflowReviewStatusStore();
			fetchStatusesMock.mockResolvedValue(responseOf({ 'workflow-1': cardStatus() }));

			await store.fetchReviewStatuses(['workflow-1']);

			expect(store.latestReviewRequest('workflow-1')).toBeNull();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});
