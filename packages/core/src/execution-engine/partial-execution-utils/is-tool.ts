import { type INode, type INodeTypes, NodeConnectionTypes } from 'n8n-workflow';

export function isTool(node: INode, nodeTypes: INodeTypes) {
	const type = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	// Check if node is a vector store in retrieve-as-tool mode
	if (node.type.includes('vectorStore')) {
		const mode = node.parameters?.mode;
		return mode === 'retrieve-as-tool';
	}

	// Check for other tool nodes
	for (const output of type.description.outputs) {
		if (typeof output === 'string') {
			return output === NodeConnectionTypes.AiTool;
		} else if (output?.type && output.type === NodeConnectionTypes.AiTool) {
			return true;
		}
	}

	return false;
}
