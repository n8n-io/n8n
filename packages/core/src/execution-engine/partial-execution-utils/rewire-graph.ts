import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import { type AiAgentRequest, type INode, NodeConnectionTypes } from 'n8n-workflow';

import { type DirectedGraph } from './directed-graph';

/**
 * The node that runs `tool` — the one the Tool Executor stands in for.
 *
 * A tool reaches its root through non-main connections only, so the walk keeps
 * to those: following main connections as well would leave the root behind and
 * land on a node *downstream* of it, whose main parents are the nodes the run
 * is supposed to skip.
 *
 * The walk stops at the first node that has main parents, because those are the
 * connections the Tool Executor inherits. A node without them cannot supply
 * them — an Agent Tool between the tool and the top Agent, for one — so the walk
 * carries on past it. When no node on the way has main parents, the farthest one
 * is the root and the Tool Executor starts the run on its own.
 */
function findRootNode(graph: DirectedGraph, tool: INode): INode | undefined {
	const seen = new Set<INode>([tool]);
	const queue = [tool];
	let farthest: INode | undefined;

	while (queue.length > 0) {
		const current = queue.shift() as INode;

		for (const connection of graph.getDirectChildConnections(current)) {
			if (connection.type === NodeConnectionTypes.Main) continue;
			if (seen.has(connection.to)) continue;
			seen.add(connection.to);

			const hasMainParents = graph
				.getDirectParentConnections(connection.to)
				.some((cn) => cn.type === NodeConnectionTypes.Main);
			if (hasMainParents) return connection.to;

			farthest = connection.to;
			queue.push(connection.to);
		}
	}

	return farthest;
}

export function rewireGraph(
	tool: INode,
	graph: DirectedGraph,
	agentRequest?: AiAgentRequest,
): DirectedGraph {
	const modifiedGraph = graph.clone();
	const rootNode = findRootNode(modifiedGraph, tool);

	// Nothing runs this tool, so there is no node to stand in for.
	if (!rootNode) {
		return graph;
	}

	const allIncomingConnection = modifiedGraph
		.getDirectParentConnections(rootNode)
		.filter((cn) => cn.type === NodeConnectionTypes.Main);

	// Create virtual agent node
	const toolExecutor: INode = {
		name: TOOL_EXECUTOR_NODE_NAME,
		disabled: false,
		type: '@n8n/n8n-nodes-langchain.toolExecutor',
		parameters: {
			query: JSON.stringify(agentRequest?.query ?? {}),
			toolName: agentRequest?.tool?.name ?? '',
			node: tool.name,
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
