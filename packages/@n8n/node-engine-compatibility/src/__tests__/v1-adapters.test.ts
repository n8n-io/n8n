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
		const execution = toV1Execution(graph, {});

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
		const execution = toV1Execution(graph, {});

		expect(execution.connections.A).toEqual({
			main: [[], [{ node: 'B', type: 'main', index: 1 }]],
		});
	});

	it('rebuilds run data with input provenance from the edges', () => {
		const execution = toV1Execution(graph, { a: items({ x: 1 }) });

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
		const execution = toV1Execution(graph, {});

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

		const execution = toV1Execution(brokenGraph, {});
		expect(execution.nodes.map((node) => node.name)).toEqual(['OK']);
	});
});
