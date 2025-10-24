import { createInjectionState, createEventHook } from '@vueuse/core';
import { ref } from 'vue';
import type { Ref } from 'vue';

type Viewport = {
	x: number;
	y: number;
	zoom: number;
};

type ViewportUpdate = {
	from: string;
	viewport: Viewport;
};

export type ViewportSyncReturn = {
	onViewportChange: (
		handler: (update: { from: string; viewport: { x: number; y: number; zoom: number } }) => void,
	) => void;
	triggerViewportChange: (update: {
		from: string;
		viewport: { x: number; y: number; zoom: number };
	}) => void;
	onNodeClick: (handler: (update: string) => void) => void;
	triggerNodeClick: (update: string) => void;
	selectedDetailId: Ref<string | undefined>;
	syncIsEnabled: Ref<boolean>;
};

const [useProvideViewportSync, useInject] = createInjectionState<[], ViewportSyncReturn>(() => {
	const onViewportChange = createEventHook<ViewportUpdate>();
	const onNodeClick = createEventHook<string>();

	const selectedDetailId = ref<string>();
	const syncIsEnabled = ref(true);

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
		if (!syncIsEnabled.value) {
			return;
		}
		pendingUpdate = update;

		scheduledFrameId ??= requestAnimationFrame(() => {
			if (pendingUpdate) {
				void onViewportChange.trigger(pendingUpdate);
				pendingUpdate = null;
			}
			scheduledFrameId = null;
		});
	}

	return {
		onViewportChange: onViewportChange.on,
		triggerViewportChange,
		onNodeClick: onNodeClick.on,
		triggerNodeClick: onNodeClick.trigger,
		selectedDetailId,
		syncIsEnabled,
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
