/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

import { useMergedChatHistory, type UseMergedChatHistoryOptions } from './useMergedChatHistory';

// A real ref, not a plain object — the composable's `watch(isAgentsN8nChatFlag, ...)` must
// react to this changing after mount, which a plain `{ value }` object cannot trigger.
const n8nChatFlag = ref(true);
vi.mock('@/features/agents/composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => n8nChatFlag,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-1' } }),
}));

const listN8nChatThreadsMock = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	listN8nChatThreads: (...args: unknown[]) => listN8nChatThreadsMock(...args),
}));

const assistantLoadMore = vi.fn();
const assistantHistory = ref({
	search: '',
	threads: [] as Array<{ id: string; title: string; createdAt: string; updatedAt: string }>,
	hasMore: false,
	loading: false,
	error: false,
});
let capturedSentinelLoadMore: (() => void) | undefined;
let capturedIsExtraSourceLoading: (() => boolean) | undefined;
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiThreadHistory', () => ({
	useInstanceAiThreadHistory: (options?: {
		onSentinelLoadMore?: () => void;
		isExtraSourceLoading?: () => boolean;
	}) => {
		capturedSentinelLoadMore = options?.onSentinelLoadMore;
		capturedIsExtraSourceLoading = options?.isExtraSourceLoading;
		return {
			history: assistantHistory,
			search: ref(''),
			listRef: ref(null),
			sentinelRef: ref(null),
			loadMore: assistantLoadMore,
		};
	},
}));

// The composable reads the store directly (see its own comment on why), so the agent
// pager's search term tracks the same `assistantHistory` ref the tests drive above.
vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		get threadHistory() {
			return assistantHistory.value;
		},
	}),
}));

const agentThread = (id: string, updatedAt: string) => ({
	id,
	title: `Agent ${id}`,
	updatedAt,
	agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
});

// Lifecycle hooks (onMounted/onBeforeUnmount) only fire inside a real component
// instance, so the composable is exercised through a tiny host component.
// Tracked and unmounted after every test: left mounted, a previous test's instance
// keeps reacting to the shared `assistantHistory`/`n8nChatFlag` refs below.
let mountedWrappers: Array<ReturnType<typeof mount>> = [];
function mountComposable(options?: UseMergedChatHistoryOptions) {
	const TestComponent = defineComponent({
		setup() {
			return useMergedChatHistory(options);
		},
		template: '<div />',
	});
	const wrapper = mount(TestComponent);
	mountedWrappers.push(wrapper);
	return wrapper;
}

describe('useMergedChatHistory', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		n8nChatFlag.value = true;
		capturedSentinelLoadMore = undefined;
		assistantHistory.value = {
			search: '',
			threads: [],
			hasMore: false,
			loading: false,
			error: false,
		};
		// nextCursor non-null by default — hasMore stays true so a follow-up loadMore has
		// something to do; tests that need the source exhausted override this.
		listN8nChatThreadsMock.mockResolvedValue({ data: [], nextCursor: 'cursor-1' });
	});

	afterEach(() => {
		mountedWrappers.forEach((wrapper) => wrapper.unmount());
		mountedWrappers = [];
	});

	it('fetches the first agent page on mount', async () => {
		mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-1' },
			{ limit: 30, cursor: undefined },
		);
	});

	it('makes no agent request when disabled, regardless of the flag', async () => {
		const wrapper = mountComposable({ enabled: false });
		await wrapper.vm.$nextTick();
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();
	});

	it('starts loading agent threads once the flag turns on after mount', async () => {
		n8nChatFlag.value = false;
		const wrapper = mountComposable();
		await wrapper.vm.$nextTick();
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();

		n8nChatFlag.value = true;
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
	});

	it('does not fetch agent threads for an assistant search change while the flag is off', async () => {
		n8nChatFlag.value = false;
		const wrapper = mountComposable();
		await wrapper.vm.$nextTick();
		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();

		assistantHistory.value = { ...assistantHistory.value, search: 'refund' };
		await wrapper.vm.$nextTick();

		expect(listN8nChatThreadsMock).not.toHaveBeenCalled();
	});

	it('the scroll sentinel loads both sources through the merged loadMore', async () => {
		mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		listN8nChatThreadsMock.mockClear();
		assistantLoadMore.mockClear();
		assistantHistory.value = { ...assistantHistory.value, hasMore: true };

		capturedSentinelLoadMore?.();

		expect(assistantLoadMore).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
	});

	it('still shows assistant threads and surfaces an error when the agent fetch fails', async () => {
		assistantHistory.value = {
			...assistantHistory.value,
			threads: [
				{ id: 'a1', title: 'Assistant chat', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
			],
		};
		listN8nChatThreadsMock.mockRejectedValueOnce(new Error('network down'));

		const wrapper = mountComposable();
		await vi.waitFor(() => expect(wrapper.vm.error).toBe(true));

		expect(wrapper.vm.items.map((item: { thread: { id: string } }) => item.thread.id)).toEqual([
			'a1',
		]);
		expect(wrapper.vm.hasMore).toBe(false);
	});

	it('reports the agent fetch as loading so the sentinel re-arms after it', async () => {
		let resolveFetch: (() => void) | undefined;
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveFetch = () => resolve({ data: [], nextCursor: null });
				}),
		);

		mountComposable();
		await vi.waitFor(() => expect(capturedIsExtraSourceLoading?.()).toBe(true));

		resolveFetch?.();
		await vi.waitFor(() => expect(capturedIsExtraSourceLoading?.()).toBe(false));
	});

	it('shows agent threads while the assistant list is empty, still paging or failed', async () => {
		assistantHistory.value = { ...assistantHistory.value, hasMore: true, error: true };
		listN8nChatThreadsMock.mockResolvedValueOnce({
			data: [agentThread('g1', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});

		const wrapper = mountComposable();

		await vi.waitFor(() =>
			expect(wrapper.vm.items.map((item: { thread: { id: string } }) => item.thread.id)).toEqual([
				'g1',
			]),
		);
	});

	it('makes one agent request per source for concurrent loadMore calls', async () => {
		let resolveFetch: (() => void) | undefined;
		listN8nChatThreadsMock.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveFetch = () => resolve({ data: [], nextCursor: null });
				}),
		);

		// The initial mount's own fetch is already in flight — these must not start more.
		const wrapper = mountComposable();
		wrapper.vm.loadMore();
		wrapper.vm.loadMore();
		expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1);

		resolveFetch?.();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
	});

	it('de-duplicates agent threads by id across pages', async () => {
		listN8nChatThreadsMock
			.mockResolvedValueOnce({
				data: [agentThread('g1', '2026-01-02T00:00:00.000Z')],
				nextCursor: '2026-01-02T00:00:00.000Z',
			})
			.mockResolvedValueOnce({
				// Same thread resurfaces on the next page (e.g. activity moved its cursor position).
				data: [
					agentThread('g1', '2026-01-02T00:00:00.000Z'),
					agentThread('g2', '2026-01-01T00:00:00.000Z'),
				],
				nextCursor: null,
			});

		const wrapper = mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		wrapper.vm.loadMore();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(2));

		const ids = wrapper.vm.items.map((item: { thread: { id: string } }) => item.thread.id);
		expect(ids).toEqual(['g1', 'g2']);
	});

	it('includes agent threads from the server when the assistant search term changes', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [], nextCursor: null });
		const wrapper = mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		listN8nChatThreadsMock.mockClear();
		listN8nChatThreadsMock.mockResolvedValueOnce({
			data: [agentThread('g1', '2026-01-02T00:00:00.000Z')],
			nextCursor: null,
		});

		assistantHistory.value = { ...assistantHistory.value, search: 'refund' };
		await wrapper.vm.$nextTick();

		await vi.waitFor(() =>
			expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ search: 'refund' }),
			),
		);
		expect(wrapper.vm.items.map((item: { thread: { id: string } }) => item.thread.id)).toEqual([
			'g1',
		]);
	});

	it('keeps showing assistant matches while a new search waits for its first agent page', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [], nextCursor: null });
		const wrapper = mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));

		let resolveSearch: ((value: { data: never[]; nextCursor: null }) => void) | undefined;
		listN8nChatThreadsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveSearch = resolve;
				}),
		);
		assistantHistory.value = {
			...assistantHistory.value,
			search: 'refund',
			hasMore: true,
			threads: [{ id: 'a1', title: 'Refund', createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
		};
		await wrapper.vm.$nextTick();

		// The agent page for the new term is still pending: the assistant match must not hide.
		expect(wrapper.vm.items.map((item: { thread: { id: string } }) => item.thread.id)).toEqual([
			'a1',
		]);
		resolveSearch?.({ data: [], nextCursor: null });
	});

	it('clearing the search restores the normal agent-thread request', async () => {
		listN8nChatThreadsMock.mockResolvedValue({ data: [], nextCursor: null });
		assistantHistory.value = { ...assistantHistory.value, search: 'refund' };
		const wrapper = mountComposable();
		await vi.waitFor(() => expect(listN8nChatThreadsMock).toHaveBeenCalledTimes(1));
		listN8nChatThreadsMock.mockClear();

		assistantHistory.value = { ...assistantHistory.value, search: '' };
		await wrapper.vm.$nextTick();

		await vi.waitFor(() =>
			expect(listN8nChatThreadsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ search: undefined }),
			),
		);
	});
});
