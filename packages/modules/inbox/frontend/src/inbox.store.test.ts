import type { InboxItem, InboxSelfHealingItem, ListInboxResponse } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import * as api from './inbox.api';
import { createInboxListSlice, useInboxStore } from './inbox.store';

vi.mock('./inbox.api');

const waitingOrClosedRequest = vi.fn<typeof api.fetchInbox>();
const authoredRequest = vi.fn<typeof api.fetchInbox>();

function result(id: string): InboxSelfHealingItem {
	return {
		id,
		type: 'self_healing_result',
		state: 'open',
		projectId: 'project',
		workflowId: 'workflow',
		workflowName: 'Workflow',
		summary: 'Review the proposed fix',
		outcome: 'fix_ready',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		completedAt: '2026-01-01T00:00:00.000Z',
	};
}
function page(
	data: InboxItem[] = [],
	overrides: Partial<ListInboxResponse> = {},
): ListInboxResponse {
	return {
		data,
		nextCursor: null,
		hasMore: false,
		partial: false,
		failedSources: [],
		disabledSources: [],
		...overrides,
	};
}
function enableInbox() {
	useSettingsStore().settings.inbox = {
		enabled: true,
		availableTypes: ['workflow_review', 'self_healing_result'],
		failedTypes: [],
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	enableInbox();
	vi.mocked(api.fetchInboxSummary).mockResolvedValue({
		counts: { open: 2, closed: 1 },
		partial: false,
		failedSources: [],
		disabledSources: [],
	});
	waitingOrClosedRequest.mockResolvedValue(page());
	authoredRequest.mockResolvedValue(page());
	vi.mocked(api.fetchInbox).mockImplementation(async (context, query) =>
		query.category === 'authored'
			? await authoredRequest(context, query)
			: await waitingOrClosedRequest(context, query),
	);
});

describe('Inbox list requests', () => {
	it('restarts from the first page and exposes a failed reload', async () => {
		const pending = createDeferredPromise<ListInboxResponse>();
		const request = vi
			.fn()
			.mockResolvedValueOnce(page([result('first')]))
			.mockReturnValueOnce(pending.promise);
		const slice = createInboxListSlice(request, vi.fn());
		await slice.fetchList();
		const refresh = slice.fetchList();
		expect(slice.items).toEqual([]);
		pending.reject(new Error('temporarily unavailable'));
		await refresh;
		expect(slice.items).toEqual([]);
		expect(slice.error).toBeInstanceOf(Error);
	});

	it('ignores an old load-more response after refreshing from the first page', async () => {
		const pending = createDeferredPromise<ListInboxResponse>();
		const request = vi
			.fn()
			.mockResolvedValueOnce(page([result('first')], { hasMore: true, nextCursor: 'page-2' }))
			.mockReturnValueOnce(pending.promise)
			.mockResolvedValueOnce(page([result('newest')]));
		const slice = createInboxListSlice(request, vi.fn());
		await slice.fetchList();
		const loadMore = slice.loadMore();
		await slice.fetchList();
		pending.resolve(page([result('older')]));
		await loadMore;
		expect(slice.items.map((item) => item.id)).toEqual(['newest']);
		expect(slice.loadingMore).toBe(false);
	});

	it('continues a partial cursor chain and retries a failed page without losing its rows', async () => {
		const partial = { partial: true, failedSources: ['workflow_review' as const] };
		const request = vi
			.fn()
			.mockResolvedValueOnce(
				page([result('first')], { ...partial, hasMore: true, nextCursor: 'partial-page' }),
			)
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValueOnce(page([result('older')], partial));
		const slice = createInboxListSlice(request, vi.fn());
		await slice.fetchList();
		await slice.loadMore();
		expect(slice.nextCursor).toBe('partial-page');
		expect(slice.items).toHaveLength(1);
		await slice.retry();
		expect(request).toHaveBeenLastCalledWith('partial-page');
		expect(slice.items).toHaveLength(2);
		expect(slice.partial).toBe(true);
	});
});

describe('shared Inbox state', () => {
	it('keeps requests for Open and Closed independent', async () => {
		const open = createDeferredPromise<ListInboxResponse>();
		waitingOrClosedRequest.mockImplementation(async (_context, query) =>
			query.state === 'open' ? await open.promise : page([result('closed')]),
		);
		const store = useInboxStore();
		const request = store.refreshListAndSummary();
		await store.setActiveTab('closed');
		open.resolve(page([result('open')]));
		await request;
		expect(store.activeTab).toBe('closed');
		expect(store.lists.closed.items[0].id).toBe('closed');
		expect(store.lists.waiting.items[0].id).toBe('open');
	});

	it('treats a failed count as unknown while the list remains usable', async () => {
		waitingOrClosedRequest.mockResolvedValue(page([result('first')]));
		vi.mocked(api.fetchInboxSummary).mockResolvedValue({
			counts: null,
			partial: true,
			failedSources: ['workflow_review'],
			disabledSources: [],
		});
		const store = useInboxStore();
		await store.refreshListAndSummary();
		expect(store.lists.waiting.items).toHaveLength(1);
		expect(store.openCount).toBeNull();
	});

	it('clears disabled-source rows from both tabs even when all reads fail', async () => {
		const store = useInboxStore();
		store.lists.waiting.items = [result('open')];
		store.lists.closed.items = [result('closed')];
		waitingOrClosedRequest.mockRejectedValue(
			new ResponseError('unavailable', {
				httpStatusCode: 503,
				meta: { disabledSources: ['self_healing_result'], failedSources: ['workflow_review'] },
			}),
		);
		await store.refreshListAndSummary();
		expect(store.lists.waiting.items).toEqual([]);
		expect(store.lists.closed.items).toEqual([]);
		expect(store.disabledSources).toEqual(['self_healing_result']);
	});
});

it('allows a source to recover on a fresh page without a settings reload', async () => {
	const store = useInboxStore();
	waitingOrClosedRequest
		.mockResolvedValueOnce(page([], { disabledSources: ['self_healing_result'] }))
		.mockResolvedValueOnce(page([result('recovered')]));
	await store.refreshListAndSummary();
	expect(store.disabledSources).toContain('self_healing_result');
	await store.refreshListAndSummary();
	expect(store.disabledSources).not.toContain('self_healing_result');
	expect(store.lists.waiting.items[0].id).toBe('recovered');
});

it('allows a source first seen on a later page when settings were stale', async () => {
	useSettingsStore().settings.inbox = {
		enabled: true,
		availableTypes: ['self_healing_result'],
		failedTypes: [],
	};
	const review: InboxItem = {
		type: 'workflow_review',
		id: 'review',
		projectId: 'project',
		title: 'Review',
		workflowName: 'Workflow',
		requester: null,
		authors: [],
		reviewers: [],
		state: 'open',
		decision: 'pending',
		workflowVersionId: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
	waitingOrClosedRequest
		.mockResolvedValueOnce(page([result('newer')], { hasMore: true, nextCursor: 'next' }))
		.mockResolvedValueOnce(page([review]));
	const store = useInboxStore();
	await store.refreshListAndSummary();
	expect(store.disabledSources).toContain('workflow_review');
	await store.lists.waiting.loadMore();
	expect(store.disabledSources).not.toContain('workflow_review');
	expect(store.lists.waiting.items.at(-1)?.id).toBe('review');
});

it('starts a new cursor chain to recover a failed source after paging', async () => {
	const partial = { partial: true, failedSources: ['workflow_review' as const] };
	const request = vi
		.fn()
		.mockResolvedValueOnce(
			page([result('first')], { ...partial, hasMore: true, nextCursor: 'partial-second' }),
		)
		.mockResolvedValueOnce(
			page([result('older')], { ...partial, hasMore: true, nextCursor: 'partial-third' }),
		)
		.mockRejectedValueOnce(new Error('timeout'))
		.mockResolvedValueOnce(
			page([result('recovered')], { hasMore: true, nextCursor: 'complete-second' }),
		);
	const slice = createInboxListSlice(request, vi.fn());
	await slice.fetchList();
	await slice.loadMore();
	await slice.fetchList();
	expect(slice.items).toEqual([]);
	expect(slice.nextCursor).toBeNull();
	await slice.retry();
	expect(request).toHaveBeenLastCalledWith();
	expect(slice.items.map((item) => item.id)).toEqual(['recovered']);
	expect(slice.nextCursor).toBe('complete-second');
	expect(slice.partial).toBe(false);
});

it('continues healthy-source pagination when a summary disables another source', async () => {
	waitingOrClosedRequest
		.mockResolvedValueOnce(page([result('first')], { hasMore: true, nextCursor: 'second' }))
		.mockResolvedValueOnce(page([result('older')], { hasMore: true, nextCursor: 'third' }))
		.mockResolvedValueOnce(page([result('oldest')]));
	const store = useInboxStore();
	await store.refreshListAndSummary();
	await store.lists.waiting.loadMore();
	vi.mocked(api.fetchInboxSummary).mockResolvedValue({
		counts: { open: 3, closed: 0 },
		partial: false,
		failedSources: [],
		disabledSources: ['workflow_review'],
	});
	await store.fetchSummary();
	expect(store.lists.waiting.items.map((item) => item.id)).toEqual(['first', 'older']);
	expect(store.lists.waiting.nextCursor).toBe('third');
	await store.lists.waiting.loadMore();
	expect(waitingOrClosedRequest).toHaveBeenLastCalledWith(
		expect.anything(),
		expect.objectContaining({ cursor: 'third' }),
	);
	expect(store.lists.waiting.items.map((item) => item.id)).toEqual(['first', 'older', 'oldest']);
});

it('requests the two Open categories and omits category for Closed', async () => {
	const store = useInboxStore();
	await store.refreshListAndSummary();
	expect(api.fetchInbox).toHaveBeenCalledWith(expect.anything(), {
		state: 'open',
		category: 'waiting',
		limit: 15,
		cursor: undefined,
	});
	expect(api.fetchInbox).toHaveBeenCalledWith(expect.anything(), {
		state: 'open',
		category: 'authored',
		limit: 15,
		cursor: undefined,
	});
	await store.setActiveTab('closed');
	expect(api.fetchInbox).toHaveBeenLastCalledWith(expect.anything(), {
		state: 'closed',
		category: undefined,
		limit: 15,
		cursor: undefined,
	});
});

it('keeps each Open group cursor and retry independent', async () => {
	waitingOrClosedRequest.mockResolvedValueOnce(
		page([result('waiting')], { hasMore: true, nextCursor: 'waiting-2' }),
	);
	authoredRequest
		.mockResolvedValueOnce(
			page([reviewItem('authored')], { hasMore: true, nextCursor: 'authored-2' }),
		)
		.mockRejectedValueOnce(new Error('timeout'))
		.mockResolvedValueOnce(page([reviewItem('older')]));
	const store = useInboxStore();
	await store.refreshListAndSummary();
	await store.lists.authored.loadMore();
	expect(store.lists.waiting.error).toBeNull();
	expect(store.lists.waiting.nextCursor).toBe('waiting-2');
	expect(store.lists.authored.nextCursor).toBe('authored-2');
	await store.lists.authored.retry();
	expect(authoredRequest).toHaveBeenLastCalledWith(
		expect.anything(),
		expect.objectContaining({ category: 'authored', cursor: 'authored-2' }),
	);
	expect(waitingOrClosedRequest).toHaveBeenCalledOnce();
	expect(store.lists.authored.items.map((item) => item.id)).toEqual(['authored', 'older']);
});

it('requires both groups to be successfully empty before showing the Open empty state', async () => {
	const store = useInboxStore();
	expect(store.isEmpty).toBe(false);
	authoredRequest.mockRejectedValueOnce(new Error('timeout'));
	await store.refreshListAndSummary();
	expect(store.lists.waiting.hasLoaded).toBe(true);
	expect(store.hasError).toBe(true);
	expect(store.isEmpty).toBe(false);
	authoredRequest.mockResolvedValueOnce(
		page([], { partial: true, failedSources: ['workflow_review'] }),
	);
	await store.lists.authored.retry();
	expect(store.partial).toBe(true);
	expect(store.isEmpty).toBe(false);
	await store.lists.authored.fetchList();
	expect(store.isEmpty).toBe(true);
});

it('does not infer Assistant availability from the Authored response', async () => {
	useSettingsStore().settings.inbox = {
		enabled: true,
		availableTypes: ['workflow_review'],
		failedTypes: [],
	};
	const authored = createDeferredPromise<ListInboxResponse>();
	waitingOrClosedRequest.mockResolvedValueOnce(page([result('assistant')]));
	authoredRequest.mockReturnValueOnce(authored.promise);
	const store = useInboxStore();
	const refresh = store.refreshListAndSummary();
	await vi.waitFor(() => expect(store.disabledSources).not.toContain('self_healing_result'));
	authored.resolve(page());
	await refresh;
	expect(store.disabledSources).not.toContain('self_healing_result');
	expect(store.lists.waiting.items[0].id).toBe('assistant');
});

function reviewItem(id: string): InboxItem {
	return {
		type: 'workflow_review',
		id,
		projectId: 'project',
		title: 'Review',
		workflowName: 'Workflow',
		requester: null,
		authors: [],
		reviewers: [],
		state: 'open',
		decision: 'pending',
		workflowVersionId: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
}

it('updates a review decision without discarding loaded pages', async () => {
	const store = useInboxStore();
	store.lists.waiting.items = [reviewItem('first'), reviewItem('older'), result('assistant')];
	store.lists.waiting.nextCursor = 'next-page';
	store.reconcileItemChange({
		type: 'workflow_review',
		id: 'older',
		state: 'open',
		decision: 'changes_requested',
		updatedAt: '2026-01-02T00:00:00.000Z',
	});
	expect(store.lists.waiting.items).toHaveLength(3);
	expect(store.lists.waiting.items[1]).toMatchObject({ decision: 'changes_requested' });
	expect(store.lists.waiting.nextCursor).toBe('next-page');
	expect(api.fetchInbox).not.toHaveBeenCalled();
});

it('removes an approved review from Open and updates the counts', async () => {
	const store = useInboxStore();
	store.openCount = 2;
	store.closedCount = 1;
	store.lists.waiting.items = [reviewItem('review'), result('review')];
	store.reconcileItemChange({
		type: 'workflow_review',
		id: 'review',
		state: 'closed',
		decision: 'approved',
	});
	expect(store.lists.waiting.items).toEqual([result('review')]);
	expect(store.openCount).toBe(1);
	expect(store.closedCount).toBe(2);
});

it('removes only an unavailable item with the same source and ID', () => {
	const store = useInboxStore();
	store.lists.waiting.items = [reviewItem('review'), result('review')];
	store.lists.closed.items = [reviewItem('review')];
	store.reconcileItemChange({ type: 'workflow_review', id: 'review', unavailable: true });
	expect(store.lists.waiting.items).toEqual([result('review')]);
	expect(store.lists.closed.items).toEqual([]);
});
