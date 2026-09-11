import type { StepDetail, StepStatus, WorkflowGraph } from '@n8n/engine';
import type { ExecutionStatus } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { toV1RunExecutionData } from '../v1-execution-read';

// Trigger ──► Set ──► Tail
const graph: WorkflowGraph = {
	nodes: [
		{ id: 't', name: 'Trigger', type: 'trigger' },
		{ id: 's', name: 'Set', type: 'v1-node' },
		{ id: 'x', name: 'Tail', type: 'v1-node' },
	],
	edges: [
		{ from: 't', to: 's', outputIndex: 0, inputIndex: 0 },
		{ from: 's', to: 'x', outputIndex: 0, inputIndex: 0 },
	],
};

const step = (overrides: Partial<StepDetail> = {}): StepDetail => ({
	id: 'step-1',
	nodeId: 't',
	iteration: 0,
	status: 'completed',
	outputs: [[{ json: { hello: 'world' } }]],
	error: null,
	createdAt: '2026-08-25T10:00:00.000Z',
	updatedAt: '2026-08-25T10:00:00.250Z',
	...overrides,
});

describe('toV1RunExecutionData', () => {
	it('keys run data by node name, with the step outputs under `main`', () => {
		const data = toV1RunExecutionData(graph, [
			step(),
			step({ id: 'step-2', nodeId: 's', outputs: [[{ json: { n: 1 } }, { json: { n: 2 } }]] }),
		]);

		expect(Object.keys(data.resultData.runData)).toEqual(['Trigger', 'Set']);
		expect(data.resultData.runData.Trigger[0].data).toEqual({
			main: [[{ json: { hello: 'world' } }]],
		});
		expect(data.resultData.runData.Set[0].data).toEqual({
			main: [[{ json: { n: 1 } }, { json: { n: 2 } }]],
		});
	});

	it('reports no run data for an execution with no steps', () => {
		const data = toV1RunExecutionData(graph, []);

		expect(data.resultData.runData).toEqual({});
		expect(data.resultData.error).toBeUndefined();
		expect(data.resultData.lastNodeExecuted).toBeUndefined();
	});

	it.each<[StepStatus, ExecutionStatus]>([
		['completed', 'success'],
		['failed', 'error'],
		['running', 'running'],
	])('maps step status %j to %j', (status, expected) => {
		const data = toV1RunExecutionData(graph, [step({ status })]);

		expect(data.resultData.runData.Trigger[0].executionStatus).toBe(expected);
	});

	// `cancelQueuedSteps` is the only writer of `cancelled`, and it updates queued
	// rows only, so a cancelled step never ran.
	it.each<StepStatus>(['queued', 'skipped', 'cancelled'])(
		'reports no run for a %j step, the way v1 reports a node that did not run',
		(status) => {
			const data = toV1RunExecutionData(graph, [step({ status })]);

			expect(data.resultData.runData).toEqual({});
		},
	);

	it('takes timing from the row timestamps', () => {
		const data = toV1RunExecutionData(graph, [step()]);

		expect(data.resultData.runData.Trigger[0]).toMatchObject({
			startTime: Date.parse('2026-08-25T10:00:00.000Z'),
			executionTime: 250,
		});
	});

	it('clamps a negative duration to zero', () => {
		const data = toV1RunExecutionData(graph, [
			step({ createdAt: '2026-08-25T10:00:01.000Z', updatedAt: '2026-08-25T10:00:00.000Z' }),
		]);

		expect(data.resultData.runData.Trigger[0].executionTime).toBe(0);
	});

	it('numbers `executionIndex` by data plane order, not by iteration', () => {
		const data = toV1RunExecutionData(graph, [
			step(),
			step({ id: 'step-2', nodeId: 's' }),
			step({ id: 'step-3', nodeId: 'x' }),
		]);

		expect(data.resultData.runData.Trigger[0].executionIndex).toBe(0);
		expect(data.resultData.runData.Set[0].executionIndex).toBe(1);
		expect(data.resultData.runData.Tail[0].executionIndex).toBe(2);
	});

	it('rebuilds `source` from the graph edges, and leaves it empty for a trigger', () => {
		const data = toV1RunExecutionData(graph, [step(), step({ id: 'step-2', nodeId: 's' })]);

		expect(data.resultData.runData.Trigger[0].source).toEqual([]);
		expect(data.resultData.runData.Set[0].source).toEqual([
			{ previousNode: 'Trigger', previousNodeOutput: 0 },
		]);
	});

	it('pads an unfilled input slot with null', () => {
		const merge: WorkflowGraph = {
			nodes: [
				{ id: 't', name: 'Trigger', type: 'trigger' },
				{ id: 'm', name: 'Merge', type: 'v1-node' },
			],
			// Only the second input is connected.
			edges: [{ from: 't', to: 'm', outputIndex: 0, inputIndex: 1 }],
		};

		const data = toV1RunExecutionData(merge, [step({ nodeId: 'm' })]);

		expect(data.resultData.runData.Merge[0].source).toEqual([
			null,
			{ previousNode: 'Trigger', previousNodeOutput: 0 },
		]);
	});

	it('drops a step whose node is no longer in the graph', () => {
		const data = toV1RunExecutionData(graph, [step({ nodeId: 'gone' })]);

		expect(data.resultData.runData).toEqual({});
	});

	it('reports a failed step as the execution error and the last node executed', () => {
		const data = toV1RunExecutionData(graph, [
			step(),
			step({
				id: 'step-2',
				nodeId: 's',
				status: 'failed',
				outputs: null,
				error: { name: 'NodeOperationError', message: 'Boom', stack: 'at somewhere' },
			}),
		]);

		const task = data.resultData.runData.Set[0];
		expect(task.data).toBeUndefined();
		expect(task.error).toMatchObject({ name: 'NodeOperationError', message: 'Boom' });
		expect(data.resultData.error).toBe(task.error);
		expect(data.resultData.lastNodeExecuted).toBe('Set');
	});

	it('reports the last step as the last node executed when nothing failed', () => {
		const data = toV1RunExecutionData(graph, [step(), step({ id: 'step-2', nodeId: 's' })]);

		expect(data.resultData.error).toBeUndefined();
		expect(data.resultData.lastNodeExecuted).toBe('Set');
	});

	it('fills a gap in the iteration sequence rather than leaving a hole', () => {
		const data = toV1RunExecutionData(graph, [
			step({ nodeId: 's', iteration: 0 }),
			step({ id: 'step-3', nodeId: 's', iteration: 2 }),
		]);

		const runs = data.resultData.runData.Set;
		expect(runs).toHaveLength(3);
		expect(runs[1]).toEqual({
			startTime: 0,
			executionTime: 0,
			executionIndex: 1,
			source: [],
			data: { main: [[]] },
		});
		expect(runs[2].data).toEqual({ main: [[{ json: { hello: 'world' } }]] });
	});

	it('carries no resume token, since a v2 execution has none', () => {
		expect(toV1RunExecutionData(graph, [step()]).resumeToken).toBe('');
	});

	it('carries no execution data, since a read reports no runtime state', () => {
		expect(toV1RunExecutionData(graph, [step()]).executionData).toBeUndefined();
	});

	describe('parallel branches', () => {
		// Two branches off the trigger. Row creation order says nothing about
		// which branch settled first.
		const forked: WorkflowGraph = {
			nodes: [
				{ id: 't', name: 'Trigger', type: 'trigger' },
				{ id: 'a', name: 'Slow', type: 'v1-node' },
				{ id: 'b', name: 'Fast', type: 'v1-node' },
			],
			edges: [
				{ from: 't', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 't', to: 'b', outputIndex: 1, inputIndex: 0 },
			],
		};

		it('reports the step that settled last as the last node executed', () => {
			const data = toV1RunExecutionData(forked, [
				// Created first, settled last.
				step({ nodeId: 'a', updatedAt: '2026-08-25T10:00:09.000Z' }),
				step({ id: 'step-2', nodeId: 'b', updatedAt: '2026-08-25T10:00:01.000Z' }),
			]);

			expect(data.resultData.lastNodeExecuted).toBe('Slow');
		});

		it('reports the failure that settled first as the execution error', () => {
			const data = toV1RunExecutionData(forked, [
				step({
					nodeId: 'a',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'Second' },
					updatedAt: '2026-08-25T10:00:09.000Z',
				}),
				step({
					id: 'step-2',
					nodeId: 'b',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'First' },
					updatedAt: '2026-08-25T10:00:01.000Z',
				}),
			]);

			// The first failure is the one that stopped the run.
			expect(data.resultData.error).toMatchObject({ message: 'First' });
			expect(data.resultData.lastNodeExecuted).toBe('Fast');
		});
	});

	describe('loop lineage', () => {
		// Trigger ──► Loop ──o1──► Body ──(back)──► Loop
		//                     └──o0──► Done
		const looped: WorkflowGraph = {
			nodes: [
				{ id: 't', name: 'Trigger', type: 'trigger' },
				{ id: 'loop', name: 'Loop', type: 'batch' },
				{ id: 'body', name: 'Body', type: 'v1-node' },
				{ id: 'done', name: 'Done', type: 'v1-node' },
			],
			edges: [
				{ from: 't', to: 'loop', outputIndex: 0, inputIndex: 0 },
				{ from: 'loop', to: 'body', outputIndex: 1, inputIndex: 0 },
				{ from: 'body', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
				{ from: 'loop', to: 'done', outputIndex: 0, inputIndex: 0 },
			],
		};

		const twoPasses = [
			step({ nodeId: 'loop', iteration: 0 }),
			step({ id: 's2', nodeId: 'body', iteration: 0 }),
			step({ id: 's3', nodeId: 'loop', iteration: 1 }),
			step({ id: 's4', nodeId: 'body', iteration: 1 }),
			step({ id: 's5', nodeId: 'done', iteration: 0 }),
		];

		it('points a loop member at the same pass of its predecessor', () => {
			const data = toV1RunExecutionData(looped, twoPasses);

			expect(data.resultData.runData.Body[0].source).toEqual([
				{ previousNode: 'Loop', previousNodeOutput: 1 },
			]);
			expect(data.resultData.runData.Body[1].source).toEqual([
				{ previousNode: 'Loop', previousNodeOutput: 1, previousNodeRun: 1 },
			]);
		});

		it("points the node after a loop at the loop's last pass", () => {
			const data = toV1RunExecutionData(looped, twoPasses);

			expect(data.resultData.runData.Done[0].source).toEqual([
				{ previousNode: 'Loop', previousNodeOutput: 0, previousNodeRun: 1 },
			]);
		});

		// Trigger ──► Loop ──o1──► Body ──(back)──► Loop
		//     │                       └───o1──► Aside
		//     └────────────────────────────────► Aside
		//
		// `Aside` still runs on a pass where `Body` is skipped, because its other
		// input is live.
		const skippedLastPass: WorkflowGraph = {
			nodes: [
				...looped.nodes.filter((node) => node.id !== 'done'),
				{ id: 'aside', name: 'Aside', type: 'v1-node' },
			],
			edges: [
				...looped.edges.filter((edge) => edge.to !== 'done'),
				{ from: 'body', to: 'aside', outputIndex: 1, inputIndex: 0 },
				{ from: 't', to: 'aside', outputIndex: 0, inputIndex: 1 },
			],
		};

		it('points a node after a loop at the last pass that was reported', () => {
			const data = toV1RunExecutionData(skippedLastPass, [
				step({ nodeId: 'loop', iteration: 0 }),
				step({ id: 's2', nodeId: 'body', iteration: 0 }),
				step({ id: 's3', nodeId: 'loop', iteration: 1 }),
				step({ id: 's4', nodeId: 'body', iteration: 1 }),
				step({ id: 's5', nodeId: 'loop', iteration: 2 }),
				// The last pass of the body ran nothing, so it gets no run data.
				step({ id: 's6', nodeId: 'body', iteration: 2, status: 'skipped', outputs: null }),
				step({ id: 's7', nodeId: 'aside', iteration: 0 }),
			]);

			// Pass 2 has no run, so naming it would name a run v1 cannot read.
			expect(data.resultData.runData.Body).toHaveLength(2);
			expect(data.resultData.runData.Aside[0].source[0]).toEqual({
				previousNode: 'Body',
				previousNodeOutput: 1,
				previousNodeRun: 1,
			});
		});

		it('points the loop entry at run 0, since the predecessor ran once', () => {
			const data = toV1RunExecutionData(looped, twoPasses);

			// Both passes read the entry edge: a back edge names a source v1 cannot
			// express, so it is skipped.
			for (const run of data.resultData.runData.Loop) {
				expect(run.source).toEqual([{ previousNode: 'Trigger', previousNodeOutput: 0 }]);
			}
		});
	});
});
