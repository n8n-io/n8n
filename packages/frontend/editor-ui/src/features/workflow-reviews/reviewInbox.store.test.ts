import type { WorkflowReviewInboxItem, WorkflowReviewRequestDetail } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { ResponseError } from '@n8n/rest-api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as workflowReviewsApi from './workflowReviews.api';
import { useReviewInboxStore } from './reviewInbox.store';

vi.mock('./workflowReviews.api');

describe('useReviewInboxStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.resetAllMocks();
	});

	it('probes summary and loads open reviews when counts are non-zero', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({
			open: 3,
			closed: 12,
		});
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockResolvedValue({
			data: [
				{
					id: 'req-1',
					projectId: 'proj-1',
					title: 'Review',
					workflowName: 'My workflow',
					workflowVersionId: null,
					requester: null,
					authors: [],
					reviewers: [],
					decision: 'pending',
					state: 'open',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			],
			nextCursor: null,
			hasMore: false,
		});

		const store = useReviewInboxStore();
		await store.probeInbox();

		expect(workflowReviewsApi.fetchWorkflowReviewInboxSummary).toHaveBeenCalledTimes(1);
		expect(store.hasAnyReviews).toBe(true);
		expect(store.openCount).toBe(3);
		expect(store.closedCount).toBe(12);
		expect(store.probeSettled).toBe(true);
		expect(store.showSidebar).toBe(true);
		expect(store.items).toHaveLength(1);
	});

	it('skips list fetch when both counts are zero', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({
			open: 0,
			closed: 0,
		});

		const store = useReviewInboxStore();
		await store.probeInbox();

		expect(workflowReviewsApi.fetchWorkflowReviewInbox).not.toHaveBeenCalled();
		expect(store.hasAnyReviews).toBe(false);
		expect(store.openCount).toBe(0);
		expect(store.closedCount).toBe(0);
		expect(store.showSidebar).toBe(false);
	});

	it('shows the sidebar when only closed reviews exist', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({
			open: 0,
			closed: 5,
		});
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockResolvedValue({
			data: [],
			nextCursor: null,
			hasMore: false,
		});

		const store = useReviewInboxStore();
		await store.probeInbox();

		expect(store.hasAnyReviews).toBe(true);
		expect(store.showSidebar).toBe(true);
		expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenCalledTimes(1);
	});

	it('refetches when switching tabs', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockResolvedValue({
			data: [],
			nextCursor: null,
			hasMore: false,
		});

		const store = useReviewInboxStore();
		await store.setActiveTab('closed');

		expect(store.activeTab).toBe('closed');
		expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ state: 'closed' }),
		);
	});

	it('does not clear the detail when switching tabs', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockResolvedValue({
			data: [],
			nextCursor: null,
			hasMore: false,
		});
		const store = useReviewInboxStore();
		store.detail = createDetail();

		await store.setActiveTab('closed');

		expect(store.detail).toEqual(expect.objectContaining({ id: 'req-1' }));
	});

	it('ignores stale list responses', async () => {
		let resolveFirst!: (value: {
			data: [];
			nextCursor: null;
			hasMore: false;
		}) => void;
		const firstResponse = new Promise<{
			data: [];
			nextCursor: null;
			hasMore: false;
		}>((resolve) => {
			resolveFirst = resolve;
		});

		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox)
			.mockImplementationOnce(async () => await firstResponse)
			.mockResolvedValueOnce({
				data: [
					{
						id: 'req-2',
						projectId: 'proj-1',
						title: 'Newer',
						workflowName: null,
						workflowVersionId: null,
						requester: null,
						authors: [],
						reviewers: [],
						decision: 'pending',
						state: 'closed',
						createdAt: '2024-01-02T00:00:00.000Z',
						updatedAt: '2024-01-02T00:00:00.000Z',
					},
				],
				nextCursor: null,
				hasMore: false,
			});

		const store = useReviewInboxStore();
		const firstFetch = store.fetchList({ reset: true });
		await store.setActiveTab('closed');
		await vi.waitFor(() => {
			expect(store.items).toEqual([expect.objectContaining({ id: 'req-2', title: 'Newer' })]);
		});

		resolveFirst({ data: [], nextCursor: null, hasMore: false });
		await firstFetch;

		expect(store.items).toEqual([expect.objectContaining({ id: 'req-2', title: 'Newer' })]);
	});

	it('does not apply probe results after reset', async () => {
		let resolveSummary!: (value: { open: number; closed: number }) => void;
		const summaryPromise = new Promise<{ open: number; closed: number }>((resolve) => {
			resolveSummary = resolve;
		});
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockImplementationOnce(
			async () => await summaryPromise,
		);

		const store = useReviewInboxStore();
		const probe = store.probeInbox();
		store.reset();
		resolveSummary({ open: 1, closed: 0 });
		await probe;

		expect(store.probeSettled).toBe(false);
		expect(store.hasAnyReviews).toBe(false);
		expect(workflowReviewsApi.fetchWorkflowReviewInbox).not.toHaveBeenCalled();
	});

	it('clears loadingMore when a reset list request invalidates pagination', async () => {
		let resolveMore!: (value: {
			data: [];
			nextCursor: null;
			hasMore: false;
		}) => void;
		const morePromise = new Promise<{
			data: [];
			nextCursor: null;
			hasMore: false;
		}>((resolve) => {
			resolveMore = resolve;
		});

		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox)
			.mockResolvedValueOnce({
				data: [
					{
						id: 'req-1',
						projectId: 'proj-1',
						title: 'Open',
						workflowName: null,
						workflowVersionId: null,
						requester: null,
						authors: [],
						reviewers: [],
						decision: 'pending',
						state: 'open',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z',
					},
				],
				nextCursor: 'req-1',
				hasMore: true,
			})
			.mockImplementationOnce(async () => await morePromise)
			.mockResolvedValueOnce({
				data: [],
				nextCursor: null,
				hasMore: false,
			});

		const store = useReviewInboxStore();
		await store.fetchList({ reset: true });
		const loadMore = store.loadMore();
		await vi.waitFor(() => {
			expect(store.loadingMore).toBe(true);
		});

		await store.setActiveTab('closed');
		expect(store.loadingMore).toBe(false);

		resolveMore({ data: [], nextCursor: null, hasMore: false });
		await loadMore;
		expect(store.loadingMore).toBe(false);
	});

	describe('decideOnReview', () => {
		const openItem: WorkflowReviewInboxItem = {
			id: 'req-1',
			projectId: 'proj-1',
			title: 'Review',
			workflowName: 'My workflow',
			workflowVersionId: null,
			requester: null,
			authors: [],
			reviewers: [],
			decision: 'pending',
			state: 'open',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};

		async function seedStoreWithOpenItem(options: { items?: WorkflowReviewInboxItem[] } = {}) {
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({
				open: 2,
				closed: 5,
			});
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockResolvedValue({
				// Fresh copy: the store patches items in place.
				data: options.items ?? [{ ...openItem }],
				nextCursor: null,
				hasMore: false,
			});

			const store = useReviewInboxStore();
			await store.probeInbox();
			return store;
		}

		it('removes an approved item from the open list, adjusts counts, and patches detail', async () => {
			const store = await seedStoreWithOpenItem();
			store.detail = createDetail();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockResolvedValue({
				id: 'req-1',
				state: 'closed',
				decision: 'approved',
				workflowVersionId: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			await store.decideOnReview('req-1', 'approved');

			expect(workflowReviewsApi.decideWorkflowReviewRequest).toHaveBeenCalledWith(
				expect.anything(),
				'req-1',
				{ decision: 'approved' },
			);
			expect(store.items).toEqual([]);
			expect(store.openCount).toBe(1);
			expect(store.closedCount).toBe(6);
			expect(store.detail).toEqual(
				expect.objectContaining({ state: 'closed', decision: 'approved' }),
			);
		});

		it('does not patch detail for a different item', async () => {
			const store = await seedStoreWithOpenItem({
				items: [{ ...openItem }, { ...openItem, id: 'req-2', title: 'Other review' }],
			});
			store.detail = { ...createDetail(), id: 'req-2', title: 'Other review' };
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockResolvedValue({
				id: 'req-1',
				state: 'closed',
				decision: 'approved',
				workflowVersionId: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			await store.decideOnReview('req-1', 'approved');

			expect(store.items).toEqual([expect.objectContaining({ id: 'req-2' })]);
			expect(store.detail).toEqual(expect.objectContaining({ id: 'req-2', state: 'open' }));
		});

		it('patches only the decision when changes are requested', async () => {
			const store = await seedStoreWithOpenItem();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockResolvedValue({
				id: 'req-1',
				state: 'open',
				decision: 'changes_requested',
				workflowVersionId: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			await store.decideOnReview('req-1', 'changes_requested');

			expect(store.items).toEqual([
				expect.objectContaining({
					id: 'req-1',
					state: 'open',
					decision: 'changes_requested',
				}),
			]);
			expect(store.openCount).toBe(2);
			expect(store.closedCount).toBe(5);
		});

		it('returns the response so callers can surface the auto-publish outcome', async () => {
			const store = await seedStoreWithOpenItem();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockResolvedValue({
				id: 'req-1',
				state: 'closed',
				decision: 'approved',
				workflowVersionId: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
				autoPublish: { status: 'published' },
			});

			const response = await store.decideOnReview('req-1', 'approved');

			expect(response.autoPublish).toEqual({ status: 'published' });
		});

		it('rethrows an API error and leaves the state untouched', async () => {
			const store = await seedStoreWithOpenItem();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockRejectedValue(
				new Error('forbidden'),
			);

			await expect(store.decideOnReview('req-1', 'approved')).rejects.toThrow('forbidden');

			expect(store.items).toEqual([
				expect.objectContaining({ state: 'open', decision: 'pending' }),
			]);
			expect(store.openCount).toBe(2);
			expect(store.closedCount).toBe(5);
		});
	});

	describe('detail', () => {
		it('loads review detail', async () => {
			const expected = createDetail();
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockResolvedValue(expected);
			const store = useReviewInboxStore();

			await store.fetchDetail('req-1');

			expect(workflowReviewsApi.fetchWorkflowReviewRequestDetail).toHaveBeenCalledWith(
				expect.anything(),
				'req-1',
			);
			expect(store.detail).toEqual(expected);
			expect(store.detailLoading).toBe(false);
			expect(store.detailNotFound).toBe(false);
		});

		it('shows not found without throwing for a 404', async () => {
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockRejectedValue(
				new ResponseError('gone', { httpStatusCode: 404 }),
			);
			const store = useReviewInboxStore();

			await expect(store.fetchDetail('missing')).resolves.toBeUndefined();

			expect(store.detail).toBeNull();
			expect(store.detailNotFound).toBe(true);
			expect(store.detailLoading).toBe(false);
		});

		it('rethrows a non-404 detail error', async () => {
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockRejectedValue(
				new ResponseError('forbidden', { httpStatusCode: 403 }),
			);
			const store = useReviewInboxStore();

			await expect(store.fetchDetail('req-1')).rejects.toThrow('forbidden');

			expect(store.detailNotFound).toBe(false);
			expect(store.error).toBeNull();
		});

		it('does not suppress the list empty state after a failed detail fetch', async () => {
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockRejectedValue(
				new ResponseError('boom', { httpStatusCode: 500 }),
			);
			const store = useReviewInboxStore();
			store.probeSettled = true;
			store.hasAnyReviews = true;
			store.items = [];

			await expect(store.fetchDetail('req-1')).rejects.toThrow('boom');

			expect(store.isEmpty).toBe(true);
		});

		it('ignores a stale detail response', async () => {
			let resolveFirst!: (detail: WorkflowReviewRequestDetail) => void;
			const firstResponse = new Promise<WorkflowReviewRequestDetail>((resolve) => {
				resolveFirst = resolve;
			});
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail)
				.mockImplementationOnce(async () => await firstResponse)
				.mockResolvedValueOnce({ ...createDetail(), id: 'req-2', title: 'Newer review' });
			const store = useReviewInboxStore();

			const firstFetch = store.fetchDetail('req-1');
			await store.fetchDetail('req-2');
			resolveFirst(createDetail());
			await firstFetch;

			expect(store.detail).toEqual(expect.objectContaining({ id: 'req-2', title: 'Newer review' }));
		});

		it('clears and resets detail state', () => {
			const store = useReviewInboxStore();
			store.detail = createDetail();
			store.detailLoading = true;
			store.detailNotFound = true;

			store.clearDetail();

			expect(store.detail).toBeNull();
			expect(store.detailLoading).toBe(false);
			expect(store.detailNotFound).toBe(false);

			store.detail = createDetail();
			store.detailLoading = true;
			store.detailNotFound = true;
			store.reset();

			expect(store.detail).toBeNull();
			expect(store.detailLoading).toBe(false);
			expect(store.detailNotFound).toBe(false);
		});
	});

	it('does not treat a failed list fetch as an empty inbox', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({
			open: 1,
			closed: 0,
		});
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockRejectedValue(new Error('network'));

		const store = useReviewInboxStore();
		await expect(store.probeInbox()).rejects.toThrow('network');

		expect(store.error).toEqual(new Error('network'));
		expect(store.isEmpty).toBe(false);
	});
});

function createDetail(): WorkflowReviewRequestDetail {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Review',
		workflowName: 'My workflow',
		workflowVersionId: null,
		requester: null,
		authors: [],
		reviewers: [],
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		description: null,
		workflows: [],
		viewerCanDecide: true,
		viewerDecisionIneligibilityReason: null,
		viewerCanComment: true,
	};
}
