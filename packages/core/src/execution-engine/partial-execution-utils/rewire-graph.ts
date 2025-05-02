import * as a from 'assert/strict';
import { type INode, NodeConnectionTypes } from 'n8n-workflow';

import { type DirectedGraph } from './directed-graph';

export function rewireGraph(tool: INode, graph: DirectedGraph): DirectedGraph {
	const modifiedGraph = graph.clone();
	const children = modifiedGraph.getChildren(tool);

	if (children.size === 0) {
		return graph;
	}

	const rootNode = [...children][0];

	a.ok(rootNode);

	const allIncomingConnection = modifiedGraph
		.getDirectParentConnections(rootNode)
		.filter((cn) => cn.type === NodeConnectionTypes.Main);

	tool.rewireOutputLogTo = NodeConnectionTypes.AiTool;

	for (const cn of allIncomingConnection) {
		modifiedGraph.addConnection({ from: cn.from, to: tool });
	}

	modifiedGraph.removeNode(rootNode);

	return modifiedGraph;
}
