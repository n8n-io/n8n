import { createPinia, setActivePinia } from 'pinia';
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
		await store.setActiveState('closed');

		expect(store.activeState).toBe('closed');
		expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ state: 'closed' }),
		);
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
		await store.setActiveState('closed');
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

		await store.setActiveState('closed');
		expect(store.loadingMore).toBe(false);

		resolveMore({ data: [], nextCursor: null, hasMore: false });
		await loadMore;
		expect(store.loadingMore).toBe(false);
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
