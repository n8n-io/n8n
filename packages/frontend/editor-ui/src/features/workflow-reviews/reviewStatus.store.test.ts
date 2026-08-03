<<<<<<< HEAD
import type { WorkflowReviewRequestList, WorkflowReviewRequestSummary } from '@n8n/api-types';
=======
import type { WorkflowReviewRequestForWorkflow, WorkflowReviewRequestList } from '@n8n/api-types';
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
import { ResponseError } from '@n8n/rest-api-client';
import { createPinia, setActivePinia } from 'pinia';

import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';
import { useWorkflowReviewStatusStore } from './reviewStatus.store';

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	fetchWorkflowReviewRequests: vi.fn(),
}));

const fetchMock = vi.mocked(fetchWorkflowReviewRequests);

<<<<<<< HEAD
const openReview: WorkflowReviewRequestSummary = {
	id: 'req-1',
	state: 'open',
	decision: 'pending',
	createdAt: '2026-07-20T10:00:00.000Z',
	updatedAt: '2026-07-20T10:00:00.000Z',
};

const listOf = (...data: WorkflowReviewRequestSummary[]): WorkflowReviewRequestList => ({
=======
const review = (
	overrides: Partial<WorkflowReviewRequestForWorkflow> = {},
): WorkflowReviewRequestForWorkflow => ({
	id: 'req-1',
	state: 'open',
	decision: 'pending',
	workflowVersionId: 'ver-1',
	createdAt: '2026-07-20T10:00:00.000Z',
	updatedAt: '2026-07-20T10:00:00.000Z',
	decisionBy: null,
	approvedVersionPublicationState: null,
	...overrides,
});

const openReview = review();

const listOf = (...data: WorkflowReviewRequestForWorkflow[]): WorkflowReviewRequestList => ({
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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

<<<<<<< HEAD
	it('stores the open review returned by the API', async () => {
=======
	it('requests the latest review of any state, once', async () => {
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf(openReview));

		await store.fetchStatus('workflow-1');

<<<<<<< HEAD
		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), {
			workflowId: 'workflow-1',
			state: 'open',
			take: 1,
		});
=======
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), {
			workflowId: 'workflow-1',
			take: 1,
		});
		expect(store.latestReviewRequest('workflow-1')).toEqual(openReview);
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
		expect(store.hasOpenReview('workflow-1')).toBe(true);
		expect(store.openReviewRequest('workflow-1')).toEqual(openReview);
	});

<<<<<<< HEAD
	it('stores null when the API returns no open review', async () => {
=======
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
		const approved = review({
			state: 'closed',
			decision: 'approved',
			approvedVersionPublicationState: 'not_published',
		});
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
			}),
		);
		expect(store.hasOpenReview('workflow-1')).toBe(true);
	});

	it('stores null when the API returns no review', async () => {
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValue(listOf());

		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
<<<<<<< HEAD
		expect(store.openReviewByWorkflowId).toHaveProperty('workflow-1', null);
=======
		expect(store.latestReviewByWorkflowId).toHaveProperty('workflow-1', null);
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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
<<<<<<< HEAD
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
=======
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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
<<<<<<< HEAD
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
=======
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf

		resolveFirst(listOf(openReview));
		await firstFetch;

		expect(store.hasOpenReview('workflow-1')).toBe(false);
<<<<<<< HEAD
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
=======
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	});

	it.each([404, 403])('clears the stored status on %i', async (httpStatusCode) => {
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');
		expect(store.hasOpenReview('workflow-1')).toBe(true);

		fetchMock.mockRejectedValueOnce(new ResponseError('gone', { httpStatusCode }));
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
<<<<<<< HEAD
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
=======
		expect(store.latestReviewByWorkflowId).not.toHaveProperty('workflow-1');
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
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

<<<<<<< HEAD
	it('clearStatus removes the stored entry', async () => {
=======
	it('a later fetch with no open review clears a previously stored entry', async () => {
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
		const store = useWorkflowReviewStatusStore();
		fetchMock.mockResolvedValueOnce(listOf(openReview));
		await store.fetchStatus('workflow-1');

<<<<<<< HEAD
		store.clearStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.openReviewByWorkflowId).not.toHaveProperty('workflow-1');
=======
		fetchMock.mockResolvedValueOnce(listOf());
		await store.fetchStatus('workflow-1');

		expect(store.hasOpenReview('workflow-1')).toBe(false);
		expect(store.latestReviewByWorkflowId).toHaveProperty('workflow-1', null);
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	});
});
