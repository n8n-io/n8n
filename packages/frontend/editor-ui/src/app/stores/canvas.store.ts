import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { INodeUi, XYPosition } from '@/Interface';
import { useLoadingService } from '@/app/composables/useLoadingService';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowStore.workflowId)),
	);
	const loadingService = useLoadingService();

	const newNodeInsertPosition = ref<XYPosition | null>(null);

	const nodes = computed<INodeUi[]>(() => workflowDocumentStore.value?.allNodes ?? []);
	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter(
			(node) =>
				node.type.includes('langchain') ||
				(node.type === 'n8n-nodes-base.evaluation' && node.parameters?.operation === 'setMetrics'),
		),
	);
	const hasRangeSelection = ref(false);

	function setHasRangeSelection(value: boolean) {
		hasRangeSelection.value = value;
	}

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		aiNodes,
		hasRangeSelection: computed(() => hasRangeSelection.value),
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		setHasRangeSelection,
	};
});
