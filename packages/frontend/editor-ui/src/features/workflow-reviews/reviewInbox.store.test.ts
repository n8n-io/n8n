import type {
	ListWorkflowReviewInboxResponse,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { ResponseError } from '@n8n/rest-api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as workflowReviewsApi from './workflowReviews.api';
import { useReviewInboxStore } from './reviewInbox.store';

vi.mock('./workflowReviews.api');

type SectionKey = 'waiting' | 'authored' | 'closed';

function makeItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
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
		...overrides,
	};
}

function page(
	data: WorkflowReviewInboxItem[],
	overrides: Partial<ListWorkflowReviewInboxResponse> = {},
): ListWorkflowReviewInboxResponse {
	return { data, nextCursor: null, hasMore: false, ...overrides };
}

const emptyPage = () => page([]);

/** Route each mocked inbox request to the section it belongs to. */
function sectionOf(params: workflowReviewsApi.FetchWorkflowReviewInboxParams): SectionKey {
	if (params.state === 'closed') return 'closed';
	return params.category === 'authored' ? 'authored' : 'waiting';
}

function mockInbox(
	responses: Partial<
		Record<
			SectionKey,
			ListWorkflowReviewInboxResponse | (() => Promise<ListWorkflowReviewInboxResponse>)
		>
	>,
) {
	vi.mocked(workflowReviewsApi.fetchWorkflowReviewInbox).mockImplementation(
		async (_context, params) => {
			const response = responses[sectionOf(params)];
			if (typeof response === 'function') return await response();
			return response ?? emptyPage();
		},
	);
}

function mockSummary(open: number, closed: number) {
	vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockResolvedValue({ open, closed });
}

function inboxCallsFor(section: SectionKey) {
	return vi
		.mocked(workflowReviewsApi.fetchWorkflowReviewInbox)
		.mock.calls.filter(([, params]) => sectionOf(params) === section);
}

describe('useReviewInboxStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.resetAllMocks();
	});

	describe('probing and section fetching', () => {
		it('probes the summary and loads both open sections concurrently', async () => {
			mockSummary(3, 12);
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })]),
				authored: page([makeItem({ id: 'authored-1' })]),
			});

			const store = useReviewInboxStore();
			await store.probeInbox();

			expect(workflowReviewsApi.fetchWorkflowReviewInboxSummary).toHaveBeenCalledTimes(1);
			expect(store.openCount).toBe(3);
			expect(store.closedCount).toBe(12);
			expect(store.probeSettled).toBe(true);
			expect(store.showSidebar).toBe(true);

			expect(inboxCallsFor('waiting')).toHaveLength(1);
			expect(inboxCallsFor('authored')).toHaveLength(1);
			expect(inboxCallsFor('closed')).toHaveLength(0);
			expect(store.sections.waiting.items).toEqual([expect.objectContaining({ id: 'waiting-1' })]);
			expect(store.sections.authored.items).toEqual([
				expect.objectContaining({ id: 'authored-1' }),
			]);
		});

		it('requests the closed tab without a category', async () => {
			mockInbox({ closed: page([makeItem({ id: 'closed-1', state: 'closed' })]) });

			const store = useReviewInboxStore();
			await store.setActiveTab('closed');

			expect(store.activeTab).toBe('closed');
			expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenCalledTimes(1);
			expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ state: 'closed', category: undefined }),
			);
			expect(store.sections.closed.items).toHaveLength(1);
		});

		it('skips list fetches when both counts are zero', async () => {
			mockSummary(0, 0);

			const store = useReviewInboxStore();
			await store.probeInbox();

			expect(workflowReviewsApi.fetchWorkflowReviewInbox).not.toHaveBeenCalled();
			expect(store.hasAnyReviews).toBe(false);
			expect(store.showSidebar).toBe(false);
		});

		it('applies each section as soon as its own request settles', async () => {
			let resolveAuthored!: (value: ListWorkflowReviewInboxResponse) => void;
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })]),
				authored: async () =>
					await new Promise<ListWorkflowReviewInboxResponse>((resolve) => {
						resolveAuthored = resolve;
					}),
			});

			const store = useReviewInboxStore();
			const fetching = store.fetchActiveTab();

			await vi.waitFor(() => {
				expect(store.sections.waiting.items).toHaveLength(1);
			});
			expect(store.sections.waiting.loading).toBe(false);
			expect(store.sections.authored.loading).toBe(true);

			resolveAuthored(page([makeItem({ id: 'authored-1' })]));
			await fetching;
			expect(store.sections.authored.items).toHaveLength(1);
		});

		it('does not apply probe results after reset', async () => {
			let resolveSummary!: (value: { open: number; closed: number }) => void;
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockImplementationOnce(
				async () =>
					await new Promise<{ open: number; closed: number }>((resolve) => {
						resolveSummary = resolve;
					}),
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

		it('ignores a stale response from an earlier fetch of the same section', async () => {
			let resolveFirst!: (value: ListWorkflowReviewInboxResponse) => void;
			let waitingCalls = 0;
			mockInbox({
				waiting: async () => {
					waitingCalls += 1;
					if (waitingCalls === 1) {
						return await new Promise<ListWorkflowReviewInboxResponse>((resolve) => {
							resolveFirst = resolve;
						});
					}
					return page([makeItem({ id: 'fresh' })]);
				},
			});

			const store = useReviewInboxStore();
			const firstFetch = store.fetchActiveTab();
			await store.fetchActiveTab();

			expect(store.sections.waiting.items).toEqual([expect.objectContaining({ id: 'fresh' })]);

			resolveFirst(page([makeItem({ id: 'stale' })]));
			await firstFetch;

			expect(store.sections.waiting.items).toEqual([expect.objectContaining({ id: 'fresh' })]);
		});
	});

	describe('pagination', () => {
		it('paginates each section with its own cursor', async () => {
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })], {
					nextCursor: 'waiting-cursor',
					hasMore: true,
				}),
				authored: page([makeItem({ id: 'authored-1' })], {
					nextCursor: 'authored-cursor',
					hasMore: true,
				}),
			});

			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			mockInbox({
				waiting: page([makeItem({ id: 'waiting-2' })]),
				authored: page([makeItem({ id: 'authored-2' })]),
			});
			await store.loadMore('waiting');

			expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ category: 'waiting', cursor: 'waiting-cursor' }),
			);
			expect(store.sections.waiting.items.map((item) => item.id)).toEqual([
				'waiting-1',
				'waiting-2',
			]);
			// Untouched: load-more appends to one section only.
			expect(store.sections.authored.items.map((item) => item.id)).toEqual(['authored-1']);
			expect(store.sections.authored.hasMore).toBe(true);
		});

		it('ignores a duplicate load-more while one is in flight', async () => {
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })], { nextCursor: 'cursor', hasMore: true }),
			});
			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			let resolveMore!: (value: ListWorkflowReviewInboxResponse) => void;
			mockInbox({
				waiting: async () =>
					await new Promise<ListWorkflowReviewInboxResponse>((resolve) => {
						resolveMore = resolve;
					}),
			});

			const first = store.loadMore('waiting');
			await store.loadMore('waiting');
			expect(inboxCallsFor('waiting')).toHaveLength(2);

			resolveMore(page([makeItem({ id: 'waiting-2' })]));
			await first;
			expect(store.sections.waiting.items).toHaveLength(2);
		});

		it('does nothing when the section has no further pages', async () => {
			mockInbox({ waiting: page([makeItem({ id: 'waiting-1' })]) });
			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			await store.loadMore('waiting');

			expect(inboxCallsFor('waiting')).toHaveLength(1);
		});

		it('clears loadingMore when a refetch invalidates pagination', async () => {
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })], { nextCursor: 'cursor', hasMore: true }),
			});
			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			let resolveMore!: (value: ListWorkflowReviewInboxResponse) => void;
			mockInbox({
				waiting: async () =>
					await new Promise<ListWorkflowReviewInboxResponse>((resolve) => {
						resolveMore = resolve;
					}),
			});
			const loadMore = store.loadMore('waiting');
			await vi.waitFor(() => {
				expect(store.sections.waiting.loadingMore).toBe(true);
			});

			mockInbox({ closed: emptyPage() });
			await store.setActiveTab('closed');
			// setActiveTab only refetches the closed slice, so reset the stalled one directly.
			mockInbox({ waiting: emptyPage() });
			await store.setActiveTab('open');
			expect(store.sections.waiting.loadingMore).toBe(false);

			resolveMore(page([makeItem({ id: 'never-applied' })]));
			await loadMore;
			expect(store.sections.waiting.loadingMore).toBe(false);
			expect(store.sections.waiting.items).toEqual([]);
		});
	});

	describe('errors', () => {
		it('keeps a failing section isolated from its sibling', async () => {
			mockInbox({
				waiting: async () => {
					throw new Error('network');
				},
				authored: page([makeItem({ id: 'authored-1' })]),
			});

			const store = useReviewInboxStore();
			await expect(store.fetchActiveTab()).rejects.toThrow('network');

			expect(store.sections.waiting.error).toEqual(new Error('network'));
			expect(store.sections.authored.error).toBeNull();
			expect(store.sections.authored.items).toHaveLength(1);
		});

		it('keeps rows and the cursor after a failed load-more and retries the same page', async () => {
			mockInbox({
				waiting: page([makeItem({ id: 'waiting-1' })], { nextCursor: 'cursor', hasMore: true }),
			});
			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			mockInbox({
				waiting: async () => {
					throw new Error('boom');
				},
			});
			await expect(store.loadMore('waiting')).rejects.toThrow('boom');

			expect(store.sections.waiting.items).toHaveLength(1);
			expect(store.sections.waiting.nextCursor).toBe('cursor');
			expect(store.sections.waiting.error).toEqual(new Error('boom'));

			mockInbox({ waiting: page([makeItem({ id: 'waiting-2' })]) });
			await store.retry('waiting');

			expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ category: 'waiting', cursor: 'cursor' }),
			);
			expect(store.sections.waiting.items.map((item) => item.id)).toEqual([
				'waiting-1',
				'waiting-2',
			]);
			expect(store.sections.waiting.error).toBeNull();
		});

		it('retries the first page when the initial section fetch failed', async () => {
			mockInbox({
				waiting: async () => {
					throw new Error('down');
				},
			});
			const store = useReviewInboxStore();
			await expect(store.fetchActiveTab()).rejects.toThrow('down');

			mockInbox({ waiting: page([makeItem({ id: 'waiting-1' })]) });
			await store.retry('waiting');

			expect(workflowReviewsApi.fetchWorkflowReviewInbox).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ category: 'waiting', cursor: undefined }),
			);
			expect(store.sections.waiting.items).toHaveLength(1);
		});

		it('does not treat a failed section fetch as an empty inbox', async () => {
			mockSummary(1, 0);
			mockInbox({
				waiting: async () => {
					throw new Error('network');
				},
			});

			const store = useReviewInboxStore();
			await expect(store.probeInbox()).rejects.toThrow('network');

			expect(store.isEmpty).toBe(false);
			// The failure belongs to the section that suffered it, and to it alone.
			expect(store.sections.waiting.error).toEqual(new Error('network'));
			expect(store.sections.authored.error).toBeNull();
		});

		it('settles the probe and rethrows when the summary fails', async () => {
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewInboxSummary).mockRejectedValue(
				new Error('summary down'),
			);

			const store = useReviewInboxStore();
			await expect(store.probeInbox()).rejects.toThrow('summary down');

			expect(store.probeSettled).toBe(true);
		});
	});

	describe('isEmpty', () => {
		it('is true on the open tab only when both sections are empty', async () => {
			mockSummary(1, 0);
			mockInbox({ waiting: page([makeItem({ id: 'waiting-1' })]), authored: emptyPage() });

			const store = useReviewInboxStore();
			await store.probeInbox();
			expect(store.isEmpty).toBe(false);

			mockInbox({ waiting: emptyPage(), authored: emptyPage() });
			await store.fetchActiveTab();
			expect(store.isEmpty).toBe(true);
		});

		it('follows the closed slice on the closed tab', async () => {
			mockSummary(0, 1);
			mockInbox({ closed: emptyPage() });

			const store = useReviewInboxStore();
			await store.probeInbox();
			await store.setActiveTab('closed');

			expect(store.isEmpty).toBe(true);
		});
	});

	describe('decideOnReview', () => {
		async function seedOpenSections() {
			mockSummary(2, 5);
			mockInbox({
				waiting: page([makeItem({ id: 'req-1' })]),
				authored: page([makeItem({ id: 'req-2', title: 'Mine' })]),
			});

			const store = useReviewInboxStore();
			await store.probeInbox();
			return store;
		}

		it('removes an approved item from its section, adjusts counts, and patches detail', async () => {
			const store = await seedOpenSections();
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

			expect(store.sections.waiting.items).toEqual([]);
			expect(store.sections.authored.items).toHaveLength(1);
			expect(store.openCount).toBe(1);
			expect(store.closedCount).toBe(6);
			expect(store.detail).toEqual(
				expect.objectContaining({ state: 'closed', decision: 'approved' }),
			);
		});

		it('decides an authored review without moving it between sections', async () => {
			const store = await seedOpenSections();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockResolvedValue({
				id: 'req-2',
				state: 'open',
				decision: 'changes_requested',
				workflowVersionId: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});

			await store.decideOnReview('req-2', 'changes_requested');

			expect(store.sections.waiting.items.map((item) => item.id)).toEqual(['req-1']);
			expect(store.sections.authored.items).toEqual([
				expect.objectContaining({ id: 'req-2', state: 'open', decision: 'changes_requested' }),
			]);
			expect(store.openCount).toBe(2);
			expect(store.closedCount).toBe(5);
		});

		it('returns the response so callers can surface the auto-publish outcome', async () => {
			const store = await seedOpenSections();
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
			const store = await seedOpenSections();
			vi.mocked(workflowReviewsApi.decideWorkflowReviewRequest).mockRejectedValue(
				new Error('forbidden'),
			);

			await expect(store.decideOnReview('req-1', 'approved')).rejects.toThrow('forbidden');

			expect(store.sections.waiting.items).toEqual([
				expect.objectContaining({ state: 'open', decision: 'pending' }),
			]);
			expect(store.openCount).toBe(2);
			expect(store.closedCount).toBe(5);
		});
	});

	describe('findItemById', () => {
		it('resolves items from either open section and returns null otherwise', async () => {
			mockInbox({
				waiting: page([makeItem({ id: 'req-1' })]),
				authored: page([makeItem({ id: 'req-2' })]),
			});
			const store = useReviewInboxStore();
			await store.fetchActiveTab();

			expect(store.findItemById('req-1')).toEqual(expect.objectContaining({ id: 'req-1' }));
			expect(store.findItemById('req-2')).toEqual(expect.objectContaining({ id: 'req-2' }));
			expect(store.findItemById('missing')).toBeNull();
		});
	});

	describe('detail', () => {
		it('loads review detail', async () => {
			const expected = createDetail();
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockResolvedValue(expected);
			const store = useReviewInboxStore();

			await store.fetchDetail('req-1');

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
		});

		it('does not suppress the section empty states after a failed detail fetch', async () => {
			mockSummary(1, 0);
			mockInbox({ waiting: emptyPage(), authored: emptyPage() });
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail).mockRejectedValue(
				new ResponseError('boom', { httpStatusCode: 500 }),
			);
			const store = useReviewInboxStore();
			await store.probeInbox();

			await expect(store.fetchDetail('req-1')).rejects.toThrow('boom');

			expect(store.isEmpty).toBe(true);
			expect(store.sections.waiting.error).toBeNull();
		});

		it('ignores a stale detail response', async () => {
			let resolveFirst!: (detail: WorkflowReviewRequestDetail) => void;
			vi.mocked(workflowReviewsApi.fetchWorkflowReviewRequestDetail)
				.mockImplementationOnce(
					async () =>
						await new Promise<WorkflowReviewRequestDetail>((resolve) => {
							resolveFirst = resolve;
						}),
				)
				.mockResolvedValueOnce({ ...createDetail(), id: 'req-2', title: 'Newer review' });
			const store = useReviewInboxStore();

			const firstFetch = store.fetchDetail('req-1');
			await store.fetchDetail('req-2');
			resolveFirst(createDetail());
			await firstFetch;

			expect(store.detail).toEqual(expect.objectContaining({ id: 'req-2', title: 'Newer review' }));
		});

		it('does not clear the detail when switching tabs', async () => {
			mockInbox({ closed: emptyPage() });
			const store = useReviewInboxStore();
			store.detail = createDetail();

			await store.setActiveTab('closed');

			expect(store.detail).toEqual(expect.objectContaining({ id: 'req-1' }));
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
		});
	});

	it('resets every section', async () => {
		mockSummary(1, 1);
		mockInbox({
			waiting: page([makeItem({ id: 'req-1' })], { nextCursor: 'cursor', hasMore: true }),
			authored: page([makeItem({ id: 'req-2' })]),
		});
		const store = useReviewInboxStore();
		await store.probeInbox();

		store.reset();

		expect(store.sections.waiting.items).toEqual([]);
		expect(store.sections.waiting.nextCursor).toBeNull();
		expect(store.sections.waiting.hasMore).toBe(false);
		expect(store.sections.authored.items).toEqual([]);
		expect(store.sections.closed.items).toEqual([]);
		expect(store.activeTab).toBe('open');
		expect(store.openCount).toBe(0);
		expect(store.closedCount).toBe(0);
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
