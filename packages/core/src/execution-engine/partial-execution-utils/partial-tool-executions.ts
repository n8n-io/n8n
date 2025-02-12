import * as assert from 'assert/strict';
import { type INode, type INodeTypes, NodeConnectionTypes } from "n8n-workflow";

import type { DirectedGraph } from "./directed-graph";

export function isTool(node: INode, nodeTypes: INodeTypes) : boolean {
	const type = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	return type.description.outputs.includes(NodeConnectionTypes.AiTool);
}

export function rewireGraph(tool: INode, graph: DirectedGraph): DirectedGraph {
	graph = graph.clone();
	const children = graph.getChildren(tool);
	const rootNode = [...children][0];

	assert.ok(rootNode);

	console.log('rootNode', rootNode);

	const allIncomingConnection = graph
		.getDirectParentConnections(rootNode)
		.filter((cn) => cn.type === NodeConnectionTypes.Main);

	console.log(
		'incoming connections',
		allIncomingConnection.map((cn) => `${cn.from.name} -> ${cn.to.name}`),
	);

	tool.rewireOutputLogTo = NodeConnectionTypes.AiTool;

	for (const cn of allIncomingConnection) {
		graph.addConnection({ from: cn.from, to: tool });
	}

	graph.removeNode(rootNode);

	console.log('');

	return graph;
}
