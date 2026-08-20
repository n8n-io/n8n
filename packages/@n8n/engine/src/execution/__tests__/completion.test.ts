import { describe, expect, it } from 'vitest';

import type { WorkflowLoop } from '../../graph';
import { countExpectedSettledSteps } from '../completion';

function loop(batchNodeId: string, memberIds: string[]): WorkflowLoop {
	return {
		batchNodeId,
		memberIds: new Set([batchNodeId, ...memberIds]),
		backEdges: [],
		entryEdges: [],
		exitEdges: [],
	};
}

describe('countExpectedSettledSteps', () => {
	it('counts one row per node when there are no loops', () => {
		expect(countExpectedSettledSteps([], new Set(['trigger', 'a', 'b']), new Map())).toBe(3);
	});

	it('counts a loop that ran three iterations', () => {
		// B has rows 0, 1, 2 and 3, x has rows 0, 1 and 2, since the body has none
		// at the terminal iteration. Plus trigger and d outside the loop.
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 3]]))).toBe(2 + 4 + 3);
	});

	it('counts a loop that ended immediately', () => {
		// zero items: B's row 0 is terminal, and the body never ran
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 0]]))).toBe(2 + 1 + 0);
	});

	it('counts each member of a longer body per iteration', () => {
		const loops = [loop('B', ['x', 'y', 'z'])];
		const reachable = new Set(['trigger', 'B', 'x', 'y', 'z']);

		// B: 0..2 is 3 rows, and x, y and z have 2 rows each
		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 2]]))).toBe(1 + 3 + 6);
	});

	it('owes an unknown number of rows while a loop is still running', () => {
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map())).toBeUndefined();
	});

	it('ignores a loop the trigger cannot reach, which never receives rows', () => {
		// the converter permits a loop component nothing points into: waiting on its
		// ledger would hang an execution that is otherwise finished
		const loops = [loop('B', ['x']), loop('orphan', ['other'])];
		const reachable = new Set(['trigger', 'B', 'x']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 1]]))).toBe(1 + 2 + 1);
	});

	it('waits on every reachable loop, not just the first', () => {
		const loops = [loop('B1', ['x']), loop('B2', ['y'])];
		const reachable = new Set(['trigger', 'B1', 'x', 'B2', 'y']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B1', 1]]))).toBeUndefined();
		expect(
			countExpectedSettledSteps(
				loops,
				reachable,
				new Map([
					['B1', 1],
					['B2', 2],
				]),
			),
		).toBe(1 + (2 + 1) + (3 + 2));
	});
});
