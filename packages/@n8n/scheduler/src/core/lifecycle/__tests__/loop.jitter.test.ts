import { Loop } from '../loop';
import type { LoopHooks } from '../loop';

const INTERVAL_MS = 10_000;
const JITTER_RATIO = 0.1;
const TIMEOUT_MS = 60_000;
const TICKS = 500;

/** Fake-timer scheduling may land on sub-millisecond boundaries; allow 1ms of rounding. */
const ROUNDING_MS = 1;

/**
 * Deterministic PRNG (mulberry32) so each stress run draws hundreds of
 * realistic-looking jitter samples yet stays perfectly reproducible.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function mockHooks(): LoopHooks {
	return { onError: vi.fn(), onTimeout: vi.fn(), onSkippedTick: vi.fn() };
}

/** A loop over `pass` with the default cadence and a scripted random stream. */
function makeLoop(
	pass: () => Promise<unknown>,
	random: () => number,
	jitterRatio = JITTER_RATIO,
	concurrency: 'sequential' | 'concurrent' = 'sequential',
) {
	return new Loop(
		pass,
		{
			intervalMs: INTERVAL_MS,
			jitterRatio,
			timeoutMs: TIMEOUT_MS,
			concurrency,
			maxConcurrent: 10,
		},
		mockHooks(),
		random,
	);
}

describe('Loop jitter (stress)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Run one loop for at least `ticks` passes; return every absolute fire time and inter-tick delay. */
	async function collect(seed: number, jitterRatio = JITTER_RATIO, ticks = TICKS) {
		const startedAt = Date.now();
		const fireTimes: number[] = [];
		// Concurrent so a near-zero jittered gap can never drop a tick while the
		// previous (instant) pass is still settling its microtasks.
		const loop = makeLoop(
			async () => {
				fireTimes.push(Date.now() - startedAt);
				await Promise.resolve();
			},
			mulberry32(seed),
			jitterRatio,
			'concurrent',
		);

		loop.start();
		// Worst case every tick lands at the top of its jitter window; budget for it plus the initial phase.
		await vi.advanceTimersByTimeAsync(Math.ceil((ticks + 1) * INTERVAL_MS * (1 + jitterRatio)));
		await loop.stop();

		const delays = fireTimes.slice(1).map((time, i) => time - fireTimes[i]);
		return { fireTimes, firstTickAt: fireTimes[0], delays };
	}

	/** Start a fleet of loops together, each with its own random stream, and record every fire time. */
	function makeFleet(size: number, seedBase: number) {
		const startedAt = Date.now();
		return Array.from({ length: size }, (_, i) => {
			const fireTimes: number[] = [];
			const loop = makeLoop(
				async () => {
					fireTimes.push(Date.now() - startedAt);
					await Promise.resolve();
				},
				mulberry32(seedBase + i),
			);
			return { loop, fireTimes };
		});
	}

	it('keeps every tick across hundreds of slots inside its jitter window on the fixed timeline', async () => {
		const { fireTimes, firstTickAt } = await collect(1);

		expect(fireTimes.length).toBeGreaterThan(TICKS);
		expect(firstTickAt).toBeGreaterThanOrEqual(0);
		expect(firstTickAt).toBeLessThanOrEqual(INTERVAL_MS);
		// The first tick anchors the timeline; every later tick must sit within
		// one jitter offset of its own slot — deviations never accumulate.
		for (let k = 1; k < fireTimes.length; k++) {
			const slotAt = firstTickAt + k * INTERVAL_MS;
			expect(Math.abs(fireTimes[k] - slotAt)).toBeLessThanOrEqual(
				INTERVAL_MS * JITTER_RATIO + ROUNDING_MS,
			);
		}
	});

	it('keeps every delay inside interval ± twice the jitter window', async () => {
		const { delays } = await collect(6);

		expect(delays.length).toBeGreaterThanOrEqual(TICKS);
		// Consecutive ticks each carry their own offset, so a gap can deviate by
		// up to two offsets while the timeline itself stays fixed.
		for (const delay of delays) {
			expect(delay).toBeGreaterThanOrEqual(INTERVAL_MS * (1 - 2 * JITTER_RATIO) - ROUNDING_MS);
			expect(delay).toBeLessThanOrEqual(INTERVAL_MS * (1 + 2 * JITTER_RATIO) + ROUNDING_MS);
		}
	});

	it('exercises the whole jitter window rather than hugging the slots', async () => {
		const { fireTimes, firstTickAt } = await collect(2);

		const offsets = fireTimes
			.slice(1)
			.map((time, i) => time - (firstTickAt + (i + 1) * INTERVAL_MS));
		expect(Math.min(...offsets)).toBeLessThan(-INTERVAL_MS * JITTER_RATIO * 0.8);
		expect(Math.max(...offsets)).toBeGreaterThan(INTERVAL_MS * JITTER_RATIO * 0.8);
	});

	it('stays unbiased: the average cadence converges on the interval', async () => {
		const { delays } = await collect(3);

		const mean = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
		expect(Math.abs(mean - INTERVAL_MS)).toBeLessThan(INTERVAL_MS * 0.02);
	});

	it('spreads a fleet started together across the interval on the first tick', async () => {
		const fleet = makeFleet(50, 100);
		for (const { loop } of fleet) {
			loop.start();
		}
		await vi.advanceTimersByTimeAsync(INTERVAL_MS);
		await Promise.all(fleet.map(async ({ loop }) => await loop.stop()));

		const firsts = fleet.map(({ fireTimes }) => fireTimes[0]).sort((a, b) => a - b);
		expect(firsts[0]).toBeGreaterThanOrEqual(0);
		expect(firsts[firsts.length - 1]).toBeLessThanOrEqual(INTERVAL_MS);
		// The fleet must cover most of the interval, with no lockstep cluster inside it.
		expect(firsts[firsts.length - 1] - firsts[0]).toBeGreaterThan(INTERVAL_MS * 0.7);
		let maxGap = 0;
		for (let i = 1; i < firsts.length; i++) {
			maxGap = Math.max(maxGap, firsts[i] - firsts[i - 1]);
		}
		expect(maxGap).toBeLessThan(INTERVAL_MS * 0.3);
	});

	it('keeps a fleet spread out over many intervals', async () => {
		const HORIZON_INTERVALS = 100;
		// Every loop reaches this slot well within the horizon.
		const TICK_INDEX = 80;

		const fleet = makeFleet(20, 200);
		for (const { loop } of fleet) {
			loop.start();
		}
		await vi.advanceTimersByTimeAsync(HORIZON_INTERVALS * INTERVAL_MS);
		await Promise.all(fleet.map(async ({ loop }) => await loop.stop()));

		const nthTick = fleet.map(({ fireTimes }) => fireTimes[TICK_INDEX]);
		expect(nthTick).not.toContain(undefined);
		// The random anchor phases must survive: no collapse into lockstep.
		const spread = Math.max(...nthTick) - Math.min(...nthTick);
		expect(spread).toBeGreaterThan(INTERVAL_MS * 0.5);
	});

	it('never overlaps a pass with itself even when passes outlast the jittered delay', async () => {
		const durations = mulberry32(7);
		let inFlight = 0;
		let maxInFlight = 0;
		let calls = 0;
		const pass = async () => {
			calls++;
			inFlight++;
			maxInFlight = Math.max(maxInFlight, inFlight);
			const durationMs = durations() * INTERVAL_MS * 1.5;
			await new Promise<void>((resolve) => {
				setTimeout(resolve, durationMs);
			});
			inFlight--;
		};
		const loop = makeLoop(pass, mulberry32(8));

		loop.start();
		await vi.advanceTimersByTimeAsync(200 * INTERVAL_MS);
		// Stop drains the in-flight pass, whose duration timer only fires on fake time.
		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(2 * INTERVAL_MS);
		await stopping;

		// Ticks that would overlap are dropped, so fewer passes run than slots fire.
		expect(calls).toBeGreaterThan(100);
		expect(calls).toBeLessThan(200);
		expect(maxInFlight).toBe(1);
	});

	it('a zero jitter ratio degrades to an exact cadence', async () => {
		const { delays } = await collect(4, 0, 100);

		expect(delays.length).toBeGreaterThanOrEqual(100);
		expect(new Set(delays)).toEqual(new Set([INTERVAL_MS]));
	});

	it('a large jitter ratio (0.5) stays within [0, 2×interval] and reaches both extremes', async () => {
		const { delays } = await collect(5, 0.5, 300);

		expect(delays.length).toBeGreaterThanOrEqual(300);
		expect(Math.min(...delays)).toBeGreaterThanOrEqual(-ROUNDING_MS);
		expect(Math.max(...delays)).toBeLessThanOrEqual(2 * INTERVAL_MS + ROUNDING_MS);
		expect(Math.min(...delays)).toBeLessThan(INTERVAL_MS * 0.2);
		expect(Math.max(...delays)).toBeGreaterThan(INTERVAL_MS * 1.8);
	});
});
