import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useSettingsStore } from '@/stores/settings.store';
import { useVueFlow } from '@vue-flow/core';
import { computed, type ComputedRef } from 'vue';

export function useNodeSettingsInCanvas(): {
	isEnabled?: ComputedRef<boolean>;
	maxCanvasZoom?: number;
} {
	const settingsStore = useSettingsStore();

	if (
		Number.isNaN(settingsStore.experimental__minZoomNodeSettingsInCanvas) ||
		settingsStore.experimental__minZoomNodeSettingsInCanvas <= 0
	) {
		return {};
	}

	const { editableWorkflow } = useCanvasOperations();
	const viewFlow = useVueFlow({ id: editableWorkflow.value.id });
	const zoom = computed(() => viewFlow.viewport.value.zoom);

	return {
		isEnabled: computed(
			() => zoom.value >= settingsStore.experimental__minZoomNodeSettingsInCanvas,
		),
		maxCanvasZoom: settingsStore.experimental__minZoomNodeSettingsInCanvas,
	};
}
