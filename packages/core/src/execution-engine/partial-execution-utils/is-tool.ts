import { type INode, type INodeTypes, NodeHelpers } from 'n8n-workflow';

export function isTool(node: INode, nodeTypes: INodeTypes) {
	const type = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	return NodeHelpers.isTool(type.description, node.parameters);
}
