import { laneKey, LaneTable, slowNeed, SlowQueue, workflowOfKey } from '../lanes';

const table = (max = 8) => new LaneTable({ max, slowTtlMs: 1_000, clearTtlMs: 500 });

describe('lane keys', () => {
	it('joins the workflow id and the step name', () => {
		const key = laneKey('wf-1', 'Code');
		expect(workflowOfKey(key)).toBe('wf-1');
		expect(workflowOfKey(laneKey(undefined, 'Code'))).toBe('');
		expect(laneKey('wf-1', 'Code')).not.toBe(laneKey('wf-2', 'Code'));
	});

	it('sends a marked key to the slow lane, and code without a mark only when a worker is free', () => {
		expect(slowNeed('slow', 'node', true)).toBe('must');
		expect(slowNeed('probe', 'node', true)).toBe('must');
		expect(slowNeed('maybe', 'node', true)).toBe('try');
		expect(slowNeed('clear', 'code', true)).toBe('no');
		expect(slowNeed(undefined, 'code', true)).toBe('try');
		expect(slowNeed(undefined, 'code', false)).toBe('no');
		expect(slowNeed(undefined, 'node', true)).toBe('no');
	});
});

describe('LaneTable', () => {
	it('marks the only key of a blocked worker as slow', () => {
		const lanes = table();
		expect(lanes.suspects(['a'], true, false, 0)).toEqual([
			{ key: 'a', lane: 'slow', until: 1_000 },
		]);
		expect(lanes.get('a', 999)).toBe('slow');
		expect(lanes.get('a', 1_000)).toBeUndefined();
	});

	it('marks several keys as maybe after a block, and as probe after a stop', () => {
		const lanes = table();
		expect(lanes.suspects(['a', 'b'], true, false, 0).map((c) => c.lane)).toEqual([
			'maybe',
			'maybe',
		]);
		expect(lanes.suspects(['a', 'b'], true, true, 0).map((c) => c.lane)).toEqual([
			'probe',
			'probe',
		]);
		// A weaker mark does not replace a stronger one.
		expect(lanes.suspects(['a', 'b'], true, false, 0)).toEqual([]);
		// One key is not sure when the worker did not report each key.
		expect(lanes.suspects(['c'], false, false, 0).map((c) => c.lane)).toEqual(['maybe']);
	});

	it('does not excuse a key that ran clear before', () => {
		const lanes = table();
		lanes.ran('a', false, 0);
		expect(lanes.get('a', 1)).toBe('clear');
		expect(lanes.suspects(['a', 'b'], true, true, 1).map((c) => c.key)).toEqual(['a', 'b']);
	});

	it('takes the result of a run alone: a block is slow, no block is clear', () => {
		const lanes = table();
		lanes.suspects(['a', 'b'], true, true, 0);
		expect(lanes.ran('a', true, 10)?.lane).toBe('slow');
		expect(lanes.ran('b', false, 10)?.lane).toBe('clear');
		// A key that blocked stays slow until its mark ends, also after a run without a block.
		expect(lanes.ran('a', false, 20)).toBeUndefined();
		expect(lanes.get('a', 20)).toBe('slow');
		expect(lanes.ran('a', false, 1_010)?.lane).toBe('clear');
	});

	it('keeps at most `max` keys, and drops the oldest', () => {
		const lanes = table(3);
		for (const key of ['a', 'b', 'c', 'd']) lanes.ran(key, true, 0);
		expect(lanes.size).toBe(3);
		expect(lanes.get('a', 1)).toBeUndefined();
		expect(lanes.entries(1).map((c) => c.key)).toEqual(['b', 'c', 'd']);
	});
});

describe('SlowQueue', () => {
	it('lets the workflows take turns', () => {
		const queue = new SlowQueue<string>(16);
		for (const item of ['a1', 'a2', 'a3']) queue.push('a', item);
		queue.push('b', 'b1');
		queue.push('c', 'c1');
		const order: string[] = [];
		for (let item = queue.shift(); item !== undefined; item = queue.shift()) order.push(item);
		expect(order).toEqual(['a1', 'b1', 'c1', 'a2', 'a3']);
		expect(queue.size).toBe(0);
	});

	it('refuses a step when it is full, and gives one workflow at most half', () => {
		const queue = new SlowQueue<number>(4);
		expect(queue.push('a', 1)).toBe(true);
		expect(queue.push('a', 2)).toBe(true);
		expect(queue.push('a', 3)).toBe(false);
		expect(queue.push('b', 4)).toBe(true);
		expect(queue.push('c', 5)).toBe(true);
		expect(queue.push('d', 6)).toBe(false);
		expect(queue.size).toBe(4);
	});

	it('removes the steps that a test selects', () => {
		const queue = new SlowQueue<number>(8);
		for (const n of [1, 2, 3]) queue.push('a', n);
		queue.push('b', 4);
		expect(queue.remove((n) => n % 2 === 0)).toEqual([2, 4]);
		expect(queue.size).toBe(2);
		expect(queue.shift()).toBe(1);
		expect(queue.shift()).toBe(3);
		expect(queue.shift()).toBeUndefined();
	});
});
