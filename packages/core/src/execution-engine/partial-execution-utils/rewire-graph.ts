import * as a from 'assert/strict';
import { type INode, NodeConnectionTypes } from 'n8n-workflow';

import { type DirectedGraph } from './directed-graph';

export function rewireGraph(tool: INode, graph: DirectedGraph): DirectedGraph {
	graph = graph.clone();
	const children = graph.getChildren(tool);

	a.ok(children.size > 0, 'Tool must be connected to a root node');

	const rootNode = [...children][0];

	a.ok(rootNode);

	const allIncomingConnection = graph
		.getDirectParentConnections(rootNode)
		.filter((cn) => cn.type === NodeConnectionTypes.Main);

	tool.rewireOutputLogTo = NodeConnectionTypes.AiTool;

	for (const cn of allIncomingConnection) {
		graph.addConnection({ from: cn.from, to: tool });
	}

	graph.removeNode(rootNode);

	return graph;
}
