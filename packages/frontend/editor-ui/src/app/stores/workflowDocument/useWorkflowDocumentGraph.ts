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

	function getConnectedNodes(direction: 'upstream' | 'downstream', nodeName: string): string[] {
		let checkNodes: string[];
		if (direction === 'downstream') {
			checkNodes = workflowsStore.workflowObject.getChildNodes(nodeName);
		} else if (direction === 'upstream') {
			checkNodes = workflowsStore.workflowObject.getParentNodes(nodeName);
		} else {
			throw new Error(`The direction "${direction}" is not supported!`);
		}

		// Find also all nodes which are connected to the child nodes via a non-main input
		let connectedNodes: string[] = [];
		checkNodes.forEach((checkNode) => {
			connectedNodes = [
				...connectedNodes,
				checkNode,
				...workflowsStore.workflowObject.getParentNodes(checkNode, 'ALL_NON_MAIN'),
			];
		});

		// Remove duplicates
		return [...new Set(connectedNodes)];
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
		getConnectedNodes,

		// Node lookup
		getNodeByNameFromWorkflow,
		getStartNode,
	};
}
