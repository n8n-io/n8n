import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoScrollOnDrag } from './useAutoScrollOnDrag';
import { effectScope, nextTick, ref, type Ref } from 'vue';

const createContainer = (
	overrides: { top?: number; height?: number; scrollHeight?: number } = {},
) => {
	const container = document.createElement('div');
	const top = overrides.top ?? 100;
	const height = overrides.height ?? 400;
	const bottom = top + height;

	Object.defineProperty(container, 'scrollHeight', {
		value: overrides.scrollHeight ?? 1000,
		writable: true,
	});

	Object.defineProperty(container, 'clientHeight', {
		value: height,
		writable: true,
	});

	vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
		top,
		bottom,
		left: 0,
		right: 0,
		width: 0,
		height,
		x: 0,
		y: top,
		toJSON: () => ({}),
	});

	const scrollBy = vi.fn<(options: ScrollToOptions) => void>();
	Object.defineProperty(container, 'scrollBy', {
		value: scrollBy,
	});

	return { container, scrollBy } as const;
};

describe('useAutoScrollOnDrag', () => {
	let scope: ReturnType<typeof effectScope>;
	let frameCallbacks: Record<number, FrameRequestCallback>;
	let nextFrameId: number;

	const runPendingFrames = () => {
		const callbacks = frameCallbacks;
		frameCallbacks = {};
		Object.values(callbacks).forEach((cbFn) => cbFn(performance.now()));
	};

	beforeEach(() => {
		scope = effectScope();
		frameCallbacks = {};
		nextFrameId = 1;

		vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
			(frameHandler: FrameRequestCallback) => {
				const id = nextFrameId++;
				frameCallbacks[id] = frameHandler;
				return id;
			},
		);

		vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
			delete frameCallbacks[id];
		});
	});

	afterEach(() => {
		scope.stop();
		vi.restoreAllMocks();
	});

	it('scrolls upward when the pointer nears the top edge', async () => {
		const { container, scrollBy } = createContainer();
		let isActive: Ref<boolean> | undefined;
		let containerRef: Ref<HTMLElement | null> | undefined;

		scope.run(() => {
			isActive = ref(false);
			containerRef = ref(null);
			useAutoScrollOnDrag({
				isActive,
				container: containerRef,
			});
		});

		if (!containerRef || !isActive) {
			throw new Error('refs not initialised');
		}
		containerRef.value = container;
		isActive.value = true;
		await nextTick();

		window.dispatchEvent(new MouseEvent('mousemove', { clientY: 110 }));
		runPendingFrames();

		expect(scrollBy).toHaveBeenCalledTimes(1);
		const [scrollOptions] = scrollBy.mock.calls[0] as [ScrollToOptions];
		expect(scrollOptions.top).toBeLessThan(0);
	});

	it('scrolls downward when the pointer nears the bottom edge', async () => {
		const { container, scrollBy } = createContainer();
		let isActive: Ref<boolean> | undefined;
		let containerRef: Ref<HTMLElement | null> | undefined;

		scope.run(() => {
			isActive = ref(false);
			containerRef = ref(null);
			useAutoScrollOnDrag({
				isActive,
				container: containerRef,
			});
		});

		if (!containerRef || !isActive) {
			throw new Error('refs not initialised');
		}
		containerRef.value = container;
		isActive.value = true;
		await nextTick();

		window.dispatchEvent(new MouseEvent('mousemove', { clientY: 490 }));
		runPendingFrames();

		expect(scrollBy).toHaveBeenCalledTimes(1);
		const [scrollOptions] = scrollBy.mock.calls[0] as [ScrollToOptions];
		expect(scrollOptions.top).toBeGreaterThan(0);
	});

	it('prefers the closest edge when the container is shorter than the edge size', async () => {
		const { container, scrollBy } = createContainer({ height: 40, scrollHeight: 400 });
		let isActive: Ref<boolean> | undefined;
		let containerRef: Ref<HTMLElement | null> | undefined;

		scope.run(() => {
			isActive = ref(false);
			containerRef = ref(null);
			useAutoScrollOnDrag({
				isActive,
				container: containerRef,
			});
		});

		if (!containerRef || !isActive) {
			throw new Error('refs not initialised');
		}
		containerRef.value = container;
		isActive.value = true;
		await nextTick();

		window.dispatchEvent(new MouseEvent('mousemove', { clientY: 135 }));
		runPendingFrames();

		expect(scrollBy).toHaveBeenCalledTimes(1);
		const [scrollOptions] = scrollBy.mock.calls[0] as [ScrollToOptions];
		expect(scrollOptions.top).toBeGreaterThan(0);
	});

	it('stops scrolling when the drag becomes inactive', async () => {
		const { container, scrollBy } = createContainer();
		let isActive: Ref<boolean> | undefined;
		let containerRef: Ref<HTMLElement | null> | undefined;

		scope.run(() => {
			isActive = ref(false);
			containerRef = ref(null);
			useAutoScrollOnDrag({
				isActive,
				container: containerRef,
			});
		});

		if (!containerRef || !isActive) {
			throw new Error('refs not initialised');
		}
		containerRef.value = container;
		isActive.value = true;
		await nextTick();

		window.dispatchEvent(new MouseEvent('mousemove', { clientY: 110 }));
		runPendingFrames();

		expect(scrollBy).toHaveBeenCalledTimes(1);

		isActive.value = false;
		await nextTick();

		// Trigger any pending frames after deactivation
		runPendingFrames();

		expect(scrollBy).toHaveBeenCalledTimes(1);
	});

	it('does not scroll when the pointer stays away from the edges', async () => {
		const { container, scrollBy } = createContainer();
		let isActive: Ref<boolean> | undefined;
		let containerRef: Ref<HTMLElement | null> | undefined;

		scope.run(() => {
			isActive = ref(false);
			containerRef = ref(null);
			useAutoScrollOnDrag({
				isActive,
				container: containerRef,
			});
		});

		if (!containerRef || !isActive) {
			throw new Error('refs not initialised');
		}
		containerRef.value = container;
		isActive.value = true;
		await nextTick();

		window.dispatchEvent(new MouseEvent('mousemove', { clientY: 300 }));
		runPendingFrames();

		expect(scrollBy).not.toHaveBeenCalled();
	});
});
