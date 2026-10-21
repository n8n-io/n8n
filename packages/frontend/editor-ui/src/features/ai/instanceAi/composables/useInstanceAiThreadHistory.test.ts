import { defineComponent, reactive, ref } from 'vue';
import { mount } from '@vue/test-utils';

import { useInstanceAiThreadHistory } from './useInstanceAiThreadHistory';

function emptyHistory() {
	return { search: '', threads: [], hasMore: true, loading: false, error: false };
}

const store = reactive({
	threadHistory: emptyHistory(),
	loadThreadHistoryPage: vi.fn(),
	resetThreadHistory: vi.fn(),
});
vi.mock('../instanceAi.store', () => ({ useInstanceAiStore: () => store }));

let capturedOnIntersect: (() => void) | undefined;
const observeMock = vi.fn();
vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: (options: { onIntersect: () => void }) => {
		capturedOnIntersect = options.onIntersect;
		return { observe: observeMock };
	},
}));

// `watch`/`onMounted` need a live effect scope — same pattern as the sibling n8n Chat composables.
function mountComposable(options?: Parameters<typeof useInstanceAiThreadHistory>[0]) {
	const TestComponent = defineComponent({
		setup() {
			return useInstanceAiThreadHistory(options);
		},
		template: '<div />',
	});
	return mount(TestComponent);
}

describe('useInstanceAiThreadHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.threadHistory = emptyHistory();
	});

	it('wires the sentinel intersect callback to the caller-provided override, not the default loadMore', () => {
		const onSentinelLoadMore = vi.fn();
		mountComposable({ onSentinelLoadMore });
		// The mount's own `onMounted(loadMore)` call, unrelated to the sentinel.
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(1);

		capturedOnIntersect?.();

		expect(onSentinelLoadMore).toHaveBeenCalledTimes(1);
		// The override replaces the default `loadMore` entirely — no extra page fetch from this.
		expect(store.loadThreadHistoryPage).toHaveBeenCalledTimes(1);
	});

	it('does not observe the sentinel while the extra source is still loading, then observes once it stops', async () => {
		const extraLoading = ref(true);
		const wrapper = mountComposable({ isExtraSourceLoading: () => extraLoading.value });
		const sentinel = document.createElement('div');
		wrapper.vm.sentinelRef = sentinel;
		await wrapper.vm.$nextTick();

		expect(observeMock).not.toHaveBeenCalled();

		// A ref read inside the getter, so flipping it re-triggers the watcher directly.
		extraLoading.value = false;
		await wrapper.vm.$nextTick();

		expect(observeMock).toHaveBeenCalledWith(sentinel);
	});
});
