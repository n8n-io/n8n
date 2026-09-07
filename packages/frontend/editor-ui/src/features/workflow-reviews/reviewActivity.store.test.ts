import type {
	ListWorkflowReviewActivityResponse,
	WorkflowReviewActivityEntry,
} from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as workflowReviewsApi from './workflowReviews.api';
import { useReviewActivityStore } from './reviewActivity.store';

vi.mock('./workflowReviews.api');

function makeEntry(id: string): WorkflowReviewActivityEntry {
	return {
		id,
		type: 'comment.created',
		typeVersion: 1,
		data: null,
		createdBy: null,
		createdAt: '2024-01-01T00:00:00.000Z',
		messages: [
			{
				id: `msg-${id}`,
				body: `comment ${id}`,
				createdBy: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: null,
				deletedAt: null,
			},
		],
	};
}

function makePage(
	ids: string[],
	overrides: Partial<ListWorkflowReviewActivityResponse> = {},
): ListWorkflowReviewActivityResponse {
	return {
		data: ids.map(makeEntry),
		nextCursor: null,
		hasMore: false,
		...overrides,
	};
}

describe('useReviewActivityStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.resetAllMocks();
	});

	it('loads the first page for a review', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['1', '2'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		const store = useReviewActivityStore();

		await store.fetchFeed('req-1');

		expect(store.entries.map((entry) => entry.id)).toEqual(['1', '2']);
		expect(store.hasMore).toBe(true);
		expect(store.nextCursor).toBe('cursor-1');
		expect(store.loading).toBe(false);
	});

	it("never shows the previous review's comments while the new one loads", async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		const pending = store.fetchFeed('req-2');

		expect(store.entries).toEqual([]);
		expect(store.hasMore).toBe(false);
		expect(store.nextCursor).toBeNull();
		await pending;
	});

	it('ignores a stale feed response', async () => {
		let resolveFirst!: (response: ListWorkflowReviewActivityResponse) => void;
		const firstResponse = new Promise<ListWorkflowReviewActivityResponse>((resolve) => {
			resolveFirst = resolve;
		});
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity)
			.mockImplementationOnce(async () => await firstResponse)
			.mockResolvedValueOnce(makePage(['9']));
		const store = useReviewActivityStore();

		const firstFetch = store.fetchFeed('req-1');
		await store.fetchFeed('req-2');
		resolveFirst(makePage(['1']));
		await firstFetch;

		expect(store.entries.map((entry) => entry.id)).toEqual(['9']);
	});

	it('puts older entries above and a new comment at the bottom', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3', '4'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockResolvedValue(makeEntry('5'));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		await expect(store.postComment('hi')).resolves.toBe(true);

		expect(store.entries.map((entry) => entry.id)).toEqual(['3', '4', '5']);

		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['1', '2']),
		);
		await store.loadMore();

		// Asserted explicitly: the mock answers the same page whatever it is asked for, so
		// without this a `loadMore` that dropped the cursor would still look correct here.
		expect(workflowReviewsApi.fetchWorkflowReviewActivity).toHaveBeenLastCalledWith(
			expect.anything(),
			'req-1',
			{ limit: 25, cursor: 'cursor-1' },
		);
		expect(store.entries.map((entry) => entry.id)).toEqual(['1', '2', '3', '4', '5']);
		expect(store.hasMore).toBe(false);
		expect(store.nextCursor).toBeNull();
	});

	it('ignores a stale load-more response', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		let resolveLoadMore!: (response: ListWorkflowReviewActivityResponse) => void;
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity)
			.mockImplementationOnce(
				async () =>
					await new Promise<ListWorkflowReviewActivityResponse>((resolve) => {
						resolveLoadMore = resolve;
					}),
			)
			.mockResolvedValueOnce(makePage(['7']));

		const pendingLoadMore = store.loadMore();
		await store.fetchFeed('req-2');
		resolveLoadMore(makePage(['1', '2']));
		await pendingLoadMore;

		expect(store.entries.map((entry) => entry.id)).toEqual(['7']);
	});

	it('keeps a comment posted while the first page was still in flight', async () => {
		let resolveFeed!: (response: ListWorkflowReviewActivityResponse) => void;
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockImplementationOnce(
			async () =>
				await new Promise<ListWorkflowReviewActivityResponse>((resolve) => {
					resolveFeed = resolve;
				}),
		);
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockResolvedValue(makeEntry('5'));
		const store = useReviewActivityStore();

		const pendingFeed = store.fetchFeed('req-1');
		await store.postComment('hi');
		// The page was snapshotted server-side before the comment was written
		resolveFeed(makePage(['3', '4']));
		await pendingFeed;

		expect(store.entries.map((entry) => entry.id)).toEqual(['3', '4', '5']);
	});

	it('does not duplicate a comment the refetched feed already returned', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage([]));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		let resolvePost!: (entry: WorkflowReviewActivityEntry) => void;
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockImplementationOnce(
			async () =>
				await new Promise<WorkflowReviewActivityEntry>((resolve) => {
					resolvePost = resolve;
				}),
		);

		const pendingPost = store.postComment('hi');
		await store.fetchFeed('req-2');
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['5']));
		await store.fetchFeed('req-1');
		resolvePost(makeEntry('5'));
		await pendingPost;

		expect(store.entries.map((entry) => entry.id)).toEqual(['5']);
	});

	it('stops paging when an older page comes back empty', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage([], { nextCursor: 'cursor-1', hasMore: true }),
		);

		await store.loadMore();

		expect(store.hasMore).toBe(false);
		expect(store.entries.map((entry) => entry.id)).toEqual(['3']);
	});

	it('rejects a post with no review selected instead of reporting success', async () => {
		const store = useReviewActivityStore();

		await expect(store.postComment('hi')).rejects.toThrow();
		expect(workflowReviewsApi.createWorkflowReviewComment).not.toHaveBeenCalled();
	});

	it('does not ask for older entries when the feed is already complete', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockClear();

		await store.loadMore();

		expect(workflowReviewsApi.fetchWorkflowReviewActivity).not.toHaveBeenCalled();
	});

	it('drops an in-flight feed response after a reset', async () => {
		let resolveFeed!: (response: ListWorkflowReviewActivityResponse) => void;
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockImplementationOnce(
			async () =>
				await new Promise<ListWorkflowReviewActivityResponse>((resolve) => {
					resolveFeed = resolve;
				}),
		);
		const store = useReviewActivityStore();

		const pending = store.fetchFeed('req-1');
		store.draft = 'for req-1 only';
		store.decisionNote = 'for req-1 only';
		store.reset();
		resolveFeed(makePage(['1']));
		await pending;

		expect(store.entries).toEqual([]);
		expect(store.currentReviewId).toBeNull();
		// Leaving the view must not carry a draft into whatever review is opened next.
		expect(store.draft).toBe('');
		expect(store.decisionNote).toBe('');
	});

	it('does not leave the next review stuck in a sending state', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockReturnValue(
			new Promise(() => {}),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		void store.postComment('hi');
		expect(store.posting).toBe(true);

		await store.fetchFeed('req-2');

		expect(store.posting).toBe(false);
	});

	it('keeps send disabled for the post the viewer is still waiting on after leaving and returning', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		const resolvers: Array<(entry: WorkflowReviewActivityEntry) => void> = [];
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockImplementation(
			async () => await new Promise((resolve) => resolvers.push(resolve)),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		const first = store.postComment('hi');

		await store.fetchFeed('req-2');
		await store.fetchFeed('req-1');
		const second = store.postComment('again');
		expect(store.posting).toBe(true);

		resolvers[0](makeEntry('9'));
		await first;
		expect(store.posting).toBe(true);

		resolvers[1](makeEntry('10'));
		await second;
		expect(store.posting).toBe(false);
	});

	it('keeps the send button disabled when a failed page is retried mid-post', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockRejectedValue(new Error('boom'));
		let resolvePost: (entry: WorkflowReviewActivityEntry) => void = () => {};
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockReturnValue(
			new Promise((resolve) => {
				resolvePost = resolve;
			}),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		store.draft = 'half a thought';

		const pending = store.postComment('hi');
		expect(store.posting).toBe(true);

		// Retrying refetches the same review.
		await store.fetchFeed('req-1');
		expect(store.posting).toBe(true);
		expect(store.draft).toBe('half a thought');

		resolvePost(makeEntry('9'));
		await pending;
		expect(store.posting).toBe(false);
	});

	it('keeps a comment posted onto a failed feed visible while that feed is retried', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockRejectedValue(new Error('boom'));
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockResolvedValue(makeEntry('9'));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		await store.postComment('hi');
		expect(store.entries.map((entry) => entry.id)).toEqual(['9']);

		await store.fetchFeed('req-1');

		expect(store.entries.map((entry) => entry.id)).toEqual(['9']);
	});

	it('drops older pages a refetch did not return so the feed stays in order', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3', '4'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['1', '2']),
		);
		await store.loadMore();
		expect(store.entries.map((entry) => entry.id)).toEqual(['1', '2', '3', '4']);

		// Kept older pages would land after the newer one and invert the list.
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3', '4'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		await store.fetchFeed('req-1');

		expect(store.entries.map((entry) => entry.id)).toEqual(['3', '4']);
	});

	it("does not drop a stale post's comment into the review the viewer moved to", async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		let resolvePost: (entry: WorkflowReviewActivityEntry) => void = () => {};
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockReturnValue(
			new Promise((resolve) => {
				resolvePost = resolve;
			}),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		const pending = store.postComment('hi');

		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['2']));
		await store.fetchFeed('req-2');
		resolvePost(makeEntry('9'));

		// Reported to the caller too: clearing a draft or switching tabs on the back of this
		// post would hit the review the viewer is reading now.
		await expect(pending).resolves.toBe(false);
		expect(store.entries.map((entry) => entry.id)).toEqual(['2']);
	});

	it('drops the comment and decision drafts when the viewer moves to another review', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		store.draft = 'for req-1 only';
		store.decisionNote = 'for req-1 only';

		await store.fetchFeed('req-2');

		expect(store.draft).toBe('');
		expect(store.decisionNote).toBe('');

		// The composer is on screen at the same time, so dropping the note must leave the
		// comment the viewer is writing alone.
		store.draft = 'half a comment';
		store.decisionNote = 'needs work';
		store.clearDecisionNote('needs work');
		expect(store.draft).toBe('half a comment');
	});

	// Both the decision and the comment paths clear the note after awaiting a request, by
	// which time the viewer may have typed the next one.
	it('keeps a note typed while the submitted one was still in flight', () => {
		const store = useReviewActivityStore();
		store.decisionNote = 'and one more thing';

		store.clearDecisionNote('needs work');
		expect(store.decisionNote).toBe('and one more thing');

		store.clearDecisionNote('and one more thing');
		expect(store.decisionNote).toBe('');
	});

	it('reports a failed comment to the composer, not as a feed error', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(makePage(['1']));
		vi.mocked(workflowReviewsApi.createWorkflowReviewComment).mockRejectedValue(new Error('nope'));
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');

		await expect(store.postComment('hi')).rejects.toThrow('nope');

		expect(store.error).toBeNull();
		expect(store.posting).toBe(false);
		expect(store.entries.map((entry) => entry.id)).toEqual(['1']);
	});

	it('shows a failed load in the feed rather than throwing', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockRejectedValue(new Error('boom'));
		const store = useReviewActivityStore();

		await store.fetchFeed('req-1');

		expect(store.error).toEqual(new Error('boom'));
		expect(store.loading).toBe(false);
	});

	it('keeps a loaded feed when load-more fails', async () => {
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockResolvedValue(
			makePage(['3'], { nextCursor: 'cursor-1', hasMore: true }),
		);
		const store = useReviewActivityStore();
		await store.fetchFeed('req-1');
		vi.mocked(workflowReviewsApi.fetchWorkflowReviewActivity).mockRejectedValue(new Error('boom'));

		await store.loadMore();

		expect(store.error).toEqual(new Error('boom'));
		expect(store.entries.map((entry) => entry.id)).toEqual(['3']);
		expect(store.loadingMore).toBe(false);
	});
});
