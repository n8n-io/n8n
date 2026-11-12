import type { RoundDetail, StepDetail, StepStatus, WorkflowGraph } from '@n8n/engine';
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
		['waiting', 'waiting'],
	])('maps step status %j to %j', (status, expected) => {
		const data = toV1RunExecutionData(graph, [step({ status })]);

		expect(data.resultData.runData.Trigger[0].executionStatus).toBe(expected);
	});

	it.each<StepStatus>(['queued', 'skipped', 'cancelled'])(
		'reports no run for a %j step, the way v1 reports a node that did not run',
		(status) => {
			const data = toV1RunExecutionData(graph, [step({ status })]);

			expect(data.resultData.runData).toEqual({});
		},
	);

	it('reports a suspended step, and names it as the last node executed', async () => {
		const data = toV1RunExecutionData(graph, [
			step(),
			step({
				id: 'step-2',
				nodeId: 's',
				status: 'waiting',
				outputs: null,
				updatedAt: '2026-08-25T10:00:01.000Z',
			}),
		]);

		expect(data.resultData.runData.Set[0].executionStatus).toBe('waiting');
		// v1 carries the node's pass-through data here. The step has none until it
		// resumes, and the read path is not given the declaration that holds it.
		expect(data.resultData.runData.Set[0].data).toBeUndefined();
		expect(data.resultData.lastNodeExecuted).toBe('Set');
	});

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

	it('carries the pin data the run used, so the canvas marks those nodes as pinned', () => {
		const pinData = { Set: [{ json: { pinned: true } }] };

		const data = toV1RunExecutionData(graph, [step()], pinData);

		expect(data.resultData.pinData).toEqual(pinData);
	});

	it('carries no pin data when the run used none', () => {
		expect(toV1RunExecutionData(graph, [step()]).resultData.pinData).toBeUndefined();
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

	describe('agent actions', () => {
		// Trigger ──► Agent ──► Tail. Calculator and Math Agent attach to Agent
		// as tools; Sub Calculator attaches to Math Agent.
		const agentGraph: WorkflowGraph = {
			nodes: [
				{ id: 't', name: 'Trigger', type: 'trigger' },
				{ id: 'a', name: 'Agent', type: 'v1-node', actionTargetKinds: ['ai_tool'] },
				{ id: 'x', name: 'Tail', type: 'v1-node' },
				{ id: 'c', name: 'Calculator', type: 'attached' },
				{ id: 'm', name: 'Math Agent', type: 'attached', actionTargetKinds: ['ai_tool'] },
				{ id: 'mc', name: 'Sub Calculator', type: 'attached' },
			],
			edges: [
				{ from: 't', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'a', to: 'x', outputIndex: 0, inputIndex: 0 },
			],
			attachments: [
				{ from: 'c', to: 'a', kind: 'ai_tool', inputIndex: 0 },
				{ from: 'm', to: 'a', kind: 'ai_tool', inputIndex: 0 },
				{ from: 'mc', to: 'm', kind: 'ai_tool', inputIndex: 0 },
			],
		};

		const agent = (overrides: Partial<StepDetail> = {}) =>
			step({ id: 'agent', nodeId: 'a', outputs: [[{ json: { output: 'done' } }]], ...overrides });

		const toolCall = (
			id: string,
			callId: string,
			overrides: Partial<StepDetail> = {},
		): StepDetail =>
			step({
				id,
				nodeId: 'c',
				outputs: [[{ json: { response: callId } }]],
				kind: 'spawned',
				declaringStepId: 'agent',
				round: 0,
				callId,
				...overrides,
			});

		const round = (
			stepId: string,
			roundIndex: number,
			calls: Array<{ callId: string; targetNodeId: string; input: string }>,
		): RoundDetail => ({
			stepId,
			round: roundIndex,
			actions: calls.map(({ callId, targetNodeId, input }) => ({
				callId,
				targetNodeId,
				itemIndex: 0,
				arguments: { input },
				metadata: { type: 'ai_tool' },
			})),
		});

		it('reports each tool call as its own run under `ai_tool`, with the arguments as input', () => {
			const data = toV1RunExecutionData(
				agentGraph,
				[step(), agent(), toolCall('s-1', 'call-1')],
				undefined,
				[round('agent', 0, [{ callId: 'call-1', targetNodeId: 'c', input: '2+3' }])],
			);

			expect(data.resultData.runData.Calculator).toEqual([
				expect.objectContaining({
					executionStatus: 'success',
					data: { ai_tool: [[{ json: { response: 'call-1' } }]] },
					inputOverride: { ai_tool: [[{ json: { input: '2+3' } }]] },
					source: [{ previousNode: 'Agent', previousNodeOutput: 0, previousNodeRun: 0 }],
				}),
			]);
			expect(data.resultData.runData.Agent).toHaveLength(1);
		});

		it('numbers the runs of a tool by round, then by the order the round declared the calls in', () => {
			const data = toV1RunExecutionData(
				agentGraph,
				[
					step(),
					agent(),
					// The data plane lists calls of one round in no declared order.
					toolCall('s-2', 'call-2'),
					toolCall('s-1', 'call-1'),
					toolCall('s-3', 'call-3', { round: 1 }),
				],
				undefined,
				[
					round('agent', 0, [
						{ callId: 'call-1', targetNodeId: 'c', input: '1' },
						{ callId: 'call-2', targetNodeId: 'c', input: '2' },
					]),
					round('agent', 1, [{ callId: 'call-3', targetNodeId: 'c', input: '3' }]),
				],
			);

			const inputs = data.resultData.runData.Calculator.map(
				(run) => run.inputOverride?.ai_tool?.[0]?.[0]?.json.input,
			);
			expect(inputs).toEqual(['1', '2', '3']);
		});

		it('points a tool call at the iteration of its declaring step', () => {
			const data = toV1RunExecutionData(
				agentGraph,
				[agent({ iteration: 1 }), toolCall('s-1', 'call-1')],
				undefined,
				[round('agent', 0, [{ callId: 'call-1', targetNodeId: 'c', input: '1' }])],
			);

			expect(data.resultData.runData.Calculator[0].source).toEqual([
				{ previousNode: 'Agent', previousNodeOutput: 0, previousNodeRun: 1 },
			]);
		});

		it('points a nested tool call at the run of the agent tool that declared it', () => {
			const subCall = (id: string, declaringStepId: string, callId: string) =>
				step({
					id,
					nodeId: 'mc',
					kind: 'spawned',
					declaringStepId,
					round: 0,
					callId,
				});

			const data = toV1RunExecutionData(
				agentGraph,
				[
					step(),
					agent(),
					toolCall('m-2', 'call-m2', { nodeId: 'm' }),
					toolCall('m-1', 'call-m1', { nodeId: 'm' }),
					subCall('mc-1', 'm-1', 'call-mc1'),
					subCall('mc-2', 'm-2', 'call-mc2'),
				],
				undefined,
				[
					round('agent', 0, [
						{ callId: 'call-m1', targetNodeId: 'm', input: 'first' },
						{ callId: 'call-m2', targetNodeId: 'm', input: 'second' },
					]),
					round('m-1', 0, [{ callId: 'call-mc1', targetNodeId: 'mc', input: '2+3' }]),
					round('m-2', 0, [{ callId: 'call-mc2', targetNodeId: 'mc', input: '7*6' }]),
				],
			);

			const { runData } = data.resultData;
			expect(runData['Math Agent'].map((run) => run.source)).toEqual([
				[{ previousNode: 'Agent', previousNodeOutput: 0, previousNodeRun: 0 }],
				[{ previousNode: 'Agent', previousNodeOutput: 0, previousNodeRun: 0 }],
			]);
			expect(
				runData['Sub Calculator'].map((run) => [
					run.inputOverride?.ai_tool?.[0]?.[0]?.json.input,
					run.source[0]?.previousNodeRun,
				]),
			).toEqual([
				['2+3', 0],
				['7*6', 1],
			]);
		});

		it('points a gated tool call at the node it attaches to on the action path', () => {
			const gated: WorkflowGraph = {
				...agentGraph,
				nodes: [
					...agentGraph.nodes,
					{ id: 'g', name: 'Approval', type: 'attached', actionTargetKinds: ['ai_tool'] },
				],
				attachments: [
					{ from: 'g', to: 'a', kind: 'ai_tool', inputIndex: 0 },
					{ from: 'c', to: 'g', kind: 'ai_tool', inputIndex: 0 },
				],
			};

			const data = toV1RunExecutionData(gated, [agent(), toolCall('s-1', 'call-1')], undefined, [
				round('agent', 0, [{ callId: 'call-1', targetNodeId: 'c', input: '1' }]),
			]);

			expect(data.resultData.runData.Calculator[0].source[0]?.previousNode).toBe('Approval');
		});

		it('reports a declaring step that waits on its round as running', () => {
			const data = toV1RunExecutionData(
				agentGraph,
				[
					agent({ status: 'waiting', outputs: null }),
					toolCall('s-1', 'call-1', { status: 'running' }),
				],
				undefined,
				[round('agent', 0, [{ callId: 'call-1', targetNodeId: 'c', input: '1' }])],
			);

			expect(data.resultData.runData.Agent[0].executionStatus).toBe('running');
			expect(data.resultData.runData.Calculator[0].executionStatus).toBe('running');
		});

		it('takes the last node executed and the execution error from graph steps only', () => {
			const data = toV1RunExecutionData(
				agentGraph,
				[
					step(),
					agent({ updatedAt: '2026-08-25T10:00:01.000Z' }),
					// Settles after the agent; a failed action is data for the agent.
					toolCall('s-1', 'call-1', {
						status: 'failed',
						outputs: null,
						error: { name: 'NodeOperationError', message: 'Tool broke' },
						updatedAt: '2026-08-25T10:00:09.000Z',
					}),
				],
				undefined,
				[round('agent', 0, [{ callId: 'call-1', targetNodeId: 'c', input: '1' }])],
			);

			expect(data.resultData.runData.Calculator[0].error).toMatchObject({ message: 'Tool broke' });
			expect(data.resultData.error).toBeUndefined();
			expect(data.resultData.lastNodeExecuted).toBe('Agent');
		});
	});
});
