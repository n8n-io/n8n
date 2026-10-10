import { render } from '@testing-library/vue';
import { defineComponent, h, nextTick, ref } from 'vue';

import { useElementOverflow } from './useElementOverflow';

class ResizeObserverStub {
	static instances: ResizeObserverStub[] = [];

	onResize: ResizeObserverCallback;

	observe = vi.fn();

	disconnect = vi.fn();

	unobserve = vi.fn();

	constructor(onResize: ResizeObserverCallback) {
		this.onResize = onResize;
		ResizeObserverStub.instances.push(this);
	}
}

/** jsdom has no layout, so the sizes are set by hand. */
function setSizes(el: HTMLElement, sizes: Partial<Record<string, number>>) {
	for (const [key, value] of Object.entries(sizes)) {
		Object.defineProperty(el, key, { value, configurable: true });
	}
}

function renderWith(axis: 'x' | 'y') {
	const text = ref('short');
	const TestComponent = defineComponent({
		setup() {
			const el = ref<HTMLElement | null>(null);
			const { isOverflowing } = useElementOverflow(el, axis, [text]);
			return () =>
				h('div', [
					h('span', { ref: el, 'data-test-id': 'target' }, text.value),
					h('span', { 'data-test-id': 'state' }, String(isOverflowing.value)),
				]);
		},
	});
	const result = render(TestComponent);
	return { ...result, text };
}

describe('useElementOverflow', () => {
	beforeEach(() => {
		ResizeObserverStub.instances = [];
		vi.stubGlobal('ResizeObserver', ResizeObserverStub);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reports a horizontal overflow when the scroll width exceeds the client width', async () => {
		const { getByTestId, text } = renderWith('x');
		setSizes(getByTestId('target'), { scrollWidth: 300, clientWidth: 100 });

		text.value = 'a longer text';
		await nextTick();
		await nextTick();

		expect(getByTestId('state').textContent).toBe('true');
	});

	it('reports a vertical overflow when the scroll height exceeds the client height', async () => {
		const { getByTestId, text } = renderWith('y');
		setSizes(getByTestId('target'), { scrollHeight: 120, clientHeight: 40 });

		text.value = 'a taller text';
		await nextTick();
		await nextTick();

		expect(getByTestId('state').textContent).toBe('true');
	});

	it('re-checks on resize and stops observing on unmount', async () => {
		const { getByTestId, unmount } = renderWith('y');
		const el = getByTestId('target');
		expect(getByTestId('state').textContent).toBe('false');

		setSizes(el, { scrollHeight: 120, clientHeight: 40 });
		const observer = ResizeObserverStub.instances[0];
		observer.onResize([], observer as unknown as ResizeObserver);
		await nextTick();
		expect(getByTestId('state').textContent).toBe('true');

		unmount();
		expect(observer.disconnect).toHaveBeenCalled();
	});
});
