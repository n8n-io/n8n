import { nextTick, ref, watch } from 'vue';
import { useVueFlow } from '@vue-flow/core';

// Vue-flow's transform pane has no public API; the class name is part of its
// DOM contract. Overlays teleported here inherit the same pan/zoom transforms
// applied to nodes.
const TRANSFORM_PANE_SELECTOR = '.vue-flow__transformationpane';

export function useVueFlowTransformPaneTeleport() {
	const { vueFlowRef } = useVueFlow();
	const teleportTarget = ref<HTMLElement | null>(null);

	watch(
		vueFlowRef,
		() => {
			void nextTick(() => {
				const el = vueFlowRef.value?.querySelector(TRANSFORM_PANE_SELECTOR);
				teleportTarget.value = el instanceof HTMLElement ? el : null;
			});
		},
		{ immediate: true },
	);

	return { teleportTarget };
}
