import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { useAgentN8nChatThreadsStore } from './n8nChatThreads.store';

const mockListN8nChatThreads = vi.fn();
const mockGetN8nChatThread = vi.fn();
const mockDeleteN8nChatThread = vi.fn();
const mockShowError = vi.fn();

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-1' } }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

vi.mock('../composables/useAgentApi', () => ({
	listN8nChatThreads: (...args: unknown[]) => mockListN8nChatThreads(...args),
	getN8nChatThread: (...args: unknown[]) => mockGetN8nChatThread(...args),
	deleteN8nChatThread: (...args: unknown[]) => mockDeleteN8nChatThread(...args),
}));

const makeThread = (id: string, updatedAt: string): AgentN8nChatThreadSummary => ({
	id,
	title: `Thread ${id}`,
	updatedAt,
	agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
});

describe('useAgentN8nChatThreadsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('fetchRecent', () => {
		it('loads the first page into recentThreads', async () => {
			const threads = [makeThread('1', '2025-01-02T00:00:00.000Z')];
			mockListN8nChatThreads.mockResolvedValueOnce({ data: threads, nextCursor: null });
			const store = useAgentN8nChatThreadsStore();

			await store.fetchRecent(10);

			expect(mockListN8nChatThreads).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: 'push-1' },
				{ limit: 10 },
			);
			expect(store.recentThreads).toEqual(threads);
		});

		it('drops a response from an older call that resolves after a newer one', async () => {
			const store = useAgentN8nChatThreadsStore();
			let resolveFirst: (value: { data: AgentN8nChatThreadSummary[]; nextCursor: null }) => void;
			mockListN8nChatThreads.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						resolveFirst = resolve;
					}),
			);
			const firstCall = store.fetchRecent(10);

			const secondPage = [makeThread('2', '2025-01-03T00:00:00.000Z')];
			mockListN8nChatThreads.mockResolvedValueOnce({ data: secondPage, nextCursor: null });
			await store.fetchRecent(10);
			expect(store.recentThreads).toEqual(secondPage);

			resolveFirst!({ data: [makeThread('1', '2025-01-02T00:00:00.000Z')], nextCursor: null });
			await firstCall;

			expect(store.recentThreads).toEqual(secondPage);
		});

		it('keeps the previous list and does not throw when the request fails', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const threads = [makeThread('1', '2025-01-02T00:00:00.000Z')];
			mockListN8nChatThreads.mockResolvedValueOnce({ data: threads, nextCursor: null });
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);

			mockListN8nChatThreads.mockRejectedValueOnce(new Error('network down'));
			await expect(store.fetchRecent(10)).resolves.toBeUndefined();

			expect(store.recentThreads).toEqual(threads);
		});
	});

	describe('knownThreads', () => {
		it('sorts every known thread newest updatedAt first', async () => {
			mockListN8nChatThreads.mockResolvedValueOnce({
				data: [makeThread('old', '2025-01-01T00:00:00.000Z')],
				nextCursor: null,
			});
			mockGetN8nChatThread.mockResolvedValueOnce(makeThread('opened', '2025-01-03T00:00:00.000Z'));
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);
			await store.loadThread('opened');

			expect(store.knownThreads.map((thread) => thread.id)).toEqual(['opened', 'old']);
		});
	});

	describe('loadThread', () => {
		it('fetches a thread missing from recentThreads and adds it', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockGetN8nChatThread.mockResolvedValueOnce(thread);
			const store = useAgentN8nChatThreadsStore();

			await store.loadThread('1');

			expect(mockGetN8nChatThread).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: 'push-1' },
				'1',
			);
			expect(store.threadsById.get('1')).toEqual(thread);
			expect(store.recentThreads).toEqual([]);
		});

		it('keeps a loaded thread when a later fetchRecent replaces the recent list', async () => {
			const opened = makeThread('old', '2024-01-01T00:00:00.000Z');
			mockGetN8nChatThread.mockResolvedValueOnce(opened);
			mockListN8nChatThreads.mockResolvedValueOnce({
				data: [makeThread('new', '2025-01-02T00:00:00.000Z')],
				nextCursor: null,
			});
			const store = useAgentN8nChatThreadsStore();

			await store.loadThread('old');
			await store.fetchRecent(10);

			expect(store.threadsById.get('old')).toEqual(opened);
		});

		it('does not fetch a thread already in recentThreads', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockListN8nChatThreads.mockResolvedValueOnce({ data: [thread], nextCursor: null });
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);

			await store.loadThread('1');

			expect(mockGetN8nChatThread).not.toHaveBeenCalled();
		});

		it('swallows errors, keeping recentThreads unchanged — a missing title must not break the page', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const thread1 = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockListN8nChatThreads.mockResolvedValueOnce({ data: [thread1], nextCursor: null });
			mockGetN8nChatThread.mockRejectedValueOnce(new Error('not found'));
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);

			await expect(store.loadThread('2')).resolves.toBeUndefined();

			expect(store.recentThreads).toEqual([thread1]);
			expect(store.threadsById.has('2')).toBe(false);
		});
	});

	describe('deleteThread', () => {
		it('deletes a known thread via the API and drops it from recentThreads', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockListN8nChatThreads.mockResolvedValueOnce({ data: [thread], nextCursor: null });
			mockDeleteN8nChatThread.mockResolvedValueOnce({ success: true });
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);

			const result = await store.deleteThread(thread);

			expect(mockDeleteN8nChatThread).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: 'push-1' },
				'project-1',
				'agent-1',
				'1',
			);
			expect(result).toBe(true);
			expect(store.recentThreads).toEqual([]);
			expect(store.threadsById.has('1')).toBe(false);
			expect(store.deletedThreadIds.has('1')).toBe(true);
		});

		it('also drops the thread from openedThreads', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockGetN8nChatThread.mockResolvedValueOnce(thread);
			mockDeleteN8nChatThread.mockResolvedValueOnce({ success: true });
			const store = useAgentN8nChatThreadsStore();
			await store.loadThread('1');

			await store.deleteThread(thread);

			expect(store.openedThreads).toEqual([]);
		});

		it('keeps a deleted thread hidden when an older list response lands after the delete', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			let resolveList:
				| ((page: { data: AgentN8nChatThreadSummary[]; nextCursor: null }) => void)
				| undefined;
			mockListN8nChatThreads.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						resolveList = resolve;
					}),
			);
			mockDeleteN8nChatThread.mockResolvedValueOnce({ success: true });
			const store = useAgentN8nChatThreadsStore();
			const fetching = store.fetchRecent(10);

			await store.deleteThread(thread);
			resolveList?.({ data: [thread], nextCursor: null });
			await fetching;

			expect(store.knownThreads).toEqual([]);
		});

		it('deletes a thread the store never loaded, e.g. one found past the recent page', async () => {
			const thread = makeThread('far', '2020-01-01T00:00:00.000Z');
			mockDeleteN8nChatThread.mockResolvedValueOnce({ success: true });
			const store = useAgentN8nChatThreadsStore();

			const result = await store.deleteThread(thread);

			expect(mockDeleteN8nChatThread).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: 'push-1' },
				'project-1',
				'agent-1',
				'far',
			);
			expect(result).toBe(true);
			expect(store.deletedThreadIds.has('far')).toBe(true);
		});

		it('shows an error toast and keeps the thread when the API call fails', async () => {
			const thread = makeThread('1', '2025-01-02T00:00:00.000Z');
			mockListN8nChatThreads.mockResolvedValueOnce({ data: [thread], nextCursor: null });
			mockDeleteN8nChatThread.mockRejectedValueOnce(new Error('network down'));
			const store = useAgentN8nChatThreadsStore();
			await store.fetchRecent(10);

			const result = await store.deleteThread(thread);

			expect(result).toBe(false);
			expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), 'Problem deleting session');
			expect(store.recentThreads).toEqual([thread]);
		});
	});
});
