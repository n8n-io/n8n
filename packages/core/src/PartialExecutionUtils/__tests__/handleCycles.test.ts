import { createNodeData } from './helpers';
import { DirectedGraph } from '../DirectedGraph';
import { handleCycles } from '../handleCycles';

describe('handleCycles', () => {
	test('if the start node is within a cycle it returns the start of the cycle as the new start node', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const loop = createNodeData({ name: 'loop' });
		const inLoop = createNodeData({ name: 'inLoop' });
		const afterLoop = createNodeData({ name: 'afterLoop' });
		const graph = new DirectedGraph()
			.addNodes(trigger, loop, inLoop, afterLoop)
			.addConnections(
				{ from: trigger, to: loop },
				{ from: loop, outputIndex: 0, to: afterLoop },
				{ from: loop, outputIndex: 1, to: inLoop },
				{ from: inLoop, to: loop },
			);
		const startNodes = new Set([inLoop]);

		// ACT
		const newStartNodes = handleCycles(graph, startNodes, trigger);

		// ASSERT
		expect(newStartNodes.size).toBe(1);
		expect(newStartNodes).toContainEqual(loop);
	});

	test('does not mutate `startNodes`', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const loop = createNodeData({ name: 'loop' });
		const inLoop = createNodeData({ name: 'inLoop' });
		const afterLoop = createNodeData({ name: 'afterLoop' });
		const graph = new DirectedGraph()
			.addNodes(trigger, loop, inLoop, afterLoop)
			.addConnections(
				{ from: trigger, to: loop },
				{ from: loop, outputIndex: 0, to: afterLoop },
				{ from: loop, outputIndex: 1, to: inLoop },
				{ from: inLoop, to: loop },
			);
		const startNodes = new Set([inLoop]);

		// ACT
		handleCycles(graph, startNodes, trigger);

		// ASSERT
		expect(startNodes.size).toBe(1);
		expect(startNodes).toContainEqual(inLoop);
	});

	test('if the start node is not within a cycle it returns the same node as the new start node', () => {
		// ARRANGE
		const trigger = createNodeData({ name: 'trigger' });
		const loop = createNodeData({ name: 'loop' });
		const inLoop = createNodeData({ name: 'inLoop' });
		const afterLoop = createNodeData({ name: 'afterLoop' });
		const graph = new DirectedGraph()
			.addNodes(trigger, loop, inLoop, afterLoop)
			.addConnections(
				{ from: trigger, to: loop },
				{ from: loop, outputIndex: 0, to: afterLoop },
				{ from: loop, outputIndex: 1, to: inLoop },
				{ from: inLoop, to: loop },
			);
		const startNodes = new Set([afterLoop]);

		// ACT
		const newStartNodes = handleCycles(graph, startNodes, trigger);

		// ASSERT
		expect(newStartNodes.size).toBe(1);
		expect(newStartNodes).toContainEqual(afterLoop);
	});
});
