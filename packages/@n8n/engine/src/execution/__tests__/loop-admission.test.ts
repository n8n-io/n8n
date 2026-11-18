import { describe, expect, it } from 'vitest';

import type { WorkflowLoop } from '../../graph';
import {
	decideLoopAdmission,
	parallelLoopAdvancedBy,
	type ParallelLoopProgress,
} from '../loop-admission';

function makeLoop(maxConcurrency?: number): WorkflowLoop {
	return {
		batchNodeId: 'B',
		memberIds: new Set(['B', 'X', 'T']),
		backEdges: [{ from: 'T', to: 'B', outputIndex: 0, inputIndex: 0, isBackEdge: true }],
		entryEdges: [{ from: 'trigger', to: 'B', outputIndex: 0, inputIndex: 0 }],
		exitEdges: [{ from: 'B', to: 'after', outputIndex: 0, inputIndex: 0 }],
		...(maxConcurrency === undefined ? {} : { parallel: { maxConcurrency } }),
	};
}

function progress(
	passCount: number | null,
	createdPasses: number,
	settledBodies: number,
): ParallelLoopProgress {
	return {
		firstPass: { status: 'completed', loopPassCount: passCount },
		createdPasses,
		settledBodies,
	};
}

const passes = (...iterations: number[]) =>
	iterations.map((iteration) => ({ nodeId: 'B', iteration }));

describe('decideLoopAdmission', () => {
	it('admits nothing for a sequential loop', () => {
		expect(decideLoopAdmission(makeLoop(), progress(5, 1, 0))).toEqual([]);
	});

	it('admits nothing until pass 0 completes', () => {
		const loop = makeLoop(3);

		expect(decideLoopAdmission(loop, { createdPasses: 0, settledBodies: 0 })).toEqual([]);
		expect(
			decideLoopAdmission(loop, {
				firstPass: { status: 'running', loopPassCount: null },
				createdPasses: 1,
				settledBodies: 0,
			}),
		).toEqual([]);
		expect(
			decideLoopAdmission(loop, {
				firstPass: { status: 'skipped', loopPassCount: null },
				createdPasses: 1,
				settledBodies: 0,
			}),
		).toEqual([]);
	});

	it('fills the concurrency window once pass 0 completes', () => {
		expect(decideLoopAdmission(makeLoop(3), progress(10, 1, 0))).toEqual(passes(1, 2));
	});

	it('never admits past the last data pass', () => {
		expect(decideLoopAdmission(makeLoop(10), progress(3, 1, 0))).toEqual(passes(1, 2));
	});

	it('admits one more pass for each body that finishes', () => {
		expect(decideLoopAdmission(makeLoop(3), progress(10, 3, 1))).toEqual(passes(3));
		expect(decideLoopAdmission(makeLoop(3), progress(10, 4, 2))).toEqual(passes(4));
	});

	it('admits the missing passes when several bodies finished between two reads', () => {
		expect(decideLoopAdmission(makeLoop(2), progress(10, 2, 3))).toEqual(passes(2, 3, 4));
	});

	it('runs one body at a time with a max concurrency of 1', () => {
		const loop = makeLoop(1);

		expect(decideLoopAdmission(loop, progress(3, 1, 0))).toEqual([]);
		expect(decideLoopAdmission(loop, progress(3, 1, 1))).toEqual(passes(1));
	});

	it('admits nothing while the window is full', () => {
		expect(decideLoopAdmission(makeLoop(2), progress(10, 2, 0))).toEqual([]);
	});

	it('admits the terminal pass once every body has settled', () => {
		expect(decideLoopAdmission(makeLoop(2), progress(3, 3, 2))).toEqual([]);
		expect(decideLoopAdmission(makeLoop(2), progress(3, 3, 3))).toEqual(passes(3));
	});

	it('admits nothing more once the terminal pass exists', () => {
		expect(decideLoopAdmission(makeLoop(2), progress(3, 4, 3))).toEqual([]);
	});

	it('admits nothing when pass 0 was already the terminal pass', () => {
		expect(decideLoopAdmission(makeLoop(2), progress(0, 1, 0))).toEqual([]);
	});

	it('never exceeds the window, whatever the read saw as created', () => {
		// A stale read that saw fewer created passes admits rows that already exist.
		// The unique key drops them, and the highest pass stays below settled + K.
		for (let created = 1; created <= 6; created++) {
			const admitted = decideLoopAdmission(makeLoop(3), progress(20, created, 2));
			for (const key of admitted) expect(key.iteration).toBeLessThan(2 + 3);
		}
	});

	it('rejects a completed pass 0 with no pass count', () => {
		expect(() => decideLoopAdmission(makeLoop(2), progress(null, 1, 0))).toThrow(
			/recorded no pass count/,
		);
	});
});

describe('parallelLoopAdvancedBy', () => {
	it('finds the loop from its batch node or from its return edge source', () => {
		const loop = makeLoop(2);

		expect(parallelLoopAdvancedBy([loop], { nodeId: 'B', iteration: 0 })).toBe(loop);
		expect(parallelLoopAdvancedBy([loop], { nodeId: 'T', iteration: 4 })).toBe(loop);
	});

	it('ignores other members and sequential loops', () => {
		expect(parallelLoopAdvancedBy([makeLoop(2)], { nodeId: 'X', iteration: 0 })).toBeUndefined();
		expect(parallelLoopAdvancedBy([makeLoop()], { nodeId: 'T', iteration: 0 })).toBeUndefined();
	});
});
