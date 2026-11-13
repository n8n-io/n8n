import { effectScope, nextTick, ref } from 'vue';

import { useScrollEdges } from './useScrollEdges';

function setVerticalMetrics(
	element: HTMLElement,
	metrics: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
	Object.defineProperty(element, 'scrollHeight', {
		configurable: true,
		value: metrics.scrollHeight,
	});
	Object.defineProperty(element, 'clientHeight', {
		configurable: true,
		value: metrics.clientHeight,
	});
	Object.defineProperty(element, 'scrollTop', {
		configurable: true,
		writable: true,
		value: metrics.scrollTop,
	});
}

function setHorizontalMetrics(
	element: HTMLElement,
	metrics: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) {
	Object.defineProperty(element, 'scrollWidth', {
		configurable: true,
		value: metrics.scrollWidth,
	});
	Object.defineProperty(element, 'clientWidth', {
		configurable: true,
		value: metrics.clientWidth,
	});
	Object.defineProperty(element, 'scrollLeft', {
		configurable: true,
		writable: true,
		value: metrics.scrollLeft,
	});
}

describe('useScrollEdges', () => {
	let scope: ReturnType<typeof effectScope>;

	beforeEach(() => {
		scope = effectScope();
	});

	afterEach(() => {
		scope.stop();
	});

	describe('vertical', () => {
		async function mountEdges(element: HTMLElement | null = null) {
			const container = ref<HTMLElement | null>(element);
			const edges = scope.run(() => useScrollEdges(container, { axis: 'vertical' }))!;
			await nextTick();
			return { container, ...edges };
		}

		it('reports a bottom edge while more content sits below the viewport', async () => {
			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });

			const { canScrollTop, canScrollBottom } = await mountEdges(element);

			expect(canScrollTop.value).toBe(false);
			expect(canScrollBottom.value).toBe(true);
		});

		it('reports a top edge after the user scrolls down, and clears the bottom edge at the end', async () => {
			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
			const { canScrollTop, canScrollBottom } = await mountEdges(element);

			element.scrollTop = 100;
			element.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(canScrollTop.value).toBe(true);
			expect(canScrollBottom.value).toBe(false);
		});

		it('ignores a sub-pixel remainder at either edge', async () => {
			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0.5 });

			const { canScrollTop, canScrollBottom } = await mountEdges(element);

			expect(canScrollTop.value).toBe(false);
			expect(canScrollBottom.value).toBe(true);

			element.scrollTop = 99.5;
			element.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(canScrollTop.value).toBe(true);
			expect(canScrollBottom.value).toBe(false);
		});

		it('reports no edges when the list does not overflow', async () => {
			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 80, clientHeight: 100, scrollTop: 0 });

			const { canScrollTop, canScrollBottom } = await mountEdges(element);

			expect(canScrollTop.value).toBe(false);
			expect(canScrollBottom.value).toBe(false);
		});

		it('measures an element that appears later', async () => {
			const { container, canScrollBottom } = await mountEdges(null);
			expect(canScrollBottom.value).toBe(false);

			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
			container.value = element;
			await nextTick();

			expect(canScrollBottom.value).toBe(true);
		});

		it('updates when the list content grows', async () => {
			const element = document.createElement('div');
			setVerticalMetrics(element, { scrollHeight: 80, clientHeight: 100, scrollTop: 0 });
			document.body.appendChild(element);
			const { canScrollBottom } = await mountEdges(element);

			expect(canScrollBottom.value).toBe(false);

			setVerticalMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
			element.appendChild(document.createElement('span'));
			await nextTick();

			expect(canScrollBottom.value).toBe(true);
			element.remove();
		});
	});

	describe('horizontal', () => {
		async function mountEdges(element: HTMLElement | null = null) {
			const container = ref<HTMLElement | null>(element);
			const edges = scope.run(() => useScrollEdges(container, { axis: 'horizontal' }))!;
			await nextTick();
			return { container, ...edges };
		}

		it('reports a right edge while columns remain past that edge', async () => {
			const element = document.createElement('div');
			setHorizontalMetrics(element, { scrollWidth: 800, clientWidth: 400, scrollLeft: 0 });

			const { canScrollLeft, canScrollRight } = await mountEdges(element);

			expect(canScrollLeft.value).toBe(false);
			expect(canScrollRight.value).toBe(true);
		});

		it('reports a left edge after a sideways scroll, and clears the right edge at the end', async () => {
			const element = document.createElement('div');
			setHorizontalMetrics(element, { scrollWidth: 800, clientWidth: 400, scrollLeft: 0 });
			const { canScrollLeft, canScrollRight } = await mountEdges(element);

			element.scrollLeft = 400;
			element.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(canScrollLeft.value).toBe(true);
			expect(canScrollRight.value).toBe(false);
		});

		it('ignores a sub-pixel remainder at either edge', async () => {
			const element = document.createElement('div');
			setHorizontalMetrics(element, { scrollWidth: 800, clientWidth: 400, scrollLeft: 0.5 });

			const { canScrollLeft } = await mountEdges(element);

			expect(canScrollLeft.value).toBe(false);

			element.scrollLeft = 399.5;
			element.dispatchEvent(new Event('scroll'));
			await nextTick();

			expect(canScrollLeft.value).toBe(true);
		});

		it('reports no edges when the content fits', async () => {
			const element = document.createElement('div');
			setHorizontalMetrics(element, { scrollWidth: 400, clientWidth: 400, scrollLeft: 0 });

			const { canScrollLeft, canScrollRight } = await mountEdges(element);

			expect(canScrollLeft.value).toBe(false);
			expect(canScrollRight.value).toBe(false);
		});
	});
});
