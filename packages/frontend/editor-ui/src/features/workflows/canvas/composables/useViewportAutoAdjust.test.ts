import { ref } from 'vue';
import { useViewportAutoAdjust } from './useViewportAutoAdjust';
import { waitFor } from '@testing-library/vue';

describe(useViewportAutoAdjust, () => {
	let resizeHandler: ResizeObserverCallback;

	beforeEach(() => {
		resizeHandler = () => {};

		class ResizeObserverMock extends ResizeObserver {
			constructor(handler: ResizeObserverCallback) {
				super(handler);
				resizeHandler = handler;
			}

			observe = vi.fn();

			disconnect = vi.fn();

			unobserve = vi.fn();
		}

		vi.stubGlobal('ResizeObserver', ResizeObserverMock);
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function createContainer(width: number, height: number) {
		const container = document.createElement('div');
		Object.defineProperty(container, 'offsetWidth', {
			configurable: true,
			get: () => width,
		});
		Object.defineProperty(container, 'offsetHeight', {
			configurable: true,
			get: () => height,
		});
		return container;
	}

	function fireResize(width: number, height: number) {
		resizeHandler(
			[{ contentRect: { x: 0, y: 0, width, height } } as ResizeObserverEntry],
			{} as ResizeObserver,
		);
	}

	it('should set viewport when canvas is resized', async () => {
		const viewportRef = ref(createContainer(1000, 800));
		const viewport = ref({ x: 30, y: 40, zoom: 0.5 });
		const setViewport = vi.fn();

		useViewportAutoAdjust(viewportRef, viewport, setViewport);
		fireResize(900, 1000);

		await waitFor(() =>
			expect(setViewport).toHaveBeenLastCalledWith({
				x: -20, // 30 + (900 - 1000) / 2
				y: 140, // 40 + (1000 - 800) / 2
				zoom: 0.5, // unchanged
			}),
		);
	});

	it('should skip viewport adjustment when initial rect was captured while tab was hidden', async () => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });

		const viewportRef = ref(createContainer(500, 500));
		const viewport = ref({ x: -255, y: 156, zoom: 1 });
		const setViewport = vi.fn();

		useViewportAutoAdjust(viewportRef, viewport, setViewport);

		// Tab becomes visible, container resizes from fallback 500×500 to real 769×889
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
		fireResize(769, 889);

		// Wait a tick so the watcher would have had a chance to fire
		await waitFor(() => expect(setViewport).not.toHaveBeenCalled());
	});

	it('should resume normal adjustments after the first post-hidden resize is skipped', async () => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });

		const viewportRef = ref(createContainer(500, 500));
		const viewport = ref({ x: -255, y: 156, zoom: 1 });
		const setViewport = vi.fn();

		useViewportAutoAdjust(viewportRef, viewport, setViewport);

		// First resize after tab becomes visible — should be skipped
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
		fireResize(769, 889);

		await waitFor(() => expect(setViewport).not.toHaveBeenCalled());

		// Second resize (e.g. user toggling side panel) — should apply normally
		fireResize(1000, 889);

		await waitFor(() =>
			expect(setViewport).toHaveBeenCalledWith({
				x: -255 + (1000 - 769) / 2, // -139.5
				y: 156 + (889 - 889) / 2, // 156
				zoom: 1,
			}),
		);
	});

	it('should skip adjustment when ResizeObserver fires while tab is hidden', async () => {
		const viewportRef = ref(createContainer(769, 889));
		const viewport = ref({ x: -255, y: 156, zoom: 1 });
		const setViewport = vi.fn();

		useViewportAutoAdjust(viewportRef, viewport, setViewport);

		// ResizeObserver fires while tab is hidden (e.g. iframe resizing in background)
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });
		fireResize(0, 0);

		await waitFor(() => expect(setViewport).not.toHaveBeenCalled());

		// Tab becomes visible, real resize happens — should skip this one too
		// (the old rect was recorded while hidden)
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
		fireResize(769, 889);

		await waitFor(() => expect(setViewport).not.toHaveBeenCalled());

		// Next real resize should work normally
		fireResize(1000, 889);

		await waitFor(() =>
			expect(setViewport).toHaveBeenCalledWith({
				x: -255 + (1000 - 769) / 2,
				y: 156,
				zoom: 1,
			}),
		);
	});
});
