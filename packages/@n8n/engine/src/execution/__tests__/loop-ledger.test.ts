import { describe, expect, it, vi } from 'vitest';

import { deriveLoops, type WorkflowGraph } from '../../graph';
import { exitSourcesInto, isTerminalStep, loadTerminalIterations } from '../loop-ledger';
import type { StepStore, StepSummary } from '../step-store';

function tip(iteration: number, filledOutputSlots: boolean[], status = 'completed' as const) {
	return { id: `step-B-${iteration}`, nodeId: 'B', iteration, status, filledOutputSlots };
}

/**
 * ┌─────────┐    ┌───┐ o1    ┌───┐
 * │ trigger ├───►│ B ├──────►│ x │
 * └─────────┘    └─▲─┘       └─┬─┘
 *                  └──(back)───┘
 *                  │ o0
 *                  ▼
 *                ┌───┐
 *                │ d │
 *                └───┘
 */
const loopGraph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'T', type: 'trigger' },
		{ id: 'B', name: 'B', type: 'batch' },
		{ id: 'x', name: 'X', type: 'v1-node' },
		{ id: 'd', name: 'D', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 },
		{ from: 'B', to: 'x', outputIndex: 1, inputIndex: 0 },
		{ from: 'x', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true },
		{ from: 'B', to: 'd', outputIndex: 0, inputIndex: 0 },
	],
};
const loops = deriveLoops(loopGraph);

describe('isTerminalStep', () => {
	it('is terminal when the step fired the done slot', () => {
		expect(isTerminalStep(tip(2, [true, false]))).toBe(true);
	});

	it('is not terminal while the step fired the loop slot', () => {
		expect(isTerminalStep(tip(2, [false, true]))).toBe(false);
	});

	it('is terminal when the step fired nothing at all', () => {
		expect(isTerminalStep(tip(2, []))).toBe(true);
	});

	it('is terminal on a skipped step, which fired nothing', () => {
		expect(isTerminalStep({ ...tip(2, []), status: 'skipped' })).toBe(true);
	});

	it('is not terminal on a step that has not settled', () => {
		expect(isTerminalStep({ ...tip(2, []), status: 'running' })).toBe(false);
		expect(isTerminalStep({ ...tip(2, []), status: 'queued' })).toBe(false);
	});
});

describe('exitSourcesInto', () => {
	it('names the batch node whose terminal row a node after the loop reads', () => {
		expect(exitSourcesInto(loopGraph, loops, ['d'])).toEqual(['B']);
	});

	it('names nothing for a node inside the loop, which reads its own iteration', () => {
		expect(exitSourcesInto(loopGraph, loops, ['x'])).toEqual([]);
		expect(exitSourcesInto(loopGraph, loops, ['B'])).toEqual([]);
	});

	it('names nothing in a graph without loops, so no tip is ever read', () => {
		expect(exitSourcesInto(loopGraph, [], ['d'])).toEqual([]);
	});
});

describe('loadTerminalIterations', () => {
	function makeStepStore(latest: Record<string, StepSummary>): StepStore {
		return { loadLatestStepSummaries: vi.fn().mockResolvedValue(latest) } as unknown as StepStore;
	}

	it('reports the terminal iteration of a loop that has ended', async () => {
		const stepStore = makeStepStore({ B: tip(3, [true, false]) });

		expect(await loadTerminalIterations(stepStore, 'exec-1', ['B'])).toEqual(new Map([['B', 3]]));
		expect(stepStore.loadLatestStepSummaries).toHaveBeenCalledExactlyOnceWith('exec-1', ['B']);
	});

	it('omits a loop still running, so its exit stays undecidable', async () => {
		const stepStore = makeStepStore({ B: tip(3, [false, true]) });

		expect(await loadTerminalIterations(stepStore, 'exec-1', ['B'])).toEqual(new Map());
	});

	it('omits a loop with no rows yet', async () => {
		const stepStore = makeStepStore({});

		expect(await loadTerminalIterations(stepStore, 'exec-1', ['B'])).toEqual(new Map());
	});

	it('reads several loops in one query, ended and running alike', async () => {
		const stepStore = makeStepStore({
			B1: { ...tip(2, [true, false]), nodeId: 'B1' },
			B2: { ...tip(5, [false, true]), nodeId: 'B2' },
		});

		expect(await loadTerminalIterations(stepStore, 'exec-1', ['B1', 'B2'])).toEqual(
			new Map([['B1', 2]]),
		);
		expect(stepStore.loadLatestStepSummaries).toHaveBeenCalledExactlyOnceWith('exec-1', [
			'B1',
			'B2',
		]);
	});

	it('reads nothing when no loop is named', async () => {
		const stepStore = makeStepStore({});

		expect(await loadTerminalIterations(stepStore, 'exec-1', [])).toEqual(new Map());
		expect(stepStore.loadLatestStepSummaries).not.toHaveBeenCalled();
	});
});
