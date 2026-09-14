import { N8nInput } from '@n8n/design-system';
import { shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive } from 'vue';
import InstanceAiThreadsView from '../InstanceAiThreadsView.vue';

type Row = { id: string; title: string; createdAt: string; updatedAt: string };

function emptyHistory(search = '') {
	return { search, threads: [] as Row[], hasMore: true, loading: false, error: false };
}

const store = reactive({
	threadHistory: emptyHistory(),
	loadThreadHistoryPage: vi.fn(),
	resetThreadHistory: vi.fn((search = '') => {
		store.threadHistory = emptyHistory(search);
	}),
	renameThread: vi.fn(),
	deleteThread: vi.fn(),
});

vi.mock('../instanceAi.store', () => ({ useInstanceAiStore: () => store }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({ observe: vi.fn() }),
}));

function mountView() {
	return shallowMount(InstanceAiThreadsView, {
		global: {
			renderStubDefaultSlot: true,
			stubs: { RouterLink: { template: '<a><slot /></a>' } },
		},
	});
}

describe('InstanceAiThreadsView', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		store.resetThreadHistory();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loads the first page on mount and renders the rows', async () => {
		const wrapper = mountView();
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(1);

		store.threadHistory.threads = [
			{ id: 'a', title: 'Alpha', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
			{ id: 'b', title: 'Beta', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
		];
		store.threadHistory.hasMore = false;
		await nextTick();

		const rows = wrapper.findAll('[data-test-id="instance-ai-history-thread"]');
		expect(rows.map((row) => row.text())).toEqual([
			expect.stringContaining('Alpha'),
			expect.stringContaining('Beta'),
		]);
	});

	it('offers a retry after a failed page', async () => {
		const wrapper = mountView();
		store.threadHistory.error = true;
		await nextTick();

		expect(wrapper.text()).toContain("Couldn't load chats");
		await wrapper.find('[data-test-id="instance-ai-threads-retry"]').trigger('click');
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(2);
	});

	it('restarts the list with the debounced search text', async () => {
		const wrapper = mountView();
		wrapper.findComponent(N8nInput).vm.$emit('update:modelValue', ' invoice ');
		await nextTick();
		expect(store.resetThreadHistory).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		expect(store.resetThreadHistory).toHaveBeenCalledWith('invoice');
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(2);
	});

	it('drops a search that is still debouncing when the page is left', async () => {
		const wrapper = mountView();
		wrapper.findComponent(N8nInput).vm.$emit('update:modelValue', 'invoice');
		await nextTick();
		wrapper.unmount();

		await vi.advanceTimersByTimeAsync(1000);
		expect(store.resetThreadHistory).toHaveBeenCalledTimes(1);
		expect(store.threadHistory.search).toBe('');
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(1);
	});

	it('clears the history when the page is left', () => {
		mountView().unmount();
		expect(store.resetThreadHistory).toHaveBeenCalledTimes(1);
		expect(store.threadHistory.search).toBe('');
	});
});
