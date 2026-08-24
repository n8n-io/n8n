import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	defaultAgentSessionFilters,
	type AgentExecutionThread,
	type AgentSessionFilters,
	type ThreadsPage,
} from '../composables/useAgentThreadsApi';
import { useAgentSessionsStore } from '../agentSessions.store';

const { listThreads } = vi.hoisted(() => ({ listThreads: vi.fn() }));

vi.mock('../composables/useAgentThreadsApi', async (importOriginal) => ({
	...(await importOriginal()),
	listThreads,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest' } }),
}));

function thread(id: string): AgentExecutionThread {
	return {
		id,
		agentId: 'agent-1',
		agentName: 'Agent',
		parentThreadId: null,
		parentAgentId: null,
		projectId: 'project-1',
		taskId: null,
		sessionNumber: 1,
		title: id,
		emoji: null,
		totalPromptTokens: 0,
		totalCompletionTokens: 0,
		totalCost: 0,
		totalDuration: 0,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		failureSummary: null,
		status: 'succeeded',
	};
}

function page(ids: string[], nextCursor: string | null): ThreadsPage {
	return { threads: ids.map(thread), nextCursor };
}

describe('useAgentSessionsStore', () => {
	const errorFilters: AgentSessionFilters = {
		status: 'error',
		origin: 'slack',
		startDate: '',
		endDate: '',
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('clears the current page while replacing it with filtered results', async () => {
		listThreads.mockResolvedValueOnce(page(['all-session'], 'all-cursor'));
		const filteredPage = Promise.withResolvers<ThreadsPage>();
		listThreads.mockReturnValueOnce(filteredPage.promise);
		const store = useAgentSessionsStore();
		await store.fetchThreads('project-1', 'agent-1');

		const request = store.setFilters('project-1', 'agent-1', errorFilters);

		expect(store.threads).toEqual([]);
		expect(store.nextCursor).toBeNull();
		filteredPage.resolve(page(['failed-session'], 'failed-cursor'));
		await request;

		expect(store.threads.map(({ id }) => id)).toEqual(['failed-session']);
		expect(store.nextCursor).toBe('failed-cursor');
	});

	it('retains the active filter across refresh and pagination without changing it for overrides', async () => {
		const firstPageIds = Array.from({ length: 20 }, (_, index) => `failed-${index + 1}`);
		listThreads
			.mockResolvedValueOnce(page(firstPageIds, 'cursor-1'))
			.mockResolvedValueOnce(page(firstPageIds, 'cursor-1'))
			.mockResolvedValueOnce(page(['failed-21'], null))
			.mockResolvedValueOnce(page(['all-session'], null));
		const store = useAgentSessionsStore();

		await store.setFilters('project-1', 'agent-1', errorFilters);
		await store.refreshThreads('project-1', 'agent-1');
		await store.loadMore('project-1', 'agent-1');
		await store.fetchThreads('project-1', 'agent-1', {
			filters: defaultAgentSessionFilters(),
		});

		expect(listThreads.mock.calls.slice(0, 3).map((call) => call[3])).toEqual([
			{ limit: 20, filters: errorFilters },
			{ limit: 20, filters: errorFilters },
			{ limit: 20, cursor: 'cursor-1', filters: errorFilters },
		]);
		expect(store.filters).toEqual(errorFilters);
		expect(listThreads).toHaveBeenLastCalledWith({ baseUrl: '/rest' }, 'project-1', 'agent-1', {
			limit: 20,
			filters: defaultAgentSessionFilters(),
		});
	});

	it('removes a loaded tail session that no longer matches on refresh', async () => {
		const firstPageIds = Array.from({ length: 20 }, (_, index) => `failed-${index + 1}`);
		listThreads
			.mockResolvedValueOnce(page(firstPageIds, 'cursor-1'))
			.mockResolvedValueOnce(page(['matching-tail', 'stale-tail'], 'cursor-2'))
			.mockResolvedValueOnce(
				page([...firstPageIds, 'matching-tail', 'replacement-tail'], 'refreshed-cursor'),
			);
		const store = useAgentSessionsStore();

		await store.setFilters('project-1', 'agent-1', errorFilters);
		await store.loadMore('project-1', 'agent-1');
		await store.refreshThreads('project-1', 'agent-1');

		expect(listThreads).toHaveBeenLastCalledWith({ baseUrl: '/rest' }, 'project-1', 'agent-1', {
			limit: 22,
			filters: errorFilters,
		});
		expect(store.threads.map(({ id }) => id)).toEqual([
			...firstPageIds,
			'matching-tail',
			'replacement-tail',
		]);
		expect(store.nextCursor).toBe('refreshed-cursor');
	});

	it('keeps a page loaded while a background refresh is in flight', async () => {
		const firstPageIds = Array.from({ length: 20 }, (_, index) => `session-${index + 1}`);
		const refreshedPage = Promise.withResolvers<ThreadsPage>();
		const nextPage = Promise.withResolvers<ThreadsPage>();
		listThreads
			.mockResolvedValueOnce(page(firstPageIds, 'cursor-1'))
			.mockReturnValueOnce(refreshedPage.promise)
			.mockReturnValueOnce(nextPage.promise);
		const store = useAgentSessionsStore();
		await store.fetchThreads('project-1', 'agent-1');

		const refreshRequest = store.refreshThreads('project-1', 'agent-1');
		const loadMoreRequest = store.loadMore('project-1', 'agent-1');
		nextPage.resolve(page(['session-21'], 'cursor-2'));
		await loadMoreRequest;
		refreshedPage.resolve(page(firstPageIds, 'cursor-1'));
		await refreshRequest;

		expect(store.threads.map(({ id }) => id)).toEqual([...firstPageIds, 'session-21']);
		expect(store.nextCursor).toBe('cursor-2');
	});

	it('keeps the newest result when background refreshes overlap', async () => {
		const initialIds = Array.from({ length: 20 }, (_, index) => `session-${index + 1}`);
		const olderRefresh = Promise.withResolvers<ThreadsPage>();
		const newerRefresh = Promise.withResolvers<ThreadsPage>();
		listThreads
			.mockResolvedValueOnce(page(initialIds, 'cursor-1'))
			.mockReturnValueOnce(olderRefresh.promise)
			.mockReturnValueOnce(newerRefresh.promise);
		const store = useAgentSessionsStore();
		await store.fetchThreads('project-1', 'agent-1');

		const olderRequest = store.refreshThreads('project-1', 'agent-1');
		const newerRequest = store.refreshThreads('project-1', 'agent-1');
		newerRefresh.resolve(page(['newest', ...initialIds.slice(1)], 'cursor-1'));
		await newerRequest;
		olderRefresh.resolve(page(['stale', ...initialIds.slice(1)], 'cursor-1'));
		await olderRequest;

		expect(store.threads.map(({ id }) => id)).toEqual(['newest', ...initialIds.slice(1)]);
	});

	it('ignores a stale response from an earlier filter', async () => {
		const errorPage = Promise.withResolvers<ThreadsPage>();
		const runningPage = Promise.withResolvers<ThreadsPage>();
		listThreads.mockReturnValueOnce(errorPage.promise).mockReturnValueOnce(runningPage.promise);
		const store = useAgentSessionsStore();

		const firstRequest = store.setFilters('project-1', 'agent-1', errorFilters);
		const secondRequest = store.setFilters('project-1', 'agent-1', {
			...errorFilters,
			status: 'running',
		});
		runningPage.resolve(page(['running-session'], null));
		await secondRequest;
		errorPage.resolve(page(['error-session'], null));
		await firstRequest;

		expect(store.threads.map(({ id }) => id)).toEqual(['running-session']);
	});
});
