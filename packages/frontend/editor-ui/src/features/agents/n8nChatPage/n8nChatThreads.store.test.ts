import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { useAgentN8nChatThreadsStore } from './n8nChatThreads.store';

const mockListN8nChatThreads = vi.fn();

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-1' } }),
}));

vi.mock('../composables/useAgentApi', () => ({
	listN8nChatThreads: (...args: unknown[]) => mockListN8nChatThreads(...args),
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
});
