import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import { DEBOUNCE_TIME } from '@/app/constants';
import { useInstanceAiStore } from '../instanceAi.store';

/**
 * Server-side searched, cursor-paged chat list for one mounted list at a time.
 * Bind `search` to the input, `listRef` to the scroll container and `sentinelRef` to an
 * element after the last row. Loads on mount and clears the store state on unmount.
 */
export function useInstanceAiThreadHistory() {
	const store = useInstanceAiStore();
	const history = computed(() => store.threadHistory);
	const search = ref('');
	const listRef = ref<HTMLElement | null>(null);
	const sentinelRef = ref<HTMLElement | null>(null);

	function loadMore() {
		void store.loadThreadHistoryPage();
	}

	// A component-scoped watcher stops on unmount, so a search that is still debouncing
	// when the user leaves does not reload the shared state.
	const debouncedSearch = refDebounced(search, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	watch(debouncedSearch, (value) => {
		store.resetThreadHistory(value.trim());
		loadMore();
	});

	// The observer fires once per observe() call. Re-arm it after every page so a sentinel that
	// is still in view (short list in a tall window) loads the next page right away.
	const { observe } = useIntersectionObserver({ root: listRef, onIntersect: loadMore });
	watch(
		[sentinelRef, () => history.value.loading],
		([sentinel, loading]) => {
			if (sentinel && !loading) observe(sentinel);
		},
		{ flush: 'post' },
	);

	onMounted(loadMore);
	onBeforeUnmount(() => store.resetThreadHistory());

	return { history, search, listRef, sentinelRef, loadMore };
}
