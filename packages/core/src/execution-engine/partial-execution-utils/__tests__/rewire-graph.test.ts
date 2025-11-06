import { type INode, NodeConnectionTypes } from 'n8n-workflow';

import { createNodeData } from './helpers';
import { DirectedGraph } from '../directed-graph';
import { rewireGraph } from '../rewire-graph';

describe('rewireGraph()', () => {
	it('rewires a simple graph with a tool node', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });
		const trigger = createNodeData({ name: 'trigger' });

		const graph = new DirectedGraph();
		graph.addNodes(trigger, root, tool);
		graph.addConnections(
			{ from: trigger, to: root, type: NodeConnectionTypes.Main },
			{ from: tool, to: root, type: NodeConnectionTypes.AiTool },
		);

		const rewiredGraph = rewireGraph(tool, graph);

		const executorNode = rewiredGraph
			.getNodesByNames(['PartialExecutionToolExecutor'])
			.values()
			.next().value as INode;

		const toolConnections = rewiredGraph.getDirectParentConnections(executorNode);

		expect(toolConnections).toHaveLength(2);
		// Executor should be connected to tool
		expect(toolConnections[0].from).toBe(tool);
		expect(toolConnections[0].to).toBe(executorNode);
		expect(toolConnections[0].type).toBe(NodeConnectionTypes.AiTool);
		// Executor should be connected to trigger
		expect(toolConnections[1].from).toBe(trigger);
		expect(toolConnections[1].to).toBe(executorNode);
		expect(toolConnections[1].type).toBe(NodeConnectionTypes.Main);

		expect(rewiredGraph.hasNode(root.name)).toBe(false);
	});

	it('rewires all incoming connections of the root node to the executorNode', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });
		const trigger = createNodeData({ name: 'trigger' });
		const secondNode = createNodeData({ name: 'secondNode' });
		const thirdNode = createNodeData({ name: 'thirdNode' });

		const graph = new DirectedGraph();
		graph.addNodes(trigger, root, tool, secondNode, thirdNode);
		graph.addConnections(
			{ from: trigger, to: secondNode, type: NodeConnectionTypes.Main },
			{ from: trigger, to: thirdNode, type: NodeConnectionTypes.Main },
			{ from: tool, to: root, type: NodeConnectionTypes.AiTool },
			{ from: secondNode, to: root, type: NodeConnectionTypes.Main },
			{ from: thirdNode, to: root, type: NodeConnectionTypes.Main },
		);

		const rewiredGraph = rewireGraph(tool, graph);

		const executorNode = rewiredGraph
			.getNodesByNames(['PartialExecutionToolExecutor'])
			.values()
			.next().value as INode;

		const executorConnections = rewiredGraph.getDirectParentConnections(executorNode);

		expect(executorConnections).toHaveLength(3);
		expect(executorConnections.map((cn) => cn.from.name).sort()).toEqual(
			['tool', 'secondNode', 'thirdNode'].sort(),
		);
	});

	it('ignores non-main connections when rewiring', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });
		const parent = createNodeData({ name: 'parent' });
		const trigger = createNodeData({ name: 'trigger' });
		const child = createNodeData({ name: 'child' });

		const graph = new DirectedGraph();
		graph.addNodes(trigger, root, tool, parent, child);
		graph.addConnections(
			{ from: trigger, to: root, type: NodeConnectionTypes.Main },
			{ from: parent, to: root, type: NodeConnectionTypes.AiLanguageModel },
			{ from: child, to: root, type: NodeConnectionTypes.AiTool },
			{ from: tool, to: root, type: NodeConnectionTypes.AiTool },
		);

		const rewiredGraph = rewireGraph(tool, graph);

		const executorNode = rewiredGraph
			.getNodesByNames(['PartialExecutionToolExecutor'])
			.values()
			.next().value as INode;

		const executorConnections = rewiredGraph.getDirectParentConnections(executorNode);

		expect(executorConnections).toHaveLength(2);

		expect(executorConnections[0].type).toBe(NodeConnectionTypes.AiTool);
		expect(executorConnections[1].type).toBe(NodeConnectionTypes.Main);
	});

	it('sets rewireOutputLogTo to AiTool on the tool node', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const trigger = createNodeData({ name: 'trigger' });
		const root = createNodeData({ name: 'root' });

		const graph = new DirectedGraph();
		graph.addNodes(trigger, root, tool);
		graph.addConnections(
			{ from: trigger, to: root, type: NodeConnectionTypes.Main },
			{ from: tool, to: root, type: NodeConnectionTypes.AiTool },
		);

		rewireGraph(tool, graph);

		expect(tool.rewireOutputLogTo).toBe(NodeConnectionTypes.AiTool);
	});

	it('should not rewire when the tool has no root', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });

		const graph = new DirectedGraph();
		graph.addNodes(root, tool);
		const result = rewireGraph(tool, graph);

		expect(result).toStrictEqual(graph);
	});

	it('removes the root node from the graph', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });

		const graph = new DirectedGraph();
		graph.addNodes(root, tool);
		graph.addConnections({ from: tool, to: root, type: NodeConnectionTypes.AiTool });

		const rewiredGraph = rewireGraph(tool, graph);

		expect(rewiredGraph.hasNode(root.name)).toBe(false);
	});

	it('sets parameters.query and toolName on the executor node', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const trigger = createNodeData({ name: 'trigger' });
		const root = createNodeData({ name: 'root' });
		const agentRequest = {
			query: { some: 'query' },
			tool: {
				name: 'toolName',
			},
		};

		const graph = new DirectedGraph();
		graph.addNodes(trigger, root, tool);
		graph.addConnections(
			{ from: trigger, to: root, type: NodeConnectionTypes.Main },
			{ from: tool, to: root, type: NodeConnectionTypes.AiTool },
		);

		const rewiredGraph = rewireGraph(tool, graph, agentRequest);

		const executorNode = rewiredGraph
			.getNodesByNames(['PartialExecutionToolExecutor'])
			.values()
			.next().value as INode;

		expect(executorNode.parameters.query).toEqual(agentRequest.query);
		expect(executorNode.parameters.toolName).toEqual(agentRequest.tool.name);
	});

	it('rewires deeply nested tools', () => {
		// Create a hierarchy: trigger -> topAgent <- agentTool <- leafTool
		// This simulates an agent (topAgent) that has an agent tool, that has a tool that's being manually executed
		const trigger = createNodeData({ name: 'trigger' });
		const topAgent = createNodeData({ name: 'topAgent', type: 'n8n-nodes-base.ai-agent' });
		const agentTool = createNodeData({ name: 'agentTool', type: 'n8n-nodes-base.ai-agent-tool' });
		const leafTool = createNodeData({ name: 'leafTool', type: 'n8n-nodes-base.ai-tool' });

		const graph = new DirectedGraph();
		graph.addNodes(trigger, topAgent, agentTool, leafTool);
		graph.addConnections(
			{ from: trigger, to: topAgent, type: NodeConnectionTypes.Main },
			{ from: agentTool, to: topAgent, type: NodeConnectionTypes.AiTool },
			{ from: leafTool, to: agentTool, type: NodeConnectionTypes.AiTool },
		);

		// Test rewiring the deepest tool (leafTool) which creates multiple levels of indirection
		const rewiredGraph = rewireGraph(leafTool, graph);

		// Rewiring should create a new executor node
		expect(rewiredGraph).not.toBe(graph);

		const executorNode = rewiredGraph
			.getNodesByNames(['PartialExecutionToolExecutor'])
			.values()
			.next().value as INode;

		expect(executorNode).toBeDefined();

		const executorConnections = rewiredGraph.getDirectParentConnections(executorNode);

		// The executor should have a tool connection from leafTool
		const toolConnection = executorConnections.find(
			(cn) => cn.from === leafTool && cn.type === NodeConnectionTypes.AiTool,
		);
		expect(toolConnection).toBeDefined();

		// The executor also should have a main connection - the rewire logic traces back through the hierarchy
		const mainConnections = executorConnections.filter(
			(cn) => cn.type === NodeConnectionTypes.Main,
		);
		expect(mainConnections.length).toBeGreaterThan(0);

		// The root node (topAgent) gets removed (replaced by the executor)
		expect(rewiredGraph.hasNode('topAgent')).toBe(false);

		// We don't care about the intermediate agentTool - it can remain, as long as the connection
		// is from executor to leafTool and connected to a trigger

		// The tested tool (leafTool) and the trigger remain
		expect(rewiredGraph.hasNode('trigger')).toBe(true);
		expect(rewiredGraph.hasNode('leafTool')).toBe(true);
	});
});
