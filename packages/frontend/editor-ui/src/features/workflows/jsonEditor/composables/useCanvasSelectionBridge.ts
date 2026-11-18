import { computed, onScopeDispose } from 'vue';
import { useVueFlow, type GraphNode } from '@vue-flow/core';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import {
	isCanvasGroupNode,
	parseCanvasGroupNodeId,
} from '@/features/workflows/canvas/canvas.types';

/**
 * Reads and drives the canvas selection from outside the canvas.
 * Mount it after <WorkflowCanvas>: useVueFlow(id) creates an empty store when none exists yet.
 */
export function useCanvasSelectionBridge() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const vueFlow = useVueFlow(workflowDocumentStore.value.workflowId);

	/** A selected group stands for its members */
	function workflowNodeIds(node: GraphNode): string[] {
		if (!isCanvasGroupNode(node)) return [node.id];
		const groupId = parseCanvasGroupNodeId(node.id);
		return groupId ? (workflowDocumentStore.value.getGroupById(groupId)?.nodeIds ?? []) : [];
	}

	/** Workflow node ids selected on the canvas */
	const selectedNodeIds = computed<string[]>(() => {
		const doc = workflowDocumentStore.value;
		const ids = vueFlow.getSelectedNodes.value.flatMap(workflowNodeIds);
		// Drops placeholders such as "add first step", which are not workflow nodes
		return [...new Set(ids)].filter((id) => doc.getNodeById(id) !== undefined);
	});

	/** Same path as the logs panel: replace the selection and pan only as much as needed. */
	function selectNodes(ids: string[]) {
		const doc = workflowDocumentStore.value;
		const known = ids.filter((id) => doc.getNodeById(id) !== undefined);
		if (known.length > 0) canvasEventBus.emit('nodes:select', { ids: known, panIntoView: true });
	}

	/** A click on a node that is already selected does not change the selection, so clicks count too */
	function onNodeClick(handler: (ids: string[]) => void) {
		const { off } = vueFlow.onNodeClick(({ node }) => handler(workflowNodeIds(node)));
		onScopeDispose(off);
	}

	/** Members of a collapsed group are hidden, and the spotlight would then dim the whole canvas */
	const isHiddenOnCanvas = (id: string) => vueFlow.findNode(id)?.hidden === true;

	return { selectedNodeIds, selectNodes, onNodeClick, isHiddenOnCanvas };
}
