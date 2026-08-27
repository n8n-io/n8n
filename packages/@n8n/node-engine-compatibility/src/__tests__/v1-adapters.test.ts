import { describe, expect, it } from 'vitest';

import { toV1Execution, toV1Sources } from '../v1-adapters';
import { V1WorkflowConverter } from '../v1-workflow-converter';
import { items, v1Workflow } from './fixtures';

const converter = new V1WorkflowConverter();

// The shared fixture graph, in the notation of the converter tests
// (oN / iN mark output / input slots, (back) the loop-return edge):
//
// ┌───────┐    ┌─┐ o1    i1 ┌─┐    ┌────┐ o1    ┌────┐
// │Trigger├───►│A├─────────►│B├───►│Loop├──────►│Body│
// └───────┘    └─┘          └─┘    └─▲──┘       └──┬─┘
//                                    └───(back)────┘
const graph = converter.convert(
	v1Workflow(
		[
			{ id: 't', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ id: 'a', name: 'A', type: 'test.echoParam' },
			{ id: 'b', name: 'B', type: 'test.echoParam' },
			{ id: 'loop', name: 'Loop', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3 },
			{ id: 'body', name: 'Body', type: 'n8n-nodes-base.noOp' },
		],
		{
			Trigger: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
			A: { main: [[], [{ node: 'B', type: 'main', index: 1 }]] },
			B: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
			Loop: { main: [[], [{ node: 'Body', type: 'main', index: 0 }]] },
			Body: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
		},
	),
);

describe('toV1Execution', () => {
	it('rebuilds v1 nodes, including a stub for the trigger', () => {
		const execution = toV1Execution(graph, {}, 'a', 0);

		expect(execution.nodes.map((node) => node.name).sort()).toEqual([
			'A',
			'B',
			'Body',
			'Loop',
			'Trigger',
		]);
		expect(execution.nodes.find((node) => node.name === 'Trigger')).toMatchObject({
			type: 'n8n-nodes-base.manualTrigger',
		});
		expect(execution.nodes.find((node) => node.name === 'A')).toMatchObject({
			type: 'test.echoParam',
			typeVersion: 1,
			continueOnFail: false,
		});
	});

	it('rebuilds name-keyed connections preserving slots', () => {
		const execution = toV1Execution(graph, {}, 'a', 0);

		expect(execution.connections.A).toEqual({
			main: [[], [{ node: 'B', type: 'main', index: 1 }]],
		});
	});

	it('rebuilds run data with input provenance from the edges', () => {
		const execution = toV1Execution(graph, { a: { 0: items({ x: 1 }) } }, 'a', 0);

		expect(execution.runData).toEqual({
			A: [
				{
					startTime: 0,
					executionTime: 0,
					executionIndex: 0,
					source: [{ previousNode: 'Trigger', previousNodeOutput: 0 }],
					data: { main: [[{ json: { x: 1 } }]] },
				},
			],
		});
		expect(toV1Sources(graph).get('b')).toEqual([
			null,
			{ previousNode: 'A', previousNodeOutput: 1 },
		]);
	});

	it('keeps back edges in connections but not in provenance', () => {
		const execution = toV1Execution(graph, {}, 'a', 0);

		expect(execution.connections.Body).toEqual({
			main: [[{ node: 'Loop', type: 'main', index: 0 }]],
		});
		expect(toV1Sources(graph).get('loop')).toEqual([{ previousNode: 'B', previousNodeOutput: 0 }]);
	});

	it('omits nodes whose config is unreadable', () => {
		const brokenGraph = {
			nodes: [
				{ id: 'ok', name: 'OK', type: 'v1-node' as const, config: graph.nodes[1].config },
				{ id: 'bad', name: 'Bad', type: 'v1-node' as const, config: 'nonsense' },
			],
			edges: [],
		};

		const execution = toV1Execution(brokenGraph, {}, 'ok', 0);
		expect(execution.nodes.map((node) => node.name)).toEqual(['OK']);
	});

	describe('run data across loop iterations', () => {
		// Body and Loop are members; Trigger, A and B are not
		const outputs = {
			a: { 0: items({ from: 'a' }) },
			body: { 0: items({ pass: 0 }), 1: items({ pass: 1 }), 2: items({ pass: 2 }) },
		};

		it('shows a member runs through the active pass, so the last one is that pass', () => {
			const execution = toV1Execution(graph, outputs, 'body', 1);

			expect(execution.runData.Body).toHaveLength(2);
			expect(execution.runData.Body[1].data!.main[0]).toEqual([{ json: { pass: 1 } }]);
		});

		it('pads a member skipped on the active pass, rather than showing its last one', () => {
			// Body ran on passes 0 and 1 and was skipped on 2, so pass 2 must read as
			// empty and not as pass 1
			const skipped = { body: { 0: items({ pass: 0 }), 1: items({ pass: 1 }) } };
			const execution = toV1Execution(graph, skipped, 'body', 2);

			// one slot holding no items. Zero slots would read to v1 as no data at
			// all, and an expression naming Body would throw instead of see nothing
			expect(execution.runData.Body).toHaveLength(3);
			expect(execution.runData.Body[2].data!.main).toEqual([[]]);
		});

		it('shows a node in no loop iteration 0 alone, seen from inside the loop', () => {
			const execution = toV1Execution(graph, outputs, 'body', 2);

			expect(execution.runData.A).toHaveLength(1);
		});

		it('shows every pass to a node outside all loops, so it reads the final one', () => {
			// from A, an expression naming Body should read the final pass, as v1 does
			const execution = toV1Execution(graph, outputs, 'a', 0);

			expect(execution.runData.Body).toHaveLength(3);
			expect(execution.runData.Body[2].data!.main[0]).toEqual([{ json: { pass: 2 } }]);
		});

		it('never invents runs for a node that has not executed', () => {
			const execution = toV1Execution(graph, outputs, 'body', 2);

			expect(execution.runData.B).toBeUndefined();
		});
	});
});
