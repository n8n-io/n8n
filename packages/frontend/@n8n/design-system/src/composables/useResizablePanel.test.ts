import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';

import type { Direction } from '../types';
import {
	useResizablePanel,
	type ResizablePanel,
	type ResizablePanelDragCallbacks,
	type UseResizablePanelOptions,
} from './useResizablePanel';

describe('useResizablePanel', function () {
	const localStorageKey = 'useResizablePanel-test';
	let container: HTMLElement;
	let scope: ReturnType<typeof effectScope>;

	function createPanel(options: UseResizablePanelOptions = {}) {
		return scope.run(function () {
			return useResizablePanel({
				container,
				width: { localStorageKey, defaultSize: 444 },
				...options,
			});
		})!;
	}

	function startDrag(
		panel: ResizablePanel,
		direction: Direction,
		x: number,
		y = 0,
		callbacks: ResizablePanelDragCallbacks = {},
	) {
		const handle = document.createElement('div');
		handle.dataset.dir = direction;
		handle.addEventListener('mousedown', function (event) {
			panel.startResize(event, callbacks);
		});
		handle.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y }));
	}

	function movePointer(x: number, y = 0) {
		window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
		vi.advanceTimersToNextFrame();
	}

	function endDrag() {
		window.dispatchEvent(new MouseEvent('mouseup'));
	}

	beforeEach(function () {
		vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
		window.localStorage.removeItem(localStorageKey);
		scope = effectScope();
		container = document.createElement('div');
		Object.defineProperties(container, {
			offsetWidth: { configurable: true, value: 1000 },
			offsetHeight: { configurable: true, value: 800 },
		});
	});

	afterEach(async function () {
		scope.stop();
		await nextTick();
		window.localStorage.removeItem(localStorageKey);
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('should return defaultSize if value is missing in local storage', function () {
		const { width } = createPanel();

		expect(width.value).toBe(444);
	});

	it('should restore value from local storage if a valid proportion is stored', function () {
		window.localStorage.setItem(localStorageKey, '0.333');

		const { width } = createPanel();

		expect(width.value).toBe(333);
	});

	it('should return defaultSize if an invalid proportion is stored in local storage', function () {
		window.localStorage.setItem(localStorageKey, '333');

		const { width } = createPanel();

		expect(width.value).toBe(444);
	});

	it('should update width when the right handle is dragged', function () {
		const panel = createPanel();

		startDrag(panel, 'right', 444);
		movePointer(555);

		expect(panel.width.value).toBe(555);
	});

	it('should update height when the top handle of a bottom panel is dragged', function () {
		const panel = createPanel({
			width: {},
			height: { localStorageKey, defaultSize: 444 },
		});

		startDrag(panel, 'top', 0, 356);
		movePointer(0, 222);

		expect(panel.height.value).toBe(578);
	});

	it('should keep width between minSize and maxSize', function () {
		const panel = createPanel({
			width: {
				localStorageKey,
				defaultSize: 444,
				minSize: 200,
				maxSize(containerSize) {
					return containerSize * 0.9;
				},
			},
		});

		startDrag(panel, 'right', 444);
		movePointer(100);
		expect(panel.width.value).toBe(200);

		movePointer(950);
		expect(panel.width.value).toBe(900);
	});

	it('should preserve the saved proportion when the container is resized after dragging', async function () {
		const spyResizeObserver = vi.spyOn(window, 'ResizeObserver');
		const panel = createPanel({
			width: {
				localStorageKey,
				defaultSize: 444,
				minSize: 200,
				maxSize(containerSize) {
					return containerSize * 0.9;
				},
			},
		});

		expect(spyResizeObserver).toHaveBeenCalledTimes(1);

		startDrag(panel, 'right', 444);
		movePointer(600);
		expect(panel.width.value).toBe(600);

		endDrag();
		await nextTick();
		expect(window.localStorage.getItem(localStorageKey)).toBe('0.6');

		Object.defineProperty(container, 'offsetWidth', { configurable: true, value: 500 });
		spyResizeObserver.mock.calls[0][0]([], {} as ResizeObserver);
		await nextTick();
		expect(panel.width.value).toBe(300);
	});

	it('should collapse near the edge and restore the pre-drag width when dragging ends', function () {
		const panel = createPanel({
			width: {
				localStorageKey,
				defaultSize: 444,
				minSize: 300,
				allowCollapse: true,
			},
		});

		expect(panel.width.value).toBe(444);
		expect(panel.isCollapsed.value).toBe(false);

		startDrag(panel, 'right', 444);
		movePointer(200);
		expect(panel.width.value).toBe(300);
		expect(panel.isCollapsed.value).toBe(false);

		movePointer(10);
		expect(panel.width.value).toBe(0);
		expect(panel.isCollapsed.value).toBe(true);

		endDrag();
		expect(panel.width.value).toBe(444);
		expect(panel.isCollapsed.value).toBe(false);
	});

	it('should expose the collapse state to the end callback before restoring the open height', function () {
		const panel = createPanel({
			width: {},
			height: {
				localStorageKey,
				defaultSize: 444,
				minSize: 160,
				allowCollapse: true,
			},
		});
		let isOpen = true;
		const onResizeEnd = vi.fn(function () {
			if (panel.isResizing.value && panel.isCollapsed.value) {
				isOpen = false;
			}
		});

		expect(panel.isResizing.value).toBe(false);
		startDrag(panel, 'top', 0, 356, { onResizeEnd });
		movePointer(0, 790);
		expect(panel.isResizing.value).toBe(true);
		expect(panel.isCollapsed.value).toBe(true);
		expect(panel.height.value).toBe(0);

		endDrag();

		expect(onResizeEnd).toHaveBeenCalledTimes(1);
		expect(isOpen).toBe(false);
		expect(panel.isResizing.value).toBe(false);
		expect(panel.isCollapsed.value).toBe(false);
		expect(panel.height.value).toBeCloseTo(444);
	});

	it('should fill the container near the edge and restore the pre-drag width when dragging ends', function () {
		const panel = createPanel({
			width: {
				localStorageKey,
				defaultSize: 444,
				maxSize: 800,
				allowFullSize: true,
			},
		});

		expect(panel.width.value).toBe(444);
		expect(panel.isFullSize.value).toBe(false);

		startDrag(panel, 'right', 444);
		movePointer(900);
		expect(panel.width.value).toBe(800);
		expect(panel.isFullSize.value).toBe(false);

		movePointer(999);
		expect(panel.width.value).toBe(1000);
		expect(panel.isFullSize.value).toBe(true);

		endDrag();
		expect(panel.width.value).toBe(444);
		expect(panel.isFullSize.value).toBe(false);
	});
});
