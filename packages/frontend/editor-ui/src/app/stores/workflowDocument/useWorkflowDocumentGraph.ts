import {
	CHAT_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	type IConnectedNode,
	type IConnection,
	type INode,
	type INodeConnection,
	type NodeConnectionType,
	type Workflow,
} from 'n8n-workflow';
import type { Ref } from 'vue';

// --- Composable ---

export function useWorkflowDocumentGraph(workflowObject: Readonly<Ref<Workflow>>) {
	// -----------------------------------------------------------------------
	// Graph traversal
	// -----------------------------------------------------------------------

	function getParentNodes(
		nodeName: string,
		type?: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN',
		depth?: number,
	): string[] {
		return workflowObject.value.getParentNodes(nodeName, type, depth);
	}

	function getChildNodes(
		nodeName: string,
		type?: NodeConnectionType | 'ALL' | 'ALL_NON_MAIN',
		depth?: number,
	): string[] {
		return workflowObject.value.getChildNodes(nodeName, type, depth);
	}

	function getParentNodesByDepth(nodeName: string, maxDepth?: number): IConnectedNode[] {
		return workflowObject.value.getParentNodesByDepth(nodeName, maxDepth);
	}

	function getConnectionsBetweenNodes(
		sources: string[],
		targets: string[],
	): Array<[IConnection, IConnection]> {
		return workflowObject.value.getConnectionsBetweenNodes(sources, targets);
	}

	function getConnectedNodes(direction: 'upstream' | 'downstream', nodeName: string): string[] {
		let checkNodes: string[];
		if (direction === 'downstream') {
			checkNodes = workflowObject.value.getChildNodes(nodeName);
		} else if (direction === 'upstream') {
			checkNodes = workflowObject.value.getParentNodes(nodeName);
		} else {
			throw new Error(`The direction "${direction}" is not supported!`);
		}

		// Find also all nodes which are connected to the child nodes via a non-main input
		const connectedNodeSet = new Set<string>();
		for (const checkNode of checkNodes) {
			connectedNodeSet.add(checkNode);
			for (const parent of workflowObject.value.getParentNodes(checkNode, 'ALL_NON_MAIN')) {
				connectedNodeSet.add(parent);
			}
		}

		return [...connectedNodeSet];
	}

	// -----------------------------------------------------------------------
	// Node lookup (returns INode from Workflow class, not INodeUi)
	// -----------------------------------------------------------------------

	function getNodeByNameFromWorkflow(nodeName: string): INode | null {
		return workflowObject.value.getNode(nodeName);
	}

	function getStartNode(destinationNode?: string): INode | undefined {
		return workflowObject.value.getStartNode(destinationNode);
	}

	function getParentMainInputNode(node: INode): INode {
		return workflowObject.value.getParentMainInputNode(node);
	}

	function getNodeConnectionIndexes(
		nodeName: string,
		parentNodeName: string,
		type: NodeConnectionType = NodeConnectionTypes.Main,
	): INodeConnection | undefined {
		return workflowObject.value.getNodeConnectionIndexes(nodeName, parentNodeName, type);
	}

	function findRootWithMainConnection(nodeName: string): string | null {
		const children = getChildNodes(nodeName, 'ALL');

		for (let i = children.length - 1; i >= 0; i--) {
			const childName = children[i];
			const parentNodes = getParentNodes(childName, NodeConnectionTypes.Main);

			if (parentNodes.length > 0) {
				return childName;
			}
		}

		return null;
	}

	function checkIfNodeHasChatParent(nodeName: string): boolean {
		const parents = getParentNodes(nodeName, NodeConnectionTypes.Main);

		return parents.some((parent) => {
			const parentNodeType = workflowObject.value.getNode?.(parent)?.type;
			return parentNodeType === CHAT_TRIGGER_NODE_TYPE;
		});
	}

	function checkIfToolNodeHasChatParent(nodeName: string): boolean {
		const agentNodes = getChildNodes(nodeName, NodeConnectionTypes.AiTool);
		return agentNodes.some((agentNode) => checkIfNodeHasChatParent(agentNode));
	}

	return {
		// Graph traversal
		getParentNodes,
		getChildNodes,
		getParentNodesByDepth,
		getConnectionsBetweenNodes,
		getParentMainInputNode,
		getNodeConnectionIndexes,
		getConnectedNodes,
		findRootWithMainConnection,
		checkIfNodeHasChatParent,
		checkIfToolNodeHasChatParent,

		// Node lookup
		getNodeByNameFromWorkflow,
		getStartNode,
	};
}
