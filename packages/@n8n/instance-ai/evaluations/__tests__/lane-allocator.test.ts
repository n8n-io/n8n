import { LaneAllocator, type AllocatableLane } from '../cli/lane-allocator';

interface TestLane extends AllocatableLane {
	id: number;
}

function newLanes(count: number): TestLane[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		activeBuilds: 0,
		inflightPrompts: new Set<string>(),
	}));
}

describe('LaneAllocator', () => {
	it('spreads builds across lanes by picking the least-loaded eligible lane', async () => {
		const lanes = newLanes(3);
		const a = new LaneAllocator(lanes, 4);
		const l1 = await a.acquire('p1');
		const l2 = await a.acquire('p2');
		const l3 = await a.acquire('p3');
		expect([l1.id, l2.id, l3.id]).toEqual([0, 1, 2]);
		expect(lanes.map((l) => l.activeBuilds)).toEqual([1, 1, 1]);
	});

	it('skips a lane already running the same prompt', async () => {
		const lanes = newLanes(2);
		const a = new LaneAllocator(lanes, 4);
		const l1 = await a.acquire('p1');
		const l2 = await a.acquire('p1');
		expect(l1.id).toBe(0);
		expect(l2.id).toBe(1);
		expect(lanes[0].inflightPrompts.has('p1')).toBe(true);
		expect(lanes[1].inflightPrompts.has('p1')).toBe(true);
	});

	it('queues acquires when no lane can serve the prompt', async () => {
		const lanes = newLanes(1);
		const a = new LaneAllocator(lanes, 4);
		await a.acquire('p1');
		let resolvedSecond = false;
		const second = a.acquire('p1').then((l) => {
			resolvedSecond = true;
			return l;
		});
		await new Promise((r) => setImmediate(r));
		expect(resolvedSecond).toBe(false);
		a.release(lanes[0], 'p1');
		const lane = await second;
		expect(lane.id).toBe(0);
		expect(lanes[0].inflightPrompts.has('p1')).toBe(true);
	});

	it('respects maxConcurrentBuilds per lane', async () => {
		const lanes = newLanes(1);
		const a = new LaneAllocator(lanes, 2);
		await a.acquire('p1');
		await a.acquire('p2');
		let resolved = false;
		const blocked = a.acquire('p3').then((l) => {
			resolved = true;
			return l;
		});
		await new Promise((r) => setImmediate(r));
		expect(resolved).toBe(false);
		a.release(lanes[0], 'p1');
		await blocked;
		expect(resolved).toBe(true);
	});

	it('skips queued waiters with conflicting prompts when a lane frees up', async () => {
		const lanes = newLanes(1);
		const a = new LaneAllocator(lanes, 2);
		await a.acquire('p1');
		await a.acquire('p2');
		const order: string[] = [];
		const w1 = a.acquire('p1').then((l) => {
			order.push('p1');
			return l;
		});
		const w3 = a.acquire('p3').then((l) => {
			order.push('p3');
			return l;
		});
		await new Promise((r) => setImmediate(r));
		expect(order).toEqual([]);
		a.release(lanes[0], 'p2');
		await w3;
		expect(order).toEqual(['p3']);
		a.release(lanes[0], 'p1');
		await w1;
		expect(order).toEqual(['p3', 'p1']);
	});
});
