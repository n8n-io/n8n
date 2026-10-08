import type {
	DecideWorkflowReviewRequestResponse,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { useReviewDetailStore } from './reviewDetail.store';
import * as api from './workflowReviews.api';

vi.mock('./workflowReviews.api');

function detail(id: string): WorkflowReviewRequestDetail {
	return {
		id,
		state: 'open',
		decision: 'pending',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		projectId: 'project',
		title: 'Review',
		requester: null,
		authors: [],
		reviewers: [],
		description: null,
		workflows: [],
		viewerCanDecide: true,
		viewerCanComment: true,
		viewerDecisionIneligibilityReason: null,
	};
}

beforeEach(() => vi.resetAllMocks());

it('ignores detail responses from an earlier selection', async () => {
	const first = createDeferredPromise<WorkflowReviewRequestDetail>();
	vi.mocked(api.fetchWorkflowReviewRequestDetail)
		.mockReturnValueOnce(first.promise)
		.mockResolvedValueOnce(detail('second'));
	const store = useReviewDetailStore();
	const pending = store.fetchDetail('first');
	await store.fetchDetail('second');
	first.resolve(detail('first'));
	await pending;
	expect(store.detail?.id).toBe('second');
	expect(store.detailLoading).toBe(false);
});

it('keeps cached detail when a refetch reports that the review does not exist', async () => {
	vi.mocked(api.fetchWorkflowReviewRequestDetail)
		.mockResolvedValueOnce(detail('review'))
		.mockRejectedValueOnce(new ResponseError('unavailable', { httpStatusCode: 404 }));
	const store = useReviewDetailStore();
	await store.fetchDetail('review');
	await store.fetchDetail('review');
	expect(store.detail?.id).toBe('review');
	expect(store.detailNotFound).toBe(true);
});

it('reports an access error without marking the review as missing', async () => {
	const error = new ResponseError('forbidden', { httpStatusCode: 403 });
	vi.mocked(api.fetchWorkflowReviewRequestDetail)
		.mockResolvedValueOnce(detail('review'))
		.mockRejectedValueOnce(error);
	const store = useReviewDetailStore();
	await store.fetchDetail('review');
	await expect(store.fetchDetail('review')).rejects.toBe(error);
	expect(store.detail?.id).toBe('review');
	expect(store.detailNotFound).toBe(false);
});

it('does not restore a cleared selection when its request finishes', async () => {
	const request = createDeferredPromise<WorkflowReviewRequestDetail>();
	vi.mocked(api.fetchWorkflowReviewRequestDetail).mockReturnValueOnce(request.promise);
	const store = useReviewDetailStore();
	const pending = store.fetchDetail('review');
	store.clearDetail();
	request.resolve(detail('review'));
	await pending;
	expect(store.detail).toBeNull();
	expect(store.detailLoading).toBe(false);
});

it('applies a completed decision after the viewer returns to the same review', async () => {
	vi.mocked(api.fetchWorkflowReviewRequestDetail).mockImplementation(async (_context, id) =>
		detail(id),
	);
	const response = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
	vi.mocked(api.decideWorkflowReviewRequest).mockReturnValue(response.promise);
	const store = useReviewDetailStore();
	await store.fetchDetail('review');
	const decision = store.decideOnReview('review', { decision: 'approved' });
	store.clearDetail();
	await store.fetchDetail('other');
	store.clearDetail();
	await store.fetchDetail('review');
	response.resolve({
		id: 'review',
		state: 'closed',
		decision: 'approved',
		workflowVersionId: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	});
	await decision;
	expect(store.detail?.state).toBe('closed');
	expect(store.detail?.decision).toBe('approved');
});

it.each(['success', 'notFound', 'error'])(
	'keeps requested changes when an earlier detail request returns %s',
	async (outcome) => {
		const request = createDeferredPromise<WorkflowReviewRequestDetail>();
		vi.mocked(api.fetchWorkflowReviewRequestDetail)
			.mockResolvedValueOnce(detail('review'))
			.mockReturnValueOnce(request.promise);
		vi.mocked(api.decideWorkflowReviewRequest).mockResolvedValue({
			...detail('review'),
			state: 'open',
			decision: 'changes_requested',
			workflowVersionId: null,
		});
		const store = useReviewDetailStore();
		await store.fetchDetail('review');
		const pending = store.fetchDetail('review');
		await store.decideOnReview('review', { decision: 'changes_requested' });
		if (outcome === 'success') request.resolve(detail('review'));
		else if (outcome === 'notFound')
			request.reject(new ResponseError('unavailable', { httpStatusCode: 404 }));
		else request.reject(new Error('Request failed'));
		await pending;
		expect(store.detail?.state).toBe('open');
		expect(store.detail?.decision).toBe('changes_requested');
		expect(store.detailNotFound).toBe(false);
		expect(store.detailLoading).toBe(false);
	},
);

it('keeps a different review request when an earlier decision finishes', async () => {
	const request = createDeferredPromise<WorkflowReviewRequestDetail>();
	const response = createDeferredPromise<DecideWorkflowReviewRequestResponse>();
	vi.mocked(api.fetchWorkflowReviewRequestDetail)
		.mockResolvedValueOnce(detail('review'))
		.mockReturnValueOnce(request.promise);
	vi.mocked(api.decideWorkflowReviewRequest).mockReturnValueOnce(response.promise);
	const store = useReviewDetailStore();
	await store.fetchDetail('review');
	const decision = store.decideOnReview('review', { decision: 'approved' });
	store.clearDetail();
	const pending = store.fetchDetail('other');
	response.resolve({
		...detail('review'),
		state: 'closed',
		decision: 'approved',
		workflowVersionId: null,
	});
	await decision;
	expect(store.detailLoading).toBe(true);
	request.resolve(detail('other'));
	await pending;
	expect(store.detail?.state).toBe('open');
	expect(store.detail?.id).toBe('other');
	expect(store.detailLoading).toBe(false);
});
