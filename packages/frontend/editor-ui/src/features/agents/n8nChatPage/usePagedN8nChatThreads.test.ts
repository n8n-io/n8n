import { defineComponent, reactive, ref } from 'vue';
import { mount } from '@vue/test-utils';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import {
	usePagedN8nChatThreads,
	type UsePagedN8nChatThreadsOptions,
} from './usePagedN8nChatThreads';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-1' } }),
}));

const listN8nChatThreadsMock = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	listN8nChatThreads: (...args: unknown[]) => listN8nChatThreadsMock(...args),
}));

// `reactive`, not a plain Set: mirrors the real store's ref-wrapped Set, so a
// mutation is seen by the pager's `computed` the same way it would in production.
const deletedThreadIds = reactive(new Set<string>());
vi.mock('./n8nChatThreads.store', () => ({
	useAgentN8nChatThreadsStore: () => ({ deletedThreadIds }),
}));

const thread = (id: string, updatedAt = '2026-01-01T00:00:00.000Z') => ({
	id,
	title: `Thread ${id}`,
	updatedAt,
	agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
});

// `watch` (used for the `agentId`/`search` reset) needs a live effect scope, so the
// composable is exercised through a tiny host component, same pattern as
// `useMergedChatHistory.test.ts`.
function mountComposable(options: Partial<UsePagedN8nChatThreadsOptions> = {}) {
	const TestComponent = defineComponent({
		setup() {
			return usePagedN8nChatThreads({ pageSize: 2, ...options });
		},
		template: '<div />',
	});
	return mount(TestComponent);
}

describe('usePagedN8nChatThreads', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deletedThreadIds.clear();
	});

	it('loads the first page with no cursor', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: null });
		const wrapper = mountComposable();

		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('t1')]));

		expect(listN8nChatThreadsMock).toHaveBeenCalledWith(expect.anything(), {
			limit: 2,
			cursor: undefined,
			agentId: undefined,
		});
		expect(wrapper.vm.hasMore).toBe(false);
	});

	it('pages using the returned cursor and de-dupes by id', async () => {
		listN8nChatThreadsMock
			.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: 'cursor-1' })
			.mockResolvedValueOnce({
				// t1 resurfaces (activity moved its cursor position) alongside a new thread.
				data: [thread('t1'), thread('t2')],
				nextCursor: null,
			});
		const wrapper = mountComposable();

		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(1));
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(2));

		expect(listN8nChatThreadsMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: 'cursor-1' }),
		);
		expect(wrapper.vm.items.map((t: { id: string }) => t.id)).toEqual(['t1', 't2']);
	});

	it('does not start a second request while one is in flight', async () => {
		let resolveFetch: (() => void) | undefined;
		listN8nChatThreadsMock.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveFetch = () => resolve({ data: [], nextCursor: null });
				}),
		);
		const wrapper = mountComposable();

		wrapper.vm.loadNext();
		wrapper.vm.loadNext();
		expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1);

		resolveFetch?.();
		await vi.waitFor(() => expect(wrapper.vm.isLoading).toBe(false));
		expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1);
	});

	it('retrying a failed page re-requests that same page and keeps items already loaded', async () => {
		listN8nChatThreadsMock
			.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: 'cursor-1' })
			.mockRejectedValueOnce(new Error('network down'))
			.mockResolvedValueOnce({ data: [thread('t2')], nextCursor: null });
		const wrapper = mountComposable();

		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(1));
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.error).toBe(true));
		// The failure didn't drop the first page.
		expect(wrapper.vm.items).toEqual([thread('t1')]);

		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(2));

		expect(listN8nChatThreadsMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: 'cursor-1' }),
		);
		expect(wrapper.vm.error).toBe(false);
	});

	it('drops a stale response from before a reset', async () => {
		let resolveFirst:
			| ((value: { data: Array<ReturnType<typeof thread>>; nextCursor: null }) => void)
			| undefined;
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveFirst = resolve;
				}),
		);
		const wrapper = mountComposable();
		wrapper.vm.loadNext();

		wrapper.vm.reset();
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('fresh')], nextCursor: null });
		wrapper.vm.loadNext();

		resolveFirst?.({ data: [thread('stale')], nextCursor: null });
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('fresh')]));
	});

	it('clears isLoading immediately when reset during a pending request', async () => {
		const response = createDeferredPromise<{
			data: AgentN8nChatThreadSummary[];
			nextCursor: string | null;
		}>();
		listN8nChatThreadsMock.mockReturnValueOnce(response.promise);
		const wrapper = mountComposable();
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.isLoading).toBe(true));

		wrapper.vm.reset();
		expect(wrapper.vm.isLoading).toBe(false);

		// The stale request's own completion must not flip it back on.
		response.resolve({ data: [], nextCursor: null });
		await Promise.resolve();
		expect(wrapper.vm.isLoading).toBe(false);
	});

	it('reset keeps the previous items until the fresh first page replaces them', async () => {
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('old')], nextCursor: null });
		const wrapper = mountComposable();
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('old')]));

		let resolveReload:
			| ((value: { data: Array<ReturnType<typeof thread>>; nextCursor: null }) => void)
			| undefined;
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveReload = resolve;
				}),
		);
		wrapper.vm.reset();
		wrapper.vm.loadNext();
		// Still showing the stale list while the reload is in flight.
		expect(wrapper.vm.items).toEqual([thread('old')]);

		resolveReload?.({ data: [thread('new')], nextCursor: null });
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('new')]));
	});

	it("resets paging and clears the previous agent's items when agentId changes, without fetching", async () => {
		const agentId = ref<string | undefined>('agent-1');
		listN8nChatThreadsMock.mockResolvedValue({ data: [thread('t1')], nextCursor: 'cursor-1' });
		const wrapper = mountComposable({ agentId: () => agentId.value });
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(1));

		listN8nChatThreadsMock.mockClear();
		agentId.value = 'agent-2';
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.items).toEqual([]);
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();
		expect(wrapper.vm.hasMore).toBe(true);

		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t2')], nextCursor: null });
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('t2')]));
		expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: undefined, agentId: 'agent-2' }),
		);
	});

	it('clears and reloads when the search term changes', async () => {
		const search = ref<string | undefined>(undefined);
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: 'cursor-1' });
		const wrapper = mountComposable({ search: () => search.value });
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('t1')]));

		let resolveSearch:
			| ((value: { data: Array<ReturnType<typeof thread>>; nextCursor: null }) => void)
			| undefined;
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveSearch = resolve;
				}),
		);
		search.value = 'refund';
		await wrapper.vm.$nextTick();
		// The old list never shows under the new term.
		expect(wrapper.vm.items).toEqual([]);

		resolveSearch?.({ data: [thread('t2')], nextCursor: null });
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('t2')]));
		expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: undefined, search: 'refund' }),
		);
	});

	it('drops a deleted id from items without disturbing the cursor', async () => {
		listN8nChatThreadsMock
			.mockResolvedValueOnce({ data: [thread('t1'), thread('t2')], nextCursor: 'cursor-1' })
			.mockResolvedValueOnce({ data: [thread('t3')], nextCursor: null });
		const wrapper = mountComposable();
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toHaveLength(2));

		deletedThreadIds.add('t1');
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.items.map((t: { id: string }) => t.id)).toEqual(['t2']);

		// The deleted id never resurfaces de-dup, and the next page still starts from
		// the cursor the raw (unfiltered) list returned — paging is unaffected.
		wrapper.vm.loadNext();
		await vi.waitFor(() =>
			expect(wrapper.vm.items.map((t: { id: string }) => t.id)).toEqual(['t2', 't3']),
		);
		expect(listN8nChatThreadsMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ cursor: 'cursor-1' }),
		);
	});

	it('disabled: a search change clears items but does not request; enabling later allows loadNext to fetch', async () => {
		const enabled = ref(true);
		const search = ref<string | undefined>(undefined);
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('old')], nextCursor: null });
		const wrapper = mountComposable({ enabled: () => enabled.value, search: () => search.value });
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('old')]));
		listN8nChatThreadsMock.mockClear();
		listN8nChatThreadsMock.mockResolvedValueOnce({ data: [thread('t1')], nextCursor: null });

		enabled.value = false;
		search.value = 'refund';
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.items).toEqual([]);
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();

		// A manual loadNext() while disabled is also a no-op.
		wrapper.vm.loadNext();
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();

		enabled.value = true;
		wrapper.vm.loadNext();
		await vi.waitFor(() => expect(wrapper.vm.items).toEqual([thread('t1')]));
		expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ search: 'refund' }),
		);
	});
});
