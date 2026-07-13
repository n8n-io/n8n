import { executorLookaheadSeconds } from '../lookahead';
import { Timeline } from '../timeline';

const INTERVAL = 10_000;
const JITTER = 0.1;

/** A Timeline driven by a scripted random sequence (falls back to the midpoint = no jitter). */
function timelineWith(randoms: number[], jitter = JITTER) {
	const queue = [...randoms];
	const random = () => queue.shift() ?? 0.5;
	return new Timeline(INTERVAL, jitter, random, 0);
}

/** Fire instants of the first `count` ticks: the anchor plus `count - 1` jittered slots. */
function fires(timeline: Timeline, count: number): number[] {
	const out = [timeline.firstTickAt];
	for (let i = 1; i < count; i++) {
		out.push(timeline.nextTickAt(out[out.length - 1]));
	}
	return out;
}

function gaps(instants: number[]): number[] {
	return instants.slice(1).map((instant, i) => instant - instants[i]);
}

describe('Timeline', () => {
	it('anchors the first tick at a random phase within one interval, un-jittered', () => {
		expect(timelineWith([0.25]).firstTickAt).toBe(2_500);
		expect(timelineWith([0]).firstTickAt).toBe(0);
	});

	it('keeps slots one interval apart when jitter is zero (no drift)', () => {
		// Midpoint random means zero jitter every slot, so fires land exactly on the slots.
		expect(fires(timelineWith([0.5, 0.5, 0.5]), 3)).toEqual([5_000, 15_000, 25_000]);
	});

	it('jitters each slot symmetrically within ±jitter·interval, without accumulating', () => {
		// slot 1 = 15_000 pulled fully early; slot 2 = 25_000 pushed fully late.
		const timeline = timelineWith([0.5, 0, 1]);
		expect(fires(timeline, 3)).toEqual([5_000, 14_000, 26_000]);
	});

	it('skips slots left wholly in the past after a stall, firing once rather than bursting', () => {
		const timeline = timelineWith([0.5]); // anchor at 5_000
		// The loop resumes at 38_000: slots 15_000/25_000/35_000 are past and skipped;
		// the next fire is the first slot after now (45_000), not a catch-up burst.
		expect(timeline.nextTickAt(38_000)).toBe(45_000);
	});

	describe('gap vs executor lookahead', () => {
		it('worst-case adjacent jitter opens a gap of interval·(1+2·jitter), which the lookahead exactly covers', () => {
			// Alternating fully-early / fully-late ticks maximise every other gap.
			const timeline = timelineWith([0.5, 0, 1, 0, 1, 0, 1]);
			const maxGap = Math.max(...gaps(fires(timeline, 7)));

			expect(maxGap).toBe(INTERVAL * (1 + 2 * JITTER)); // 12_000
			// The lookahead must cover the widest gap, and does so exactly (tight, not padded).
			expect(executorLookaheadSeconds(INTERVAL / 1_000, JITTER) * 1_000).toBe(maxGap);
		});

		it('covers every gap under arbitrary jitter, coupling the timeline and the lookahead', () => {
			// A spread of jitter draws, including the extremes that reach the bound. If either
			// the jitter span or the lookahead formula drifts out of step, a gap escapes here.
			const draws = [0, 1, 0.5, 0.9, 0.1, 1, 0, 0.3, 0.7, 0, 1, 0.5];
			const lookaheadMs = executorLookaheadSeconds(INTERVAL / 1_000, JITTER) * 1_000;

			for (const gap of gaps(fires(timelineWith([0.5, ...draws]), draws.length + 1))) {
				expect(gap).toBeLessThanOrEqual(lookaheadMs);
			}
		});
	});
});
