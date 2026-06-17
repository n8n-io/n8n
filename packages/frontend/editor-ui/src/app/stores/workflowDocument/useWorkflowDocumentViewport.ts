import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ViewportTransform } from '@vue-flow/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type ViewportPayload = {
	viewport: ViewportTransform | null;
};

export type ViewportChangeEvent = ChangeEvent<ViewportPayload>;

export function useWorkflowDocumentViewport() {
	const viewport = ref<ViewportTransform | null>(null);

	const onViewportChange = createEventHook<ViewportChangeEvent>();

	function applyViewport(
		newViewport: ViewportTransform | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		viewport.value = newViewport;
		void onViewportChange.trigger({ action, payload: { viewport: newViewport } });
	}

	function setViewport(newViewport: ViewportTransform | null) {
		applyViewport(newViewport);
	}

	return {
		viewport: readonly(viewport),
		setViewport,
		onViewportChange: onViewportChange.on,
	};
}
