import { LaneAllocator, type AllocatableLane } from '../cli/lane-allocator';

interface TestLane extends AllocatableLane {
	id: number;
}

function newLanes(count: number): TestLane[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		activeWork: 0,
		inflightKeys: new Set<string>(),
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
		expect(lanes.map((l) => l.activeWork)).toEqual([1, 1, 1]);
	});

	it('skips a lane already running the same prompt', async () => {
		const lanes = newLanes(2);
		const a = new LaneAllocator(lanes, 4);
		const l1 = await a.acquire('p1');
		const l2 = await a.acquire('p1');
		expect(l1.id).toBe(0);
		expect(l2.id).toBe(1);
		expect(lanes[0].inflightKeys.has('p1')).toBe(true);
		expect(lanes[1].inflightKeys.has('p1')).toBe(true);
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
		expect(lanes[0].inflightKeys.has('p1')).toBe(true);
	});

	it('respects the per-lane work cap', async () => {
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

	describe('pinned work slots (scenario executions)', () => {
		it('counts pinned work toward the lane cap so a backlogged lane stops winning builds', async () => {
			const lanes = newLanes(2);
			const a = new LaneAllocator(lanes, 2);
			await a.acquireOn(lanes[0]);
			await a.acquireOn(lanes[0]);
			// Lane 0 is full of scenario work — every build must land on lane 1.
			const b1 = await a.acquire('p1');
			const b2 = await a.acquire('p2');
			expect([b1.id, b2.id]).toEqual([1, 1]);
			a.release(lanes[0]);
			const b3 = await a.acquire('p3');
			expect(b3.id).toBe(0);
		});

		it('waits for the pinned lane even when other lanes are free', async () => {
			const lanes = newLanes(2);
			const a = new LaneAllocator(lanes, 1);
			await a.acquire('p1'); // fills lane 0
			let resolved = false;
			const pinned = a.acquireOn(lanes[0]).then(() => {
				resolved = true;
			});
			await new Promise((r) => setImmediate(r));
			expect(resolved).toBe(false); // lane 1 being free must not unblock it
			a.release(lanes[0], 'p1');
			await pinned;
			expect(resolved).toBe(true);
		});

		it('rejects a pinned wait at its deadline with the lane state in the message', async () => {
			vi.useFakeTimers();
			const lanes = newLanes(1);
			const a = new LaneAllocator(lanes, 1);
			await a.acquire('p1');
			const pinned = a.acquireOn(lanes[0], { deadlineMs: 1000 });
			const rejection = expect(pinned).rejects.toThrow('no lane slot within 1000ms');
			await vi.advanceTimersByTimeAsync(1000);
			await rejection;
			vi.useRealTimers();
		});

		it('keeps pinned waiters queued through quarantine and serves them on re-admission', async () => {
			vi.useFakeTimers();
			const lanes = newLanes(2);
			let healthy = false;
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(healthy),
				probeIntervalMs: 1000,
				quarantineThreshold: 1,
			});
			a.reportOutcome(lanes[0], 'transient-failure');
			expect(a.isQuarantined(lanes[0])).toBe(true);
			let resolved = false;
			const pinned = a.acquireOn(lanes[0]).then(() => {
				resolved = true;
			});
			await vi.advanceTimersByTimeAsync(1000);
			expect(resolved).toBe(false);
			healthy = true;
			await vi.advanceTimersByTimeAsync(1000);
			await pinned;
			expect(resolved).toBe(true);
			expect(lanes[0].activeWork).toBe(1);
			vi.useRealTimers();
		});

		it('does not hand a freed slot on another lane to a pinned waiter', async () => {
			const lanes = newLanes(2);
			const a = new LaneAllocator(lanes, 1);
			await a.acquire('p1'); // lane 0
			await a.acquire('p2'); // lane 1
			let resolved = false;
			void a.acquireOn(lanes[0]).then(() => {
				resolved = true;
			});
			a.release(lanes[1], 'p2');
			await new Promise((r) => setImmediate(r));
			expect(resolved).toBe(false);
			a.release(lanes[0], 'p1');
			await new Promise((r) => setImmediate(r));
			expect(resolved).toBe(true);
		});
	});

	describe('lane health', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it('quarantines a lane after consecutive transient failures and stops assigning to it', async () => {
			const lanes = newLanes(2);
			const onQuarantine = vi.fn();
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(false),
				quarantineThreshold: 3,
				onQuarantine,
			});
			for (let i = 0; i < 3; i++) a.reportOutcome(lanes[0], 'transient-failure');
			expect(a.isQuarantined(lanes[0])).toBe(true);
			expect(onQuarantine).toHaveBeenCalledWith(lanes[0]);
			const l1 = await a.acquire('p1');
			const l2 = await a.acquire('p2');
			expect([l1.id, l2.id]).toEqual([1, 1]);
		});

		it('resets the consecutive-failure counter on a successful build', () => {
			const lanes = newLanes(1);
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(false),
				quarantineThreshold: 3,
			});
			a.reportOutcome(lanes[0], 'transient-failure');
			a.reportOutcome(lanes[0], 'transient-failure');
			a.reportOutcome(lanes[0], 'ok');
			a.reportOutcome(lanes[0], 'transient-failure');
			a.reportOutcome(lanes[0], 'transient-failure');
			expect(a.isQuarantined(lanes[0])).toBe(false);
		});

		it('re-admits a lane once the probe reports healthy and serves queued waiters', async () => {
			vi.useFakeTimers();
			const lanes = newLanes(1);
			let healthy = false;
			const onReadmit = vi.fn();
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(healthy),
				probeIntervalMs: 1000,
				quarantineThreshold: 1,
				allQuarantinedGraceMs: 60_000,
				onReadmit,
			});
			a.reportOutcome(lanes[0], 'transient-failure');
			expect(a.isQuarantined(lanes[0])).toBe(true);
			const waiter = a.acquire('p1');
			await vi.advanceTimersByTimeAsync(1000);
			expect(a.isQuarantined(lanes[0])).toBe(true);
			healthy = true;
			await vi.advanceTimersByTimeAsync(1000);
			expect(a.isQuarantined(lanes[0])).toBe(false);
			expect(onReadmit).toHaveBeenCalledWith(lanes[0]);
			await expect(waiter).resolves.toBe(lanes[0]);
		});

		it('prefers a lane other than `not`, falling back to it when nothing else is free', async () => {
			const lanes = newLanes(2);
			const a = new LaneAllocator(lanes, 4);
			const first = await a.acquire('p1');
			const retry = await a.acquire('p2', { not: first });
			expect(retry.id).not.toBe(first.id);

			const single = newLanes(1);
			const b = new LaneAllocator(single, 4);
			const only = await b.acquire('p1');
			const fallback = await b.acquire('p2', { not: only });
			expect(fallback).toBe(only);
		});

		it('remembers when a lane was quarantined so mid-flight failures can be attributed', () => {
			const before = Date.now();
			const lanes = newLanes(1);
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(false),
				quarantineThreshold: 1,
			});
			expect(a.wasQuarantinedSince(lanes[0], before)).toBe(false);
			a.reportOutcome(lanes[0], 'transient-failure');
			expect(a.wasQuarantinedSince(lanes[0], before)).toBe(true);
			expect(a.wasQuarantinedSince(lanes[0], Date.now() + 1000)).toBe(false);
		});

		it('aborts pending and future acquires when all lanes stay quarantined past the grace period', async () => {
			vi.useFakeTimers();
			const lanes = newLanes(2);
			const a = new LaneAllocator(lanes, 4, {
				probe: async () => await Promise.resolve(false),
				probeIntervalMs: 1000,
				quarantineThreshold: 1,
				allQuarantinedGraceMs: 5000,
			});
			a.reportOutcome(lanes[0], 'transient-failure');
			a.reportOutcome(lanes[1], 'transient-failure');
			const pending = a.acquire('p1');
			const rejection = expect(pending).rejects.toThrow('All 2 lanes quarantined');
			await vi.advanceTimersByTimeAsync(5000);
			await rejection;
			await expect(a.acquire('p2')).rejects.toThrow('quarantined');
		});
	});
});
