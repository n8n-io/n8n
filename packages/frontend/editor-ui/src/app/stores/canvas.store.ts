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

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		hasRangeSelection: computed(() => hasRangeSelection.value),
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		setHasRangeSelection,
	};
});
