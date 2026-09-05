import type { StepExecutionContext, WorkflowGraph } from '@n8n/engine';
import { describe, expect, it } from 'vitest';

import type { V1NodeStepConfig } from '../types';
import { toV1ExecuteMode, toV1Execution, toV1Node, toV1Sources } from '../v1-adapters';
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
	it('rebuilds v1 nodes, including the trigger', () => {
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

	it('restores the credential references a node was converted with', () => {
		const credentials = { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth account' } };
		const [graphNode] = converter.convert(
			v1Workflow([{ id: 'http', name: 'HTTP', type: 'test.echoParam', credentials }]),
		).nodes;

		expect(toV1Node(graphNode, graphNode.config as V1NodeStepConfig)).toMatchObject({
			credentials,
		});
	});

	it('rebuilds the trigger with its own v1 identity, so expressions can read it', () => {
		const production = converter.convert(
			v1Workflow([
				{
					id: 't',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					parameters: { path: 'abc' },
				},
			]),
		);

		const execution = toV1Execution(production, {}, 't', 0);

		expect(execution.nodes).toEqual([
			expect.objectContaining({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				parameters: { path: 'abc' },
			}),
		]);
	});

	it('falls back to a manual trigger stub for a graph converted before the config existed', () => {
		const legacy: WorkflowGraph = {
			nodes: [{ id: 't', name: 'Webhook', type: 'trigger' }],
			edges: [],
		};

		const execution = toV1Execution(legacy, {}, 't', 0);

		expect(execution.nodes).toEqual([
			expect.objectContaining({
				name: 'Webhook',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				parameters: {},
			}),
		]);
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

describe('toV1ExecuteMode', () => {
	const context = (overrides: Partial<StepExecutionContext>): StepExecutionContext => ({
		executionId: 'exec-1',
		stepId: 'step-1',
		workflowId: 'wf-1',
		mode: 'production',
		iteration: 0,
		...overrides,
	});

	it('returns the host mode when v1 knows it', () => {
		expect(toV1ExecuteMode(context({ hostMode: 'webhook' }))).toBe('webhook');
	});

	it.each([
		['manual', 'manual'],
		['production', 'trigger'],
	] as const)('derives %s from the engine mode when the host stored none', (mode, expected) => {
		expect(toV1ExecuteMode(context({ mode }))).toBe(expected);
	});

	it('falls back to the engine mode when the host mode is not one v1 knows', () => {
		expect(toV1ExecuteMode(context({ mode: 'manual', hostMode: 'production' }))).toBe('manual');
	});
});
