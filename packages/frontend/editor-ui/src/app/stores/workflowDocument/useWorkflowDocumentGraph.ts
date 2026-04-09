import type { IConnectedNode, IConnection, INode, NodeConnectionType } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore.workflowObject for reads.
// The long-term goal is to remove workflowsStore entirely — workflowObject will become
// private state owned by workflowDocumentStore. Once that happens, the direct import
// (and the import-cycle warning it causes) will go away.
export function useWorkflowDocumentGraph() {
	const workflowsStore = useWorkflowsStore();

	// -----------------------------------------------------------------------
	// Graph traversal
	// -----------------------------------------------------------------------

	function getParentNodes(
		nodeName: string,
		type?: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN',
		depth?: number,
	): string[] {
		return workflowsStore.workflowObject.getParentNodes(nodeName, type, depth);
	}

	function getChildNodes(
		nodeName: string,
		type?: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN',
		depth?: number,
	): string[] {
		return workflowsStore.workflowObject.getChildNodes(nodeName, type, depth);
	}

	function getParentNodesByDepth(nodeName: string, maxDepth?: number): IConnectedNode[] {
		return workflowsStore.workflowObject.getParentNodesByDepth(nodeName, maxDepth);
	}

	function getConnectionsBetweenNodes(
		sources: string[],
		targets: string[],
	): Array<[IConnection, IConnection]> {
		return workflowsStore.workflowObject.getConnectionsBetweenNodes(sources, targets);
	}

	// -----------------------------------------------------------------------
	// Node lookup (returns INode from Workflow class, not INodeUi)
	// -----------------------------------------------------------------------

	function getNodeByNameFromWorkflow(nodeName: string): INode | null {
		return workflowsStore.workflowObject.getNode(nodeName);
	}

	function getStartNode(destinationNode?: string): INode | undefined {
		return workflowsStore.workflowObject.getStartNode(destinationNode);
	}

	return {
		// Graph traversal
		getParentNodes,
		getChildNodes,
		getParentNodesByDepth,
		getConnectionsBetweenNodes,

		// Node lookup
		getNodeByNameFromWorkflow,
		getStartNode,
	};
}
