import { ref } from 'vue';
import { useViewportAutoAdjust } from './useViewportAutoAdjust';
import { waitFor } from '@testing-library/vue';

describe(useViewportAutoAdjust, () => {
	afterAll(() => {
		vi.clearAllMocks();
	});

	it('should set viewport when canvas is resized', async () => {
		let resizeHandler: ResizeObserverCallback = () => {};

		vi.spyOn(window, 'ResizeObserver').mockImplementation((handler) => {
			resizeHandler = handler;

			return { observe() {}, disconnect() {}, unobserve() {} } as ResizeObserver;
		});
		const container = document.createElement('div');

		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get() {
				return 1000;
			},
		});
		Object.defineProperty(container, 'offsetHeight', {
			configurable: true,
			get() {
				return 800;
			},
		});

		const viewportRef = ref(container);
		const viewport = ref({ x: 30, y: 40, zoom: 0.5 });
		const setViewport = vi.fn();

		useViewportAutoAdjust(viewportRef, viewport, setViewport);
		resizeHandler(
			[{ contentRect: { x: 0, y: 0, width: 900, height: 1000 } } as ResizeObserverEntry],
			{} as ResizeObserver,
		);

		await waitFor(() =>
			expect(setViewport).toHaveBeenLastCalledWith({
				x: -20, // 30 + (900 - 1000) / 2
				y: 140, // 40 + (1000 - 800) / 2
				zoom: 0.5, // unchanged
			}),
		);
	});
});
