import { useEventListener, useResizeObserver } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

/** Sub-pixel remainder. Keeps the fade from flickering at the end of a list. */
const SCROLL_END_THRESHOLD_PX = 1;

export const scrollMaskBottomAttr = 'data-scroll-mask-bottom';

function resolveElement(source: unknown): HTMLElement | null {
	if (source instanceof HTMLElement) return source;

	if (typeof source === 'object' && source !== null && '$el' in source) {
		const element = source.$el;
		if (element instanceof HTMLElement) return element;
	}

	return null;
}

/**
 * Bottom fade for a scroll container. The fade shows while more content sits
 * below the viewport, and it is absent when the user is at the end.
 *
 * Bind `scrollMaskAttrs` on the scrolling element, and include
 * `scroll-mask-when-bottom` on that element's class.
 */
export function useScrollMask(container: MaybeRefOrGetter<unknown>) {
	const canScrollDown = ref(false);
	const element = computed(() => resolveElement(toValue(container)));

	function update() {
		const node = element.value;
		if (!node) {
			canScrollDown.value = false;
			return;
		}

		canScrollDown.value =
			node.scrollHeight - node.clientHeight - node.scrollTop > SCROLL_END_THRESHOLD_PX;
	}

	useEventListener(element, 'scroll', update, { passive: true });
	useResizeObserver(element, update);

	let mutationObserver: MutationObserver | undefined;
	let childResizeObserver: ResizeObserver | undefined;

	function disconnectContentObservers() {
		mutationObserver?.disconnect();
		mutationObserver = undefined;
		childResizeObserver?.disconnect();
		childResizeObserver = undefined;
	}

	function observeContent(node: HTMLElement) {
		disconnectContentObservers();

		const observeChildren = () => {
			childResizeObserver?.disconnect();
			if (typeof ResizeObserver === 'undefined') return;

			childResizeObserver = new ResizeObserver(update);
			for (const child of node.children) {
				childResizeObserver.observe(child);
			}
		};

		if (typeof MutationObserver !== 'undefined') {
			mutationObserver = new MutationObserver(() => {
				observeChildren();
				update();
			});
			mutationObserver.observe(node, { childList: true, subtree: true });
		}

		observeChildren();
	}

	watch(
		element,
		(node) => {
			if (node) observeContent(node);
			else disconnectContentObservers();
			update();
		},
		{ flush: 'post', immediate: true },
	);

	onScopeDispose(disconnectContentObservers);

	const scrollMaskAttrs = computed(() =>
		canScrollDown.value ? { [scrollMaskBottomAttr]: '' } : {},
	);

	return { canScrollDown, scrollMaskAttrs };
}
