import { Loop } from '../loop';

const INTERVAL_MS = 10_000;
const JITTER_RATIO = 0.1;
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

describe('Loop jitter (stress)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/** Run one loop for at least `ticks` passes; return the first-tick phase and every inter-tick delay. */
	async function collect(seed: number, jitterRatio = JITTER_RATIO, ticks = TICKS) {
		const startedAt = Date.now();
		const fireTimes: number[] = [];
		const loop = new Loop(
			async () => {
				fireTimes.push(Date.now() - startedAt);
				await Promise.resolve();
			},
			INTERVAL_MS,
			jitterRatio,
			vi.fn(),
			mulberry32(seed),
		);

		loop.start();
		// Worst case every delay lands at the top of the window; budget for it plus the initial phase.
		await vi.advanceTimersByTimeAsync(Math.ceil((ticks + 1) * INTERVAL_MS * (1 + jitterRatio)));
		await loop.stop();

		const delays = fireTimes.slice(1).map((time, i) => time - fireTimes[i]);
		return { firstTickAt: fireTimes[0], delays };
	}

	/** Start a fleet of loops together, each with its own random stream, and record every fire time. */
	function makeFleet(size: number, seedBase: number) {
		const startedAt = Date.now();
		return Array.from({ length: size }, (_, i) => {
			const fireTimes: number[] = [];
			const loop = new Loop(
				async () => {
					fireTimes.push(Date.now() - startedAt);
					await Promise.resolve();
				},
				INTERVAL_MS,
				JITTER_RATIO,
				vi.fn(),
				mulberry32(seedBase + i),
			);
			return { loop, fireTimes };
		});
	}

	it('keeps every delay across hundreds of ticks inside the jitter window', async () => {
		const { firstTickAt, delays } = await collect(1);

		expect(delays.length).toBeGreaterThanOrEqual(TICKS);
		expect(firstTickAt).toBeGreaterThanOrEqual(0);
		expect(firstTickAt).toBeLessThanOrEqual(INTERVAL_MS);
		for (const delay of delays) {
			expect(delay).toBeGreaterThanOrEqual(INTERVAL_MS * (1 - JITTER_RATIO) - ROUNDING_MS);
			expect(delay).toBeLessThanOrEqual(INTERVAL_MS * (1 + JITTER_RATIO) + ROUNDING_MS);
		}
	});

	it('exercises the whole jitter window rather than hugging the interval', async () => {
		const { delays } = await collect(2);

		expect(Math.min(...delays)).toBeLessThan(INTERVAL_MS * (1 - JITTER_RATIO * 0.8));
		expect(Math.max(...delays)).toBeGreaterThan(INTERVAL_MS * (1 + JITTER_RATIO * 0.8));
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

	it('keeps a fleet from drifting back into lockstep over many intervals', async () => {
		const HORIZON_INTERVALS = 100;
		// Every loop reaches this tick within the horizon even if all its delays draw the top of the window.
		const TICK_INDEX = 80;

		const fleet = makeFleet(20, 200);
		for (const { loop } of fleet) {
			loop.start();
		}
		await vi.advanceTimersByTimeAsync(HORIZON_INTERVALS * INTERVAL_MS);
		await Promise.all(fleet.map(async ({ loop }) => await loop.stop()));

		const nthTick = fleet.map(({ fireTimes }) => fireTimes[TICK_INDEX]);
		expect(nthTick).not.toContain(undefined);
		// Accumulated jitter must widen the initial phase spread, not collapse it.
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
		const loop = new Loop(pass, INTERVAL_MS, JITTER_RATIO, vi.fn(), mulberry32(8));

		loop.start();
		await vi.advanceTimersByTimeAsync(200 * INTERVAL_MS);
		// Stop drains the in-flight pass, whose duration timer only fires on fake time.
		const stopping = loop.stop();
		await vi.advanceTimersByTimeAsync(2 * INTERVAL_MS);
		await stopping;

		expect(calls).toBeGreaterThan(100);
		expect(maxInFlight).toBe(1);
	});

	it('a zero jitter ratio degrades to an exact cadence', async () => {
		const { delays } = await collect(4, 0, 100);

		expect(delays.length).toBeGreaterThanOrEqual(100);
		expect(new Set(delays)).toEqual(new Set([INTERVAL_MS]));
	});

	it('a full jitter ratio stays within [0, 2×interval] and reaches both extremes', async () => {
		const { delays } = await collect(5, 1, 300);

		expect(delays.length).toBeGreaterThanOrEqual(300);
		expect(Math.min(...delays)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...delays)).toBeLessThanOrEqual(2 * INTERVAL_MS + ROUNDING_MS);
		expect(Math.min(...delays)).toBeLessThan(INTERVAL_MS * 0.2);
		expect(Math.max(...delays)).toBeGreaterThan(INTERVAL_MS * 1.8);
	});
});
