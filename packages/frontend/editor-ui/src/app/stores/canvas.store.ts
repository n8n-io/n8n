import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { XYPosition } from '@/Interface';
import { useLoadingService } from '@/app/composables/useLoadingService';

export const useCanvasStore = defineStore('canvas', () => {
	const loadingService = useLoadingService();

	const newNodeInsertPosition = ref<XYPosition | null>(null);

	const hasRangeSelection = ref(false);

	function setHasRangeSelection(value: boolean) {
		hasRangeSelection.value = value;
	}

	// Selected collapsed canvas group, so non-canvas surfaces (e.g. the logs panel) can sync to it
	const selectedGroupId = ref<string | null>(null);

	function setSelectedGroupId(value: string | null) {
		selectedGroupId.value = value;
	}

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		hasRangeSelection: computed(() => hasRangeSelection.value),
		selectedGroupId: computed(() => selectedGroupId.value),
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		setHasRangeSelection,
		setSelectedGroupId,
	};
});
