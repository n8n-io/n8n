// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// PD denotes that the node has pinned data

import { createNodeData } from './helpers';
import { DirectedGraph } from '../directed-graph';
import { handleCycles } from '../handle-cycles';

describe('handleCycles', () => {
	//                 ┌────┐          ┌─────────┐
	//┌───────┐        │    ├──────────►afterLoop│
	//│trigger├────┬───►loop│          └─────────┘
	//└───────┘    │   │    ├─┐    ►►
	//             │   └────┘ │   ┌──────┐
	//             │          └───►inLoop├────┐
	//             │              └──────┘    │
	//             │                          │
	//             └──────────────────────────┘
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

	//                 ┌────┐          ┌─────────┐
	//┌───────┐        │    ├──────────►afterLoop│
	//│trigger├────┬───►loop│          └─────────┘
	//└───────┘    │   │    ├─┐    ►►
	//             │   └────┘ │   ┌──────┐
	//             │          └───►inLoop├────┐
	//             │              └──────┘    │
	//             │                          │
	//             └──────────────────────────┘
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

	//                                  ►►
	//                 ┌────┐          ┌─────────┐
	//┌───────┐        │    ├──────────►afterLoop│
	//│trigger├────┬───►loop│          └─────────┘
	//└───────┘    │   │    ├─┐
	//             │   └────┘ │   ┌──────┐
	//             │          └───►inLoop├────┐
	//             │              └──────┘    │
	//             │                          │
	//             └──────────────────────────┘
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
