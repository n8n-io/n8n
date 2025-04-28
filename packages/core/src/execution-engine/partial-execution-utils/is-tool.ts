import { type INode, type INodeTypes, NodeConnectionTypes } from 'n8n-workflow';

export function isTool(node: INode, nodeTypes: INodeTypes) {
	const type = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	return type.description.outputs.includes(NodeConnectionTypes.AiTool);
}
