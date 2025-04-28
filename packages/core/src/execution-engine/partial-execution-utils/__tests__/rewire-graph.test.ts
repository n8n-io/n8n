import { NodeConnectionTypes } from 'n8n-workflow';

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

		const toolConnections = rewiredGraph.getDirectParentConnections(tool);
		expect(toolConnections).toHaveLength(1);
		expect(toolConnections[0].from.name).toBe('trigger');
		expect(toolConnections[0].type).toBe(NodeConnectionTypes.Main);

		expect(rewiredGraph.hasNode(root.name)).toBe(false);
	});

	it('rewires all incoming connections of the root node to the tool', () => {
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

		const toolConnections = rewiredGraph.getDirectParentConnections(tool);
		expect(toolConnections).toHaveLength(2);
		expect(toolConnections.map((cn) => cn.from.name).sort()).toEqual(
			['secondNode', 'thirdNode'].sort(),
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

		const toolConnections = rewiredGraph.getDirectParentConnections(tool);
		expect(toolConnections).toHaveLength(1);
		expect(toolConnections[0].type).toBe(NodeConnectionTypes.Main);
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

	it('fails when the tool has no incoming connections', () => {
		const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.ai-tool' });
		const root = createNodeData({ name: 'root' });

		const graph = new DirectedGraph();
		graph.addNodes(root, tool);

		expect(() => rewireGraph(tool, graph)).toThrow();
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
});
