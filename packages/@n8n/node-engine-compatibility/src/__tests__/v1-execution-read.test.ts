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
		['cancelled', 'canceled'],
	])('maps step status %j to %j', (status, expected) => {
		const data = toV1RunExecutionData(graph, [step({ status })]);

		expect(data.resultData.runData.Trigger[0].executionStatus).toBe(expected);
	});

	it.each<StepStatus>(['queued', 'skipped'])(
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
});
