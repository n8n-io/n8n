import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi, XYPosition } from '@/Interface';
import { useLoadingService } from '@/composables/useLoadingService';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const loadingService = useLoadingService();

	const newNodeInsertPosition = ref<XYPosition | null>(null);
	const panelHeight = ref(0);

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter((node) => node.type.includes('langchain')),
	);

	function setPanelHeight(height: number) {
		panelHeight.value = height;
	}

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		aiNodes,
		panelHeight: computed(() => panelHeight.value),
		setPanelHeight,
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
	};
});
