import { describe, expect, it } from 'vitest';

import type { JsonValue } from '../../common';
import { UnimplementedError } from '../../common';
import {
	GraphValidationError,
	validateLoops,
	type GraphEdge,
	type WorkflowGraph,
} from '../../graph';
import { validateLoopFrames, type LoopFrame } from '../loop-frames';
import { runLoopFrames, type FrameStepExecutor } from '../run-loop-frames';

/**
 * For each customer (batch 1), split its orders, then for each 2 orders (batch 2) make a
 * line. The tally of each customer returns to the outer loop.
 *
 *  trigger -> O ==loop==> split -> I ==loop==> line
 *             ^                    ^  \\done      |
 *             |                    +--(back)-----+
 *             +----(back)--- tally <--+
 *             O --done--> report
 */
const edge = (from: string, to: string, extra: Partial<GraphEdge> = {}): GraphEdge => ({
	from,
	to,
	outputIndex: 0,
	inputIndex: 0,
	...extra,
});

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Trigger', type: 'trigger' },
		{ id: 'O', name: 'Each customer', type: 'batch', config: { batchSize: 1 } },
		{ id: 'split', name: 'Orders', type: 'v1-node' },
		{ id: 'I', name: 'Each order', type: 'batch', config: { batchSize: 2 } },
		{ id: 'line', name: 'Line', type: 'v1-node' },
		{ id: 'tally', name: 'Tally', type: 'v1-node' },
		{ id: 'report', name: 'Report', type: 'v1-node' },
	],
	edges: [
		edge('trigger', 'O'),
		edge('O', 'split', { outputIndex: 1 }),
		edge('split', 'I'),
		edge('I', 'line', { outputIndex: 1 }),
		edge('line', 'I', { isBackEdge: true }),
		edge('I', 'tally'),
		edge('tally', 'O', { isBackEdge: true }),
		edge('O', 'report'),
	],
};

const frames: LoopFrame[] = [
	{ id: 'customers', batchNodeId: 'O', nodeIds: ['O', 'split', 'I', 'line', 'tally'] },
	{ id: 'orders', batchNodeId: 'I', nodeIds: ['I', 'line'] },
];

const customers = [
	{ id: 'c1', orders: ['o1', 'o2', 'o3'] },
	{ id: 'c2', orders: ['o4'] },
	{ id: 'c3', orders: ['o5', 'o6'] },
];

const record = (value: JsonValue | undefined): Record<string, JsonValue> =>
	typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
const list = (value: JsonValue | undefined): JsonValue[] => (Array.isArray(value) ? value : []);

const execute: FrameStepExecutor = async (node, [input], path) =>
	await Promise.resolve(
		(() => {
			const items = list(input);
			switch (node.id) {
				case 'split':
					return [
						items.flatMap((item) =>
							list(record(item).orders).map((order) => ({ customer: record(item).id, order })),
						),
					];
				case 'line':
					return [items.map((item) => ({ ...record(item), path: path.join('.') }))];
				case 'tally':
					return [
						[
							{
								customer: record(items[0]).customer ?? null,
								orders: items.map((item) => record(item).order ?? null),
								paths: items.map((item) => record(item).path ?? null),
							},
						],
					];
				default:
					return [items];
			}
		})(),
	);

describe('loop frames (prototype)', () => {
	it('runs a loop nested in a loop with a new inner ledger on each outer pass', async () => {
		const run = await runLoopFrames(graph, frames, [customers], execute);

		const report = run.steps.find((step) => step.key.nodeId === 'report');
		expect(report?.outputs).toEqual([
			[
				{ customer: 'c1', orders: ['o1', 'o2', 'o3'], paths: ['0.0', '0.0', '0.1'] },
				{ customer: 'c2', orders: ['o4'], paths: ['1.0'] },
				{ customer: 'c3', orders: ['o5', 'o6'], paths: ['2.0', '2.0'] },
			],
		]);

		const pathsOf = (nodeId: string) =>
			run.steps.filter((step) => step.key.nodeId === nodeId).map((step) => step.key.path.join('.'));
		// The inner pass number starts at 0 again for every customer.
		expect(pathsOf('I')).toEqual(['0.0', '0.1', '0.2', '1.0', '1.1', '2.0', '2.1']);
		expect(pathsOf('line')).toEqual(['0.0', '0.1', '1.0', '2.0']);
		expect(pathsOf('O')).toEqual(['0', '1', '2', '3']);
		// The last inner pass of each customer fills done with that customer's lines only.
		expect(run.step('I', [1, 1])?.outputs).toEqual([
			[{ customer: 'c2', order: 'o4', path: '1.0' }],
			null,
		]);
		expect(run.steps.every((step) => step.status === 'completed')).toBe(true);
	});

	it('leaves the default validation unchanged: it still rejects the nested loop', () => {
		expect(() => validateLoops(graph)).toThrow(UnimplementedError);
		expect(() => validateLoopFrames(graph, frames)).not.toThrow();
	});

	it('rejects an edge that leaves a frame mid-body, and frames that overlap', () => {
		const midBodyExit = { ...graph, edges: [...graph.edges, edge('line', 'report')] };
		expect(() => validateLoopFrames(midBodyExit, frames)).toThrow(GraphValidationError);
		const overlapping: LoopFrame[] = [
			frames[0],
			{ id: 'orders', batchNodeId: 'I', nodeIds: ['I', 'line', 'report'] },
		];
		expect(() => validateLoopFrames(graph, overlapping)).toThrow('overlap without nesting');
		expect(() => validateLoopFrames(graph, [frames[0]])).toThrow('heads 0 frames');
	});

	it('ends an empty inner loop with done, so the outer loop goes on', async () => {
		const run = await runLoopFrames(
			graph,
			frames,
			[[{ id: 'c0', orders: [] }, ...customers.slice(1)]],
			execute,
		);
		const tallies = run.steps
			.filter((step) => step.key.nodeId === 'tally')
			.map((step) => `${step.key.path.join('.')}:${step.status}`);
		expect(tallies).toEqual(['0:completed', '1:completed', '2:completed']);
		const report = run.steps.find((step) => step.key.nodeId === 'report');
		expect(list(report?.outputs[0]).map((item) => record(item).customer)).toEqual([
			null,
			'c2',
			'c3',
		]);
	});
});
