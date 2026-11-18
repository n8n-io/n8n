import { nextTick, ref, watch, type MaybeRefOrGetter, toValue } from 'vue';

/**
 * Scrolls a thread to its last entry when an entry is added. The first load keeps the top
 * of the thread in view, so the description stays visible.
 */
export function useScrollToNewest(count: MaybeRefOrGetter<number>) {
	const anchor = ref<HTMLElement | null>(null);

	watch(
		() => toValue(count),
		async (next, previous) => {
			if (next <= previous || previous === 0) return;
			await nextTick();
			anchor.value?.scrollIntoView({ block: 'end', behavior: 'smooth' });
		},
	);

	return { anchor };
}
