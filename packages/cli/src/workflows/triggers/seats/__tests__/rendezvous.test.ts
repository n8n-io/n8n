import { desiredHolders, fairShare } from '../rendezvous';

describe('desiredHolders', () => {
	const runners = ['runner-a', 'runner-b', 'runner-c', 'runner-d'];

	it('is deterministic regardless of input order', () => {
		const forward = desiredHolders('wf-1', 'node-1', runners, 2);
		const reversed = desiredHolders('wf-1', 'node-1', [...runners].reverse(), 2);
		expect(forward).toEqual(reversed);
		expect(forward).toHaveLength(2);
	});

	it('includes every runner when n >= runner count', () => {
		const holders = desiredHolders('wf-1', 'node-1', runners, 10);
		expect([...holders].sort()).toEqual([...runners].sort());
	});

	it('adding a runner never reshuffles seats between unaffected runners', () => {
		// For every synthetic trigger, the only allowed change when runner-e
		// joins is runner-e displacing someone — a holder that survives must
		// keep its membership, and no seat may move between two old runners.
		for (let i = 0; i < 200; i++) {
			const before = new Set(desiredHolders(`wf-${i}`, 'node-1', runners, 2));
			const after = new Set(desiredHolders(`wf-${i}`, 'node-1', [...runners, 'runner-e'], 2));

			const lost = [...before].filter((runner) => !after.has(runner));
			const gained = [...after].filter((runner) => !before.has(runner));

			expect(lost.length).toBeLessThanOrEqual(1);
			expect(gained.length).toBe(lost.length);
			if (gained.length === 1) expect(gained[0]).toBe('runner-e');
		}
	});

	it('spreads assignments roughly evenly across runners', () => {
		const counts = new Map<string, number>(runners.map((runner) => [runner, 0]));
		for (let i = 0; i < 400; i++) {
			for (const holder of desiredHolders(`wf-${i}`, `node-${i}`, runners, 1)) {
				counts.set(holder, (counts.get(holder) ?? 0) + 1);
			}
		}
		for (const count of counts.values()) {
			// 400 singleton seats over 4 runners = 100 expected; allow wide slack,
			// this guards against degenerate hashing, not perfect balance.
			expect(count).toBeGreaterThan(50);
			expect(count).toBeLessThan(150);
		}
	});
});

describe('fairShare', () => {
	it('rounds up and tolerates zero runners', () => {
		expect(fairShare(10, 4)).toBe(3);
		expect(fairShare(8, 4)).toBe(2);
		expect(fairShare(0, 4)).toBe(0);
		expect(fairShare(5, 0)).toBe(5);
	});
});
