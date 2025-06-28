import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useSettingsStore } from '@/stores/settings.store';
import { useVueFlow } from '@vue-flow/core';
import { useDebounce } from '@vueuse/core';
import { computed, type ComputedRef } from 'vue';

export function useNodeSettingsInCanvas(): ComputedRef<number | undefined> {
	const settingsStore = useSettingsStore();

	if (
		Number.isNaN(settingsStore.experimental__minZoomNodeSettingsInCanvas) ||
		settingsStore.experimental__minZoomNodeSettingsInCanvas <= 0
	) {
		return computed(() => undefined);
	}

	const { editableWorkflow } = useCanvasOperations();
	const viewFlow = useVueFlow({ id: editableWorkflow.value.id });
	const zoom = computed(() => viewFlow.viewport.value.zoom);
	const debouncedZoom = useDebounce(zoom, 100);

	return computed(() =>
		debouncedZoom.value > settingsStore.experimental__minZoomNodeSettingsInCanvas
			? debouncedZoom.value
			: undefined,
	);
}
