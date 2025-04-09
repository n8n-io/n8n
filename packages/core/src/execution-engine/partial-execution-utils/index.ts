import * as a from 'assert/strict';
import { NodeConnectionTypes, type INode, type INodeTypes } from 'n8n-workflow';

import { type DirectedGraph } from './directed-graph';
export { findTriggerForPartialExecution } from './find-trigger-for-partial-execution';
export { findStartNodes } from './find-start-nodes';
export { findSubgraph } from './find-subgraph';
export { recreateNodeExecutionStack } from './recreate-node-execution-stack';
export { cleanRunData } from './clean-run-data';
export { handleCycles } from './handle-cycles';
export { filterDisabledNodes } from './filter-disabled-nodes';

export function isTool(node: INode, nodeTypes: INodeTypes) {
	const type = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	console.log('node', node);
	console.log('type', type);
	console.log('type.description', type.description);
	console.log('type.description.codex', type.description.codex);

	return type.description.outputs.includes(NodeConnectionTypes.AiTool);
}

export function rewireGraph(tool: INode, graph: DirectedGraph): DirectedGraph {
	graph = graph.clone();
	const children = graph.getChildren(tool);
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
