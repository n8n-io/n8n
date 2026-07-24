import type { WorkflowReviewRequestList, WorkflowReviewRequestSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';

import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';
import { useWorkflowReviewStatusStore } from './reviewStatus.store';

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	fetchWorkflowReviewRequests: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWorkflowReviewRequests);

const openReview: WorkflowReviewRequestSummary = {
	id: 'req-1',
	state: 'open',
	decision: 'pending',
	createdAt: '2026-07-20T10:00:00.000Z',
	updatedAt: '2026-07-20T10:00:00.000Z',
};

const listOf = (...data: WorkflowReviewRequestSummary[]): WorkflowReviewRequestList => ({
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

	it('stores the open review returned by the API', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf(openReview));

		await store.fetchStatus('workflow-1');

		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), {
			workflowId: 'workflow-1',
			state: 'open',
			take: 1,
		});
		expect(store.hasOpenReview('workflow-1')).toBe(true);
		expect(store.openReviewRequest('workflow-1')).toEqual(openReview);
	});

	it('stores null when the API returns no open review', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf());

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewByWorkflowId).toHaveProperty('workflow-1', null);
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
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
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
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');

		resolveFirst(listOf(openReview));
		await firstFetch;

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
	});

	it.each([404, 403])('clears the stored status on %i', async (httpStatusCode) => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');
		expect(store.hasOpenReview('workflow-1')).toBe(true);

		fetchMock.mockRejectedValueOnce(new ResponseError('gone', { httpStatusCode }));
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
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

	it('clearStatus removes the stored entry', async () => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');

		store.clearStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
	});
});
