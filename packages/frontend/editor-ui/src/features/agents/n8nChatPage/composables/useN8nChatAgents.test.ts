/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { AgentChatListResponse } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { useN8nChatAgents } from './useN8nChatAgents';

const listN8nChatAgentsMock = vi.fn();
vi.mock('../../composables/useAgentApi', () => ({
	listN8nChatAgents: (...args: unknown[]) => listN8nChatAgentsMock(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

const showErrorMock = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

describe('useN8nChatAgents', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches on mount with the given query, page, and pageSize, and a fixed sortBy', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenCalledWith(expect.anything(), {
			query: '',
			skip: 0,
			take: 50,
			sortBy: 'usage:desc',
		});
	});

	it('refetches with an updated skip when the page changes', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		page.value = 2;
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenLastCalledWith(expect.anything(), {
			query: '',
			skip: 50,
			take: 50,
			sortBy: 'usage:desc',
		});
	});

	it('refetches with the new take and skip when the page size changes', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });
		const query = ref('');
		const page = ref(2);
		const pageSize = ref(50);

		useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		pageSize.value = 25;
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenLastCalledWith(expect.anything(), {
			query: '',
			skip: 25,
			take: 25,
			sortBy: 'usage:desc',
		});
	});

	it('passes the query through untrimmed — trimming is `listN8nChatAgents`’ job', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		query.value = '  support  ';
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenLastCalledWith(expect.anything(), {
			query: '  support  ',
			skip: 0,
			take: 50,
			sortBy: 'usage:desc',
		});
	});

	it('drops a stale response that resolves after a newer request', async () => {
		const first = createDeferredPromise<AgentChatListResponse>();
		const second = createDeferredPromise<AgentChatListResponse>();
		listN8nChatAgentsMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		const { agents, count } = useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		page.value = 2;
		await flushPromises();

		// Newer request (page 2) resolves first; older (page 1) resolves after.
		second.resolve({
			count: 1,
			data: [{ id: 'a2', name: 'Two', project: { id: 'p', name: 'P' } }],
		});
		await flushPromises();
		first.resolve({ count: 1, data: [{ id: 'a1', name: 'One', project: { id: 'p', name: 'P' } }] });
		await flushPromises();

		expect(agents.value).toEqual([{ id: 'a2', name: 'Two', project: { id: 'p', name: 'P' } }]);
		expect(count.value).toBe(1);
	});

	it('drops a stale rejection that arrives after a newer request already resolved', async () => {
		const first = createDeferredPromise<AgentChatListResponse>();
		const second = createDeferredPromise<AgentChatListResponse>();
		listN8nChatAgentsMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		const { agents, loadFailed } = useN8nChatAgents({ query, page, pageSize });
		await flushPromises();

		page.value = 2;
		await flushPromises();

		// Newer request (page 2) resolves first; older (page 1) fails after.
		second.resolve({
			count: 1,
			data: [{ id: 'a2', name: 'Two', project: { id: 'p', name: 'P' } }],
		});
		await flushPromises();
		first.reject(new Error('network down'));
		await flushPromises();

		expect(showErrorMock).not.toHaveBeenCalled();
		expect(loadFailed.value).toBe(false);
		expect(agents.value).toEqual([{ id: 'a2', name: 'Two', project: { id: 'p', name: 'P' } }]);
	});

	it('toasts a translated error, clears results, flags loadFailed, and stops loading on failure', async () => {
		listN8nChatAgentsMock
			.mockResolvedValueOnce({
				count: 1,
				data: [{ id: 'a1', name: 'One', project: { id: 'p', name: 'P' } }],
			})
			.mockRejectedValueOnce(new Error('network down'));
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		const { agents, count, isLoading, loadFailed } = useN8nChatAgents({ query, page, pageSize });
		await flushPromises();
		expect(agents.value).toHaveLength(1);
		expect(loadFailed.value).toBe(false);

		page.value = 2;
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Couldn't load agents. Try again.",
		);
		expect(isLoading.value).toBe(false);
		expect(loadFailed.value).toBe(true);
		// Stale results/count must not linger once the fetch has failed.
		expect(agents.value).toEqual([]);
		expect(count.value).toBe(0);
	});

	it('drops a response that settles after the owning scope is stopped — no toast, no state mutation', async () => {
		const pending = createDeferredPromise<AgentChatListResponse>();
		listN8nChatAgentsMock.mockReturnValueOnce(pending.promise);
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		const scope = effectScope();
		const { agents, loadFailed } = scope.run(() => useN8nChatAgents({ query, page, pageSize }))!;
		await flushPromises();

		scope.stop();
		pending.reject(new Error('network down'));
		await flushPromises();

		expect(showErrorMock).not.toHaveBeenCalled();
		expect(agents.value).toEqual([]);
		expect(loadFailed.value).toBe(false);
	});

	it('retry() re-fetches and clears loadFailed on success', async () => {
		listN8nChatAgentsMock.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce({
			count: 1,
			data: [{ id: 'a1', name: 'One', project: { id: 'p', name: 'P' } }],
		});
		const query = ref('');
		const page = ref(1);
		const pageSize = 50;

		const { agents, loadFailed, retry } = useN8nChatAgents({ query, page, pageSize });
		await flushPromises();
		expect(loadFailed.value).toBe(true);

		retry();
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenCalledTimes(2);
		expect(loadFailed.value).toBe(false);
		expect(agents.value).toHaveLength(1);
	});
});
