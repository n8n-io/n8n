import { effectScope, nextTick, ref } from 'vue';

import { scrollMaskBottomAttr, useScrollMask } from './useScrollMask';

function setScrollMetrics(
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

describe('useScrollMask', () => {
	let scope: ReturnType<typeof effectScope>;

	beforeEach(() => {
		scope = effectScope();
	});

	afterEach(() => {
		scope.stop();
	});

	async function mountMask(element: HTMLElement | null = null) {
		const container = ref<HTMLElement | null>(element);
		const mask = scope.run(() => useScrollMask(container))!;
		await nextTick();
		return { container, ...mask };
	}

	it('shows the bottom fade while more content sits below the viewport', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });

		const { canScrollDown, scrollMaskAttrs } = await mountMask(element);

		expect(canScrollDown.value).toBe(true);
		expect(scrollMaskAttrs.value).toEqual({ [scrollMaskBottomAttr]: '' });
	});

	it('hides the bottom fade when the user is at the end of the list', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
		const { canScrollDown, scrollMaskAttrs } = await mountMask(element);

		element.scrollTop = 100;
		element.dispatchEvent(new Event('scroll'));
		await nextTick();

		expect(canScrollDown.value).toBe(false);
		expect(scrollMaskAttrs.value).toEqual({});
	});

	it('ignores a sub-pixel remainder at the end of the list', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 99.5 });

		const { canScrollDown } = await mountMask(element);

		expect(canScrollDown.value).toBe(false);
	});

	it('hides the fade when the list does not overflow', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 80, clientHeight: 100, scrollTop: 0 });

		const { canScrollDown, scrollMaskAttrs } = await mountMask(element);

		expect(canScrollDown.value).toBe(false);
		expect(scrollMaskAttrs.value).toEqual({});
	});

	it('reads the element from a component instance', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
		const container = ref<{ $el: HTMLElement } | null>(null);
		const mask = scope.run(() => useScrollMask(container))!;

		container.value = { $el: element };
		await nextTick();

		expect(mask.canScrollDown.value).toBe(true);
	});

	it('updates when the list content grows', async () => {
		const element = document.createElement('div');
		setScrollMetrics(element, { scrollHeight: 80, clientHeight: 100, scrollTop: 0 });
		document.body.appendChild(element);
		const { canScrollDown } = await mountMask(element);

		expect(canScrollDown.value).toBe(false);

		setScrollMetrics(element, { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
		element.appendChild(document.createElement('span'));
		await nextTick();

		expect(canScrollDown.value).toBe(true);
		element.remove();
	});
});
