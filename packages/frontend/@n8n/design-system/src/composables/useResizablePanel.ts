import { useLocalStorage } from '@vueuse/core';
import {
	computed,
	getCurrentScope,
	onScopeDispose,
	ref,
	toValue,
	watch,
	type MaybeRefOrGetter,
	type Ref,
} from 'vue';

import { directionsCursorMaps, type Direction, type ResizeData } from '../types';

type GetSize = number | ((containerSize: number) => number);

export interface ResizablePanelDimensionOptions {
	/** External size in pixels. */
	size?: MaybeRefOrGetter<number>;
	/** Initial size in pixels, or a function of the container size. */
	defaultSize?: GetSize;
	/** Minimum size in pixels. */
	minSize?: GetSize;
	/** Maximum size in pixels. Defaults to the container size when supplied. */
	maxSize?: GetSize;
	/** Snap near the default size. */
	snap?: boolean;
	/** Allow a temporary zero size while dragging near the container edge. */
	allowCollapse?: boolean;
	/** Allow a temporary full size while dragging near the container edge. */
	allowFullSize?: boolean;
	/** Save this dimension as a container proportion under this key. */
	localStorageKey?: string;
}

export interface UseResizablePanelOptions {
	/** Reference container for proportional sizes and full-size detection. */
	container?: MaybeRefOrGetter<HTMLElement | null>;
	/** Width settings. */
	width?: ResizablePanelDimensionOptions;
	/** Height settings. */
	height?: ResizablePanelDimensionOptions;
	/** Scale applied to pointer movement. */
	scale?: MaybeRefOrGetter<number>;
	/** Grid interval in pixels. Zero disables grid snapping. */
	gridSize?: MaybeRefOrGetter<number>;
}

export interface ResizablePanelDragCallbacks {
	/** Window that receives the drag events. */
	window?: Window;
	/** Displayed dimensions before dragging. These can differ from the saved open size. */
	displayedSize?: Pick<ResizeData, 'width' | 'height'>;
	/** Called when dragging starts. */
	onResizeStart?: () => void;
	/** Called after the size changes. */
	onResize?: (data: ResizeData) => void;
	/** Called before temporary collapse and full-size states are cleared. */
	onResizeEnd?: () => void;
}

const SNAP_DISTANCE = 30;

const directionSigns: Record<Direction, { x: number; y: number }> = {
	right: { x: 1, y: 0 },
	left: { x: -1, y: 0 },
	top: { x: 0, y: -1 },
	bottom: { x: 0, y: 1 },
	topLeft: { x: -1, y: -1 },
	topRight: { x: 1, y: -1 },
	bottomLeft: { x: -1, y: 1 },
	bottomRight: { x: 1, y: 1 },
};

function isDirection(value: string | undefined): value is Direction {
	return value !== undefined && Object.hasOwn(directionSigns, value);
}

function isResizeHandle(target: EventTarget | null): target is HTMLElement {
	return target !== null && 'dataset' in target;
}

function resolveSize(getter: GetSize, containerSize: number): number {
	if (typeof getter === 'number') return getter;
	return getter(containerSize);
}

function snapToGrid(value: number, gridSize: number): number {
	if (gridSize <= 0) return value;
	return Math.round(value / gridSize) * gridSize;
}

function usePanelDimension(
	options: ResizablePanelDimensionOptions,
	containerSize: Ref<number>,
	isResizing: Ref<boolean>,
	gridSize: MaybeRefOrGetter<number>,
) {
	const persistedSize = options.localStorageKey
		? useLocalStorage(options.localStorageKey, -1, { writeDefaults: false })
		: ref(-1);
	/** This keeps the panel size proportionally to the container size, so it can be restored correctly on reload. */
	const proportion = ref(persistedSize.value);
	const pixels = ref<number>();
	const dragSize = ref<number>();
	let initialSize = 0;
	let dragStartSize = 0;

	const defaultSize = computed(function getDefaultSize() {
		if (options.size !== undefined) return toValue(options.size);
		return resolveSize(options.defaultSize ?? 0, containerSize.value);
	});
	const minSize = computed(function getMinSize() {
		return resolveSize(options.minSize ?? 0, containerSize.value);
	});
	const maxSize = computed(function getMaxSize() {
		return resolveSize(options.maxSize ?? (containerSize.value || Infinity), containerSize.value);
	});
	const rawSize = computed(function getRawSize() {
		/** Pointer movement can exceed the container bounds during a drag. */
		if (dragSize.value !== undefined) return dragSize.value;
		if (pixels.value !== undefined) return pixels.value;
		if (proportion.value < 0 || proportion.value > 1 || !Number.isFinite(proportion.value)) {
			return defaultSize.value;
		}
		if (containerSize.value <= 0) return defaultSize.value;
		return proportion.value * containerSize.value;
	});
	const isCollapsed = computed(function getIsCollapsed() {
		return isResizing.value && !!options.allowCollapse && rawSize.value < SNAP_DISTANCE;
	});
	const isFullSize = computed(function getIsFullSize() {
		return (
			isResizing.value &&
			!!options.allowFullSize &&
			containerSize.value > 0 &&
			rawSize.value > containerSize.value - SNAP_DISTANCE
		);
	});
	const size = computed(function getSize() {
		if (isCollapsed.value) return 0;
		if (isFullSize.value) return containerSize.value;
		let value = rawSize.value;
		if (options.snap && Math.abs(value - defaultSize.value) < SNAP_DISTANCE) {
			value = defaultSize.value;
		}
		return Math.max(minSize.value, Math.min(value, maxSize.value));
	});

	function setSize(value: number): void {
		if (containerSize.value <= 0) {
			pixels.value = value;
			return;
		}
		proportion.value = value / containerSize.value;
		pixels.value = undefined;
	}

	function start(displayedSize = size.value): void {
		initialSize = size.value;
		dragStartSize = displayedSize;
	}

	function resize(delta: number): number {
		const previousSize = dragSize.value === undefined ? dragStartSize : size.value;
		dragSize.value = snapToGrid(dragStartSize + delta, toValue(gridSize));
		return previousSize - size.value;
	}

	function finish(): void {
		if (dragSize.value === undefined) return;

		/** Seperate final size so full collapse/full size panels don't overwrite saved size */
		const finalSize = isCollapsed.value || isFullSize.value ? initialSize : size.value;
		setSize(finalSize);
		dragSize.value = undefined;
		if (containerSize.value > 0) persistedSize.value = proportion.value;
	}

	function cancel(): void {
		dragSize.value = undefined;
	}

	function reset(value?: number): void {
		if (!defaultSize.value) return;
		setSize(value ?? defaultSize.value);
		if (containerSize.value > 0) persistedSize.value = proportion.value;
	}

	watch(persistedSize, function syncPersistedSize(value) {
		if (isResizing.value) return;
		proportion.value = value;
		pixels.value = undefined;
	});
	watch(containerSize, function convertPixelsToProportion(value) {
		if (value > 0 && pixels.value !== undefined) setSize(pixels.value);
	});
	watch(
		function getExternalSize() {
			return toValue(options.size);
		},
		function syncExternalSize(value) {
			if (value === undefined || isResizing.value || value === size.value) return;
			setSize(value);
		},
	);

	return { size, isCollapsed, isFullSize, start, resize, finish, cancel, reset };
}

function useContainerSize(container: UseResizablePanelOptions['container']) {
	const width = ref(0);
	const height = ref(0);
	watch(
		function getContainer() {
			return toValue(container);
		},
		function observeContainer(element, _, onCleanup) {
			if (!element) {
				width.value = 0;
				height.value = 0;
				return;
			}
			const observedElement = element;
			function measureContainer(): void {
				width.value = observedElement.offsetWidth;
				height.value = observedElement.offsetHeight;
			}
			const observer = new ResizeObserver(measureContainer);
			observer.observe(observedElement);
			measureContainer();
			onCleanup(function stopObserving() {
				observer.disconnect();
			});
		},
		{ immediate: true },
	);
	return { width, height };
}

export function useResizablePanel(options: UseResizablePanelOptions) {
	const container = useContainerSize(options.container);
	const isResizing = ref(false);
	const activeDirection = ref<Direction>();
	const width = usePanelDimension(
		options.width ?? {},
		container.width,
		isResizing,
		options.gridSize ?? 0,
	);
	const height = usePanelDimension(
		options.height ?? {},
		container.height,
		isResizing,
		options.gridSize ?? 0,
	);
	let callbacks: ResizablePanelDragCallbacks = {};
	let targetWindow: Window | undefined;
	let startX = 0;
	let startY = 0;
	let pendingEvent: MouseEvent | undefined;
	let animationFrame: number | undefined;

	function applyResize(event: MouseEvent): void {
		pendingEvent = undefined;
		animationFrame = undefined;
		const direction = activeDirection.value;
		if (!direction) return;
		const signs = directionSigns[direction];
		const scale = toValue(options.scale) ?? 1;
		const deltaX = ((event.clientX - startX) * signs.x) / scale;
		const deltaY = ((event.clientY - startY) * signs.y) / scale;
		if (!isResizing.value && deltaX === 0 && deltaY === 0) return;
		isResizing.value = true;
		const widthChange = signs.x ? width.resize(deltaX) : 0;
		const heightChange = signs.y ? height.resize(deltaY) : 0;
		callbacks.onResize?.({
			width: width.size.value,
			height: height.size.value,
			dX: signs.x < 0 ? widthChange : 0,
			dY: signs.y < 0 ? heightChange : 0,
			x: event.clientX,
			y: event.clientY,
			direction,
		});
	}

	function flushPendingResize(): void {
		if (animationFrame !== undefined) targetWindow?.cancelAnimationFrame(animationFrame);
		if (pendingEvent) applyResize(pendingEvent);
	}

	function onMouseMove(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		pendingEvent = event;
		if (animationFrame !== undefined) return;

		/** Throttle with requestAnimationFrame to avoid excessive resize events we can't render */
		animationFrame = targetWindow?.requestAnimationFrame(function resizeOnFrame() {
			if (pendingEvent) applyResize(pendingEvent);
		});
	}

	function removeListeners(): void {
		if (!targetWindow) return;
		targetWindow.removeEventListener('mousemove', onMouseMove);
		targetWindow.removeEventListener('mouseup', onMouseUp);
		targetWindow.removeEventListener('blur', finishResize);
		if (animationFrame !== undefined) targetWindow.cancelAnimationFrame(animationFrame);
		targetWindow.document.body.style.cursor = '';
		targetWindow.document.body.classList.remove('n8n-resizing');
		animationFrame = undefined;
		pendingEvent = undefined;
	}

	function cleanupResize(): void {
		removeListeners();
		width.cancel();
		height.cancel();
		isResizing.value = false;
		activeDirection.value = undefined;
		callbacks = {};
		targetWindow = undefined;
	}

	/** Important: Let caller read collapse/full size BEFORE finishing the resize */
	function finishResize(): void {
		if (!activeDirection.value) return;
		try {
			flushPendingResize();
			removeListeners();
			callbacks.onResizeEnd?.();
		} finally {
			width.finish();
			height.finish();
			cleanupResize();
		}
	}

	function onMouseUp(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		finishResize();
	}

	function resetSize(size: { width?: number | undefined; height?: number | undefined } = {}): void {
		width.reset(size.width);
		height.reset(size.height);
	}

	/** Return a cleanup function for this drag only. */
	function startResize(
		event: MouseEvent,
		handlers: ResizablePanelDragCallbacks = {},
	): (() => void) | undefined {
		const target = event.currentTarget;
		if (!isResizeHandle(target)) return;
		const direction = target.dataset.dir;
		if (!isDirection(direction)) return;
		cleanupResize();
		event.preventDefault();
		event.stopPropagation();
		width.start(handlers.displayedSize?.width);
		height.start(handlers.displayedSize?.height);
		const dragCallbacks = { ...handlers };
		callbacks = dragCallbacks;
		targetWindow = handlers.window ?? target.ownerDocument.defaultView ?? window;
		startX = event.clientX;
		startY = event.clientY;
		activeDirection.value = direction;
		targetWindow.document.body.style.cursor = directionsCursorMaps[direction];
		targetWindow.document.body.classList.add('n8n-resizing');
		targetWindow.addEventListener('mousemove', onMouseMove);
		targetWindow.addEventListener('mouseup', onMouseUp);
		targetWindow.addEventListener('blur', finishResize);
		callbacks.onResizeStart?.();

		return function cancelDrag(): void {
			if (callbacks === dragCallbacks) cleanupResize();
		};
	}

	if (getCurrentScope()) onScopeDispose(cleanupResize);

	const isCollapsedComputed = computed(function getIsCollapsed() {
		return width.isCollapsed.value || height.isCollapsed.value;
	});
	const isFullSizeComputed = computed(function getIsFullSize() {
		return width.isFullSize.value || height.isFullSize.value;
	});
	const isResizingComputed = computed(function getIsResizing() {
		return isResizing.value;
	});
	const activeDirectionComputed = computed(function getActiveDirection() {
		return activeDirection.value;
	});

	return {
		width: width.size,
		height: height.size,
		isCollapsed: isCollapsedComputed,
		isFullSize: isFullSizeComputed,
		isResizing: isResizingComputed,
		activeDirection: activeDirectionComputed,
		startResize,
		resetSize,
		cleanupResize,
	};
}

export type ResizablePanel = ReturnType<typeof useResizablePanel>;
