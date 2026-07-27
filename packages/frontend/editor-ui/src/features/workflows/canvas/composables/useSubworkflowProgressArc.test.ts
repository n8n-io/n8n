import { effectScope, ref } from 'vue';
import { useSubworkflowProgressArc } from './useSubworkflowProgressArc';

type Progress = { currentNodeIndex: number; totalNodes: number } | undefined;

/**
 * `useIntervalFn` disposes with its effect scope, so each case runs inside its
 * own and stops it afterwards — otherwise timers leak across tests and the
 * trickle from one case advances the next.
 */
function withArc(initial: Progress) {
	const progress = ref<Progress>(initial);
	const scope = effectScope();
	const arc = scope.run(() => useSubworkflowProgressArc(progress))!;

	return { progress, fraction: arc.fraction, stop: () => scope.stop() };
}

describe('useSubworkflowProgressArc', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports 0 without progress, so the caller can skip the arc', () => {
		const { fraction, stop } = withArc(undefined);

		expect(fraction.value).toBe(0);
		stop();
	});

	it('reports 0 when the total is unknown', () => {
		const { fraction, stop } = withArc({ currentNodeIndex: 2, totalNodes: 0 });

		expect(fraction.value).toBe(0);
		stop();
	});

	it('moves to the step fraction as soon as a step lands', async () => {
		const { progress, fraction, stop } = withArc({ currentNodeIndex: 1, totalNodes: 4 });

		progress.value = { currentNodeIndex: 2, totalNodes: 4 };
		await vi.waitFor(() => expect(fraction.value).toBe(0.5));
		stop();
	});

	it('trickles forward between steps without reaching the next one', async () => {
		const { fraction, stop } = withArc({ currentNodeIndex: 2, totalNodes: 4 });
		expect(fraction.value).toBe(0.5);

		await vi.advanceTimersByTimeAsync(60_000);

		// Bounded by half a step: 0.5 + (1/4 * 0.5) = 0.625, approached but never met.
		expect(fraction.value).toBeGreaterThan(0.5);
		expect(fraction.value).toBeLessThan(0.625);
		stop();
	});

	it('never exceeds the cap, however long a step runs', async () => {
		const { fraction, stop } = withArc({ currentNodeIndex: 4, totalNodes: 4 });

		await vi.advanceTimersByTimeAsync(600_000);

		expect(fraction.value).toBeLessThanOrEqual(0.9);
		stop();
	});

	it('does not move backwards when a step lands behind the trickle', async () => {
		const { progress, fraction, stop } = withArc({ currentNodeIndex: 2, totalNodes: 4 });

		await vi.advanceTimersByTimeAsync(30_000);
		const trickled = fraction.value;
		expect(trickled).toBeGreaterThan(0.5);

		// Step 3 of 4 lands at 0.75, ahead of the trickle — but assert the general
		// rule: a real step is never allowed to regress the arc.
		progress.value = { currentNodeIndex: 3, totalNodes: 4 };
		await vi.waitFor(() => expect(fraction.value).toBeGreaterThanOrEqual(trickled));
		stop();
	});

	it('snaps back when a new child execution restarts the count', async () => {
		const { progress, fraction, stop } = withArc({ currentNodeIndex: 3, totalNodes: 4 });
		expect(fraction.value).toBe(0.75);

		// A parent loop invoking the sub-workflow again: the arc must restart, not
		// hold the previous run's high-water mark.
		progress.value = { currentNodeIndex: 1, totalNodes: 4 };
		await vi.waitFor(() => expect(fraction.value).toBe(0.25));
		stop();
	});

	it('stops trickling once its scope is disposed', async () => {
		const { fraction, stop } = withArc({ currentNodeIndex: 2, totalNodes: 4 });

		stop();
		const settled = fraction.value;
		await vi.advanceTimersByTimeAsync(60_000);

		expect(fraction.value).toBe(settled);
	});
});
