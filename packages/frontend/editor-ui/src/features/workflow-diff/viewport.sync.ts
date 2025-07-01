import { createInjectionState, createEventHook } from '@vueuse/core';

type Viewport = {
	x: number;
	y: number;
	zoom: number;
};

type ViewportUpdate = {
	from: string;
	viewport: Viewport;
};

const [useProvideViewportSync, useInject] = createInjectionState(() => {
	const onViewportChange = createEventHook<ViewportUpdate>();

	/**
	 * Batches viewport sync using requestAnimationFrame to avoid flooding listeners
	 * Provides a better performance by reducing the number of updates
	 * and ensuring that all updates are processed in a single frame.
	 * it's better than throttling because it allows for smoother updates
	 * and avoids the "jank" that can occur with throttling.
	 */
	let scheduledFrameId: number | null = null;
	let pendingUpdate: ViewportUpdate | null = null;

	function triggerViewportChange(update: ViewportUpdate) {
		pendingUpdate = update;

		scheduledFrameId ??= requestAnimationFrame(() => {
			if (pendingUpdate) {
				onViewportChange.trigger(pendingUpdate);
				pendingUpdate = null;
			}
			scheduledFrameId = null;
		});
	}

	return {
		onViewportChange: onViewportChange.on,
		triggerViewportChange,
	};
});

function useInjectViewportSync() {
	const state = useInject();
	if (!state) {
		throw new Error('Please call "useProvideViewportSync" on the appropriate parent component');
	}
	return state;
}

export { useProvideViewportSync, useInjectViewportSync };
