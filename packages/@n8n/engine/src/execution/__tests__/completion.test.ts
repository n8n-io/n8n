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

/**
 *
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
describe('countExpectedSettledSteps', () => {
	it('counts one step per node when there are no loops', () => {
		expect(countExpectedSettledSteps([], new Set(['trigger', 'a', 'b']), new Map())).toBe(3);
	});

	it('counts a loop that ran three passes', () => {
		//             p0  p1  p2  p3
		//   B          x   x   x   x    4
		//   x          x   x   x   .    3   the body has none at the last pass
		//   trigger, d once each        2
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 3]]))).toBe(2 + 4 + 3);
	});

	it('counts a loop that ended immediately', () => {
		//             p0
		//   B          x    1   zero items, so pass 0 is already the last
		//   x          .    0   the body never ran
		//   trigger, d      2
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 0]]))).toBe(2 + 1 + 0);
	});

	it('counts every member of a longer body, once per pass', () => {
		// as above, but the body is x, y and z, and nothing follows the loop
		//             p0  p1  p2
		//   B          x   x   x    3
		//   x, y, z    x   x   .    6   two passes each
		//   trigger                 1
		const loops = [loop('B', ['x', 'y', 'z'])];
		const reachable = new Set(['trigger', 'B', 'x', 'y', 'z']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 2]]))).toBe(1 + 3 + 6);
	});

	it('owes an unknown number of steps while a loop is still running', () => {
		const loops = [loop('B', ['x'])];
		const reachable = new Set(['trigger', 'B', 'x', 'd']);

		expect(countExpectedSettledSteps(loops, reachable, new Map())).toBeUndefined();
	});

	it('ignores a loop the trigger cannot reach, which never receives steps', () => {
		const loops = [loop('B', ['x']), loop('orphan', ['other'])];
		const reachable = new Set(['trigger', 'B', 'x']);

		expect(countExpectedSettledSteps(loops, reachable, new Map([['B', 1]]))).toBe(1 + 2 + 1);
	});

	it('waits on every reachable loop, not just the first', () => {
		// two separate loops, B1 with body x and B2 with body y
		//             p0  p1  p2
		//   B1         x   x   .    2      ends at pass 1
		//   x          x   .   .    1
		//   B2         x   x   x    3      ends at pass 2
		//   y          x   x   .    2
		//   trigger                 1
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
