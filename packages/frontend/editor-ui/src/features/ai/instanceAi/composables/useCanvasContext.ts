import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { InstanceAiCanvasContext } from '@n8n/api-types';

/**
 * Collects the current canvas context (workflow info + selected nodes)
 * for inclusion in Instance AI messages.
 *
 * Returns `undefined` when not on a canvas (no workflow loaded).
 */
export function useCanvasContext() {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	const canvasContext = computed<InstanceAiCanvasContext | undefined>(() => {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;

		const workflowName = workflowsStore.workflowName;
		const allNodes = workflowsStore.allNodes;

		const selectedNodeName = uiStore.lastSelectedNode;
		const selectedNodes = buildSelectedNodes(selectedNodeName, workflowsStore);

		return {
			workflowId,
			workflowName,
			nodeCount: allNodes.length,
			selectedNodes: selectedNodes.length > 0 ? selectedNodes : undefined,
		};
	});

	return { canvasContext };
}

interface SelectedNodeInfo {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
}

function buildSelectedNodes(
	selectedNodeName: string | null,
	workflowsStore: ReturnType<typeof useWorkflowsStore>,
): SelectedNodeInfo[] {
	if (!selectedNodeName) return [];

	const node = workflowsStore.getNodeByName(selectedNodeName);
	if (!node) return [];

	return [
		{
			name: node.name,
			type: node.type,
			...(node.parameters && Object.keys(node.parameters).length > 0
				? { parameters: node.parameters as Record<string, unknown> }
				: {}),
		},
	];
}
