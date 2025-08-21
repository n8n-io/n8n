import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import * as a from 'assert/strict';
import { type AiAgentRequest, type INode, NodeConnectionTypes } from 'n8n-workflow';

import { type DirectedGraph } from './directed-graph';

export function rewireGraph(
	tool: INode,
	graph: DirectedGraph,
	agentRequest?: AiAgentRequest,
): DirectedGraph {
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

	// Create virtual agent node
	const toolExecutor: INode = {
		name: TOOL_EXECUTOR_NODE_NAME,
		disabled: false,
		type: '@n8n/n8n-nodes-langchain.toolExecutor',
		parameters: {
			query: agentRequest?.query ?? {},
			toolName: agentRequest?.tool?.name ?? '',
		},
		id: rootNode.id,
		typeVersion: 0,
		position: [0, 0],
	};

	// Add virtual agent to graph
	modifiedGraph.addNode(toolExecutor);

	// Rewire tool output to virtual agent
	tool.rewireOutputLogTo = NodeConnectionTypes.AiTool;
	modifiedGraph.addConnection({ from: tool, to: toolExecutor, type: NodeConnectionTypes.AiTool });

	// Rewire all incoming connections to virtual agent
	for (const cn of allIncomingConnection) {
		modifiedGraph.addConnection({ from: cn.from, to: toolExecutor, type: cn.type });
	}

	// Remove original agent node
	modifiedGraph.removeNode(rootNode);

	return modifiedGraph;
}
