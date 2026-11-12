import { render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import N8nChatScrollArea from './ChatScrollArea.vue';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;

/** Callbacks of the fake observers, keyed by the observed element. */
const observerCallbacks = new Map<Element, ObserverCallback>();

/** Fake IntersectionObserver that lets a test trigger an entry for a target. */
/** When `true`, the fake observer reports each target as visible when it starts to observe it. */
let intersectOnObserve = false;

class FakeIntersectionObserver {
	constructor(private readonly onIntersect: ObserverCallback) {}

	observe(target: Element) {
		observerCallbacks.set(target, this.onIntersect);
		if (intersectOnObserve) this.onIntersect([{ isIntersecting: true, target }]);
	}

	unobserve(target: Element) {
		observerCallbacks.delete(target);
	}

	disconnect() {}

	takeRecords() {
		return [];
	}
}

/** Fires an intersection entry for the top sentinel of the viewport. */
function triggerTopSentinel(viewport: HTMLElement) {
	const sentinel = viewport.firstElementChild;
	if (!sentinel) throw new Error('Top sentinel not found');
	const onIntersect = observerCallbacks.get(sentinel);
	if (!onIntersect) throw new Error('Top sentinel is not observed');
	onIntersect([{ isIntersecting: true, target: sentinel }]);
}

/**
 * Sets a fixed `scrollTop` on an element, because jsdom does not scroll.
 * Writes from the component are ignored, so the value stays fixed.
 */
function setScrollTop(element: HTMLElement, value: number) {
	Object.defineProperty(element, 'scrollTop', {
		configurable: true,
		get: () => value,
		set: () => {},
	});
}

function renderScrollArea(props: { loadingOlder?: boolean } = {}) {
	return render(N8nChatScrollArea, {
		props,
		slots: {
			default: '<p>First message</p>',
			input: '<div>Chat input</div>',
		},
	});
}

describe('N8nChatScrollArea', () => {
	beforeEach(() => {
		vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
	});

	afterEach(() => {
		observerCallbacks.clear();
		intersectOnObserve = false;
		vi.unstubAllGlobals();
	});

	it('should render the default and input slots', () => {
		const { getByText, getByTestId } = renderScrollArea();

		expect(getByTestId('chat-scroll-area')).toBeInTheDocument();
		expect(getByText('First message')).toBeInTheDocument();
		expect(getByText('Chat input')).toBeInTheDocument();
	});

	it('should match the snapshot', () => {
		const { html } = renderScrollArea();

		expect(html()).toMatchSnapshot();
	});

	describe('load-older', () => {
		it('should ignore a visible top before the first jump to the bottom', async () => {
			intersectOnObserve = true;
			const { emitted } = renderScrollArea();

			await flushPromises();

			/** Only the emit from mount. The early observer entry is ignored. */
			expect(emitted('load-older')).toHaveLength(1);
		});

		it('should emit once on mount when the thread is too short to scroll', async () => {
			const { emitted } = renderScrollArea();

			await flushPromises();

			expect(emitted('load-older')).toHaveLength(1);
		});

		it('should not emit on mount when the top is not near', async () => {
			const { getByTestId, emitted } = renderScrollArea();
			setScrollTop(getByTestId('chat-scroll-area-viewport'), 1000);

			await flushPromises();

			expect(emitted('load-older')).toBeUndefined();
		});

		it('should emit when the top sentinel becomes visible after mount', async () => {
			const { getByTestId, emitted } = renderScrollArea();
			await flushPromises();

			triggerTopSentinel(getByTestId('chat-scroll-area-viewport'));

			expect(emitted('load-older')).toHaveLength(2);
		});

		it('should not emit while older messages load', async () => {
			const { getByTestId, emitted } = renderScrollArea({ loadingOlder: true });
			await flushPromises();

			triggerTopSentinel(getByTestId('chat-scroll-area-viewport'));

			expect(emitted('load-older')).toBeUndefined();
		});

		it('should emit again after a load when the top is still visible', async () => {
			const { emitted, rerender } = renderScrollArea();
			await flushPromises();
			expect(emitted('load-older')).toHaveLength(1);

			await rerender({ loadingOlder: true });
			await rerender({ loadingOlder: false });
			await flushPromises();

			expect(emitted('load-older')).toHaveLength(2);
		});

		it('should not emit again after a load that fills the view', async () => {
			const { getByTestId, emitted, rerender } = renderScrollArea();
			await flushPromises();
			const viewport = getByTestId('chat-scroll-area-viewport');

			await rerender({ loadingOlder: true });
			setScrollTop(viewport, 1000);
			await rerender({ loadingOlder: false });
			await flushPromises();

			expect(emitted('load-older')).toHaveLength(1);
		});
	});
});
