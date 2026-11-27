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
	outputSources: null,
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

	it('reads a step that a data plane older than `outputSources` sent without it', () => {
		const { outputSources: _, ...older } = step();

		const data = toV1RunExecutionData(graph, [older as StepDetail]);

		expect(data.resultData.runData.Trigger[0].data).toEqual({
			main: [[{ json: { hello: 'world' } }]],
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

	it('rebuilds the structured error the editor renders from the step details', () => {
		const data = toV1RunExecutionData(graph, [
			step({
				id: 'step-2',
				nodeId: 's',
				status: 'failed',
				outputs: null,
				error: {
					name: 'NodeApiError',
					message: 'Too many requests',
					details: {
						description: 'Wait and try again',
						httpCode: '429',
						context: { itemIndex: 3 },
					},
				},
			}),
		]);

		expect(data.resultData.runData.Set[0].error).toMatchObject({
			name: 'NodeApiError',
			message: 'Too many requests',
			description: 'Wait and try again',
			context: { itemIndex: 3 },
		});
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

	describe('execution links', () => {
		it('notes the parent execution on the trigger task, as v1 does for a sub-workflow', () => {
			const data = toV1RunExecutionData(graph, [step()], undefined, {
				parent: { executionId: 'exec-parent', workflowId: 'wf-parent' },
			});

			expect(data.resultData.runData.Trigger[0].metadata).toEqual({
				parentExecution: { executionId: 'exec-parent', workflowId: 'wf-parent' },
			});
		});

		it('notes the sub-execution on the step that started it', () => {
			const data = toV1RunExecutionData(
				graph,
				[step(), step({ id: 'step-2', nodeId: 's' })],
				undefined,
				{ subExecutions: [{ stepId: 'step-2', executionId: 'exec-sub', workflowId: 'wf-sub' }] },
			);

			expect(data.resultData.runData.Trigger[0].metadata).toBeUndefined();
			expect(data.resultData.runData.Set[0].metadata).toEqual({
				subExecution: { executionId: 'exec-sub', workflowId: 'wf-sub' },
				subExecutionsCount: 1,
			});
		});

		it('ignores a sub-execution whose step is not reported', () => {
			const data = toV1RunExecutionData(graph, [step()], undefined, {
				subExecutions: [{ stepId: 'step-9', executionId: 'exec-sub', workflowId: 'wf-sub' }],
			});

			expect(data.resultData.runData.Trigger[0].metadata).toBeUndefined();
		});
	});

	describe('a slot that several edges feed', () => {
		// Trigger ──► If ─true──► A ─┐
		//               └false──► B ─┴──► C
		const converging: WorkflowGraph = {
			nodes: [
				{ id: 't', name: 'Trigger', type: 'trigger' },
				{ id: 'i', name: 'If', type: 'v1-node' },
				{ id: 'a', name: 'A', type: 'v1-node' },
				{ id: 'b', name: 'B', type: 'v1-node' },
				{ id: 'c', name: 'C', type: 'v1-node' },
			],
			edges: [
				{ from: 't', to: 'i', outputIndex: 0, inputIndex: 0 },
				{ from: 'i', to: 'a', outputIndex: 0, inputIndex: 0 },
				{ from: 'i', to: 'b', outputIndex: 1, inputIndex: 0 },
				{ from: 'a', to: 'c', outputIndex: 0, inputIndex: 0 },
				{ from: 'b', to: 'c', outputIndex: 0, inputIndex: 0 },
			],
		};
		const at = (id: string, nodeId: string, overrides: Partial<StepDetail> = {}) =>
			step({ id, nodeId, ...overrides });

		it('names the first live edge as the source when the first edge is dead', () => {
			const data = toV1RunExecutionData(converging, [
				at('s-t', 't'),
				at('s-i', 'i', { outputs: [null, [{ json: { n: 2 } }]] }),
				at('s-a', 'a', { status: 'skipped', outputs: null }),
				at('s-b', 'b'),
				at('s-c', 'c'),
			]);

			expect(data.resultData.runData.C[0].source).toEqual([
				{ previousNode: 'B', previousNodeOutput: 0 },
			]);
		});

		it('counts an edge dead when its source completed but left that output empty', () => {
			// Trigger ──► If ─o0──► A ──► C
			//               └─o1─────────► C
			const ifToC: WorkflowGraph = {
				nodes: converging.nodes.filter((node) => node.id !== 'b'),
				edges: [
					{ from: 't', to: 'i', outputIndex: 0, inputIndex: 0 },
					{ from: 'i', to: 'a', outputIndex: 0, inputIndex: 0 },
					{ from: 'i', to: 'c', outputIndex: 1, inputIndex: 0 },
					{ from: 'a', to: 'c', outputIndex: 0, inputIndex: 0 },
				],
			};

			const data = toV1RunExecutionData(ifToC, [
				at('s-t', 't'),
				at('s-i', 'i', { outputs: [[{ json: { n: 1 } }], null] }),
				at('s-a', 'a'),
				at('s-c', 'c'),
			]);

			expect(data.resultData.runData.C[0].source).toEqual([
				{ previousNode: 'A', previousNodeOutput: 0 },
			]);
		});

		it('names the first edge in concatenation order when every edge is live', () => {
			const data = toV1RunExecutionData(converging, [
				at('s-t', 't'),
				at('s-i', 'i', { outputs: [[{ json: { n: 1 } }], [{ json: { n: 2 } }]] }),
				at('s-a', 'a'),
				at('s-b', 'b'),
				at('s-c', 'c'),
			]);

			expect(data.resultData.runData.C[0].source).toEqual([
				{ previousNode: 'A', previousNodeOutput: 0 },
			]);
		});
	});

	describe('a slot that several edges feed, around a loop', () => {
		const pass = (
			id: string,
			nodeId: string,
			iteration: number,
			overrides: Partial<StepDetail> = {},
		) => step({ id, nodeId, iteration, ...overrides });

		it("reads the loop's done edge at the loop's last pass", () => {
			// Trigger ──► Loop ─o1─► Body ─(back)─► Loop
			//    │          └─o0──────────────────────► Done
			//    └──► Side ────────────────────────────► Done
			const afterLoop: WorkflowGraph = {
				nodes: [
					{ id: 't', name: 'Trigger', type: 'trigger' },
					{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
					{ id: 'body', name: 'Body', type: 'v1-node' },
					{ id: 'side', name: 'Side', type: 'v1-node' },
					{ id: 'done', name: 'Done', type: 'v1-node' },
				],
				edges: [
					{ from: 't', to: 'loop', outputIndex: 0, inputIndex: 0 },
					{ from: 'loop', to: 'body', outputIndex: 1, inputIndex: 0 },
					{ from: 'body', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
					{ from: 'loop', to: 'done', outputIndex: 0, inputIndex: 0 },
					{ from: 't', to: 'side', outputIndex: 0, inputIndex: 0 },
					{ from: 'side', to: 'done', outputIndex: 0, inputIndex: 0 },
				],
			};

			const data = toV1RunExecutionData(afterLoop, [
				pass('s-t', 't', 0),
				pass('s-l0', 'loop', 0, { outputs: [null, [{ json: {} }]] }),
				pass('s-b0', 'body', 0),
				pass('s-l1', 'loop', 1, { outputs: [[{ json: {} }], null] }),
				pass('s-side', 'side', 0),
				pass('s-done', 'done', 0),
			]);

			expect(data.resultData.runData.Done[0].source).toEqual([
				{ previousNode: 'Loop', previousNodeOutput: 0, previousNodeRun: 1 },
			]);
		});

		it('reads each edge inside a loop body at the same pass', () => {
			// Trigger ──► Loop ─o1─► If ─o0─► A ─┐
			//                          └─o1─► B ─┴─► Join ─(back)─► Loop
			const bodyJoin: WorkflowGraph = {
				nodes: [
					{ id: 't', name: 'Trigger', type: 'trigger' },
					{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
					{ id: 'i', name: 'If', type: 'v1-node' },
					{ id: 'a', name: 'A', type: 'v1-node' },
					{ id: 'b', name: 'B', type: 'v1-node' },
					{ id: 'j', name: 'Join', type: 'v1-node' },
				],
				edges: [
					{ from: 't', to: 'loop', outputIndex: 0, inputIndex: 0 },
					{ from: 'loop', to: 'i', outputIndex: 1, inputIndex: 0 },
					{ from: 'i', to: 'a', outputIndex: 0, inputIndex: 0 },
					{ from: 'i', to: 'b', outputIndex: 1, inputIndex: 0 },
					{ from: 'a', to: 'j', outputIndex: 0, inputIndex: 0 },
					{ from: 'b', to: 'j', outputIndex: 0, inputIndex: 0 },
					{ from: 'j', to: 'loop', outputIndex: 0, inputIndex: 0, isBackEdge: true },
				],
			};
			const toB = [null, [{ json: {} }]];
			const toA = [[{ json: {} }], null];
			const skipped = { status: 'skipped' as const, outputs: null };

			// B fires on passes 0 and 1, A on pass 2.
			const data = toV1RunExecutionData(bodyJoin, [
				pass('s-t', 't', 0),
				...[0, 1, 2].flatMap((p) => [
					pass(`s-l${p}`, 'loop', p, { outputs: [null, [{ json: {} }]] }),
					pass(`s-i${p}`, 'i', p, { outputs: p === 2 ? toA : toB }),
					pass(`s-a${p}`, 'a', p, p === 2 ? {} : skipped),
					pass(`s-b${p}`, 'b', p, p === 2 ? skipped : {}),
					pass(`s-j${p}`, 'j', p),
				]),
			]);

			expect(data.resultData.runData.Join.map((run) => run.source)).toEqual([
				[{ previousNode: 'B', previousNodeOutput: 0 }],
				[{ previousNode: 'B', previousNodeOutput: 0, previousNodeRun: 1 }],
				[{ previousNode: 'A', previousNodeOutput: 0, previousNodeRun: 2 }],
			]);
		});
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
				{ id: 'loop', name: 'Loop', type: 'batch', config: { batchSize: 1 } },
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
			step({ nodeId: 'loop', iteration: 0, outputs: [null, [{ json: { hello: 'world' } }]] }),
			step({ id: 's2', nodeId: 'body', iteration: 0 }),
			step({
				id: 's3',
				nodeId: 'loop',
				iteration: 1,
				outputs: [null, [{ json: { hello: 'world' } }]],
			}),
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
				step({ nodeId: 'loop', iteration: 0, outputs: [null, [{ json: { hello: 'world' } }]] }),
				step({ id: 's2', nodeId: 'body', iteration: 0 }),
				step({
					id: 's3',
					nodeId: 'loop',
					iteration: 1,
					outputs: [null, [{ json: { hello: 'world' } }]],
				}),
				step({ id: 's4', nodeId: 'body', iteration: 1 }),
				// The last pass of the loop sends what the body returned out of done.
				step({
					id: 's5',
					nodeId: 'loop',
					iteration: 2,
					outputs: [[{ json: { hello: 'world' } }, { json: { hello: 'world' } }], null],
				}),
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
