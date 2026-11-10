import { useResizeObserver, useScroll } from '@vueuse/core';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export const scrollMaskBottomAttr = 'data-scroll-mask-bottom';

/**
 * Shows a bottom fade while a list can scroll further down.
 * VueUse `useScroll` reads the scroll position.
 * Bind `scrollMaskAttrs` on the scrolling element.
 * Add the `scroll-mask-when-bottom` mixin to that element's class.
 */
export function useScrollMask(container: MaybeRefOrGetter<HTMLElement | null | undefined>) {
	const element = computed(() => toValue(container) ?? null);
	// `useScroll` starts as "not at the bottom", including when the element is missing.
	// Keep the fade off until the first measure so a short list does not flash.
	const measured = ref(false);

	const { arrivedState, measure } = useScroll(element, {
		observe: { mutation: true },
	});

	function update() {
		if (!element.value) {
			measured.value = false;
			return;
		}

		measure();
		measured.value = true;
	}

	useResizeObserver(element, update);
	watch(element, update, { flush: 'post', immediate: true });

	const canScrollDown = computed(() => measured.value && !arrivedState.bottom);

	const scrollMaskAttrs = computed(() =>
		canScrollDown.value ? { [scrollMaskBottomAttr]: '' } : {},
	);

	return { canScrollDown, scrollMaskAttrs };
}
