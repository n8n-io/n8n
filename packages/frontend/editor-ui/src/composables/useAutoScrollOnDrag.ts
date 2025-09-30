import { onScopeDispose, type Ref, watch } from 'vue';

interface UseAutoScrollOnDragOptions {
	isActive: Ref<boolean>;
	container: Ref<HTMLElement | null | undefined>;
	edgeSize?: number;
	maxSpeed?: number;
}

const DEFAULT_EDGE = 80;
const DEFAULT_MAX_SPEED = 20;

export function useAutoScrollOnDrag(options: UseAutoScrollOnDragOptions) {
	let frameId: number | undefined;
	let scrollStep = 0;

	const edgeSize = options.edgeSize ?? DEFAULT_EDGE;
	const maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;

	const stopScrolling = () => {
		scrollStep = 0;
		if (frameId !== undefined) {
			cancelAnimationFrame(frameId);
			frameId = undefined;
		}
	};

	const step = () => {
		const container = options.container.value;
		if (!container || scrollStep === 0) {
			frameId = undefined;
			return;
		}

		container.scrollBy({ top: scrollStep });
		frameId = requestAnimationFrame(step);
	};

	const startScrolling = (delta: number) => {
		scrollStep = delta;
		frameId ??= requestAnimationFrame(step);
	};

	const handlePointerMove = (event: MouseEvent) => {
		const container = options.container.value;
		if (!container) {
			stopScrolling();
			return;
		}

		const { scrollHeight, clientHeight } = container;
		if (scrollHeight <= clientHeight) {
			stopScrolling();
			return;
		}

		const rect = container.getBoundingClientRect();
		const pointerY = event.clientY;

		let direction = 0;
		let distanceIntoEdge = 0;

		if (pointerY < rect.top) {
			direction = -1;
			distanceIntoEdge = edgeSize;
		} else if (pointerY > rect.bottom) {
			direction = 1;
			distanceIntoEdge = edgeSize;
		} else {
			const distanceToTop = pointerY - rect.top;
			const distanceToBottom = rect.bottom - pointerY;

			const isNearTop = distanceToTop < edgeSize;
			const isNearBottom = distanceToBottom < edgeSize;

			if (isNearTop || isNearBottom) {
				const shouldScrollUp = !isNearBottom || distanceToTop <= distanceToBottom;
				if (shouldScrollUp) {
					direction = -1;
					distanceIntoEdge = edgeSize - Math.min(distanceToTop, edgeSize);
				} else {
					direction = 1;
					distanceIntoEdge = edgeSize - Math.min(distanceToBottom, edgeSize);
				}
			}
		}

		if (direction === 0) {
			stopScrolling();
			return;
		}

		const intensity = Math.min(distanceIntoEdge / edgeSize, 1);
		const delta = direction * Math.max(2, intensity * maxSpeed);

		startScrolling(delta);
	};

	const addListeners = () => {
		window.addEventListener('mousemove', handlePointerMove);
	};

	const removeListeners = () => {
		window.removeEventListener('mousemove', handlePointerMove);
	};

	watch(
		[options.isActive, options.container],
		([isActive, container], _prev, onCleanup) => {
			removeListeners();
			stopScrolling();

			if (isActive && container) {
				addListeners();
			}

			onCleanup(() => {
				removeListeners();
				stopScrolling();
			});
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		removeListeners();
		stopScrolling();
	});
}
