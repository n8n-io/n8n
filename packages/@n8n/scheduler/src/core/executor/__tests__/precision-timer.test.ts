import { PrecisionTimer, type TimerBackend } from '../precision-timer';

/** A backend with a controllable clock; timers fire when time is advanced past them. */
class FakeBackend implements TimerBackend {
	current = 1_000_000;

	private nextId = 1;

	/** Every delay handed to setTimer, so tests can assert the clamp/floor. */
	readonly delays: number[] = [];

	private timers: Array<{
		id: number;
		fireAt: number;
		fn: () => void;
		cleared: boolean;
	}> = [];

	now(): number {
		return this.current;
	}

	setTimer(fn: () => void, delayMs: number): NodeJS.Timeout {
		const id = this.nextId++;
		this.delays.push(delayMs);
		this.timers.push({ id, fireAt: this.current + delayMs, fn, cleared: false });
		return id as unknown as NodeJS.Timeout;
	}

	clearTimer(handle: NodeJS.Timeout): void {
		const entry = this.timers.find((t) => t.id === (handle as unknown as number));
		if (entry) entry.cleared = true;
	}

	/** Advance the clock and fire any due, uncleared timers. */
	advanceTo(time: number): void {
		this.current = time;
		for (const t of this.timers) {
			if (!t.cleared && t.fireAt <= this.current) {
				t.cleared = true;
				t.fn();
			}
		}
	}
}

describe('PrecisionTimer', () => {
	it('fires the callback at the exact runAt instant, not before', () => {
		const backend = new FakeBackend();
		const timer = new PrecisionTimer(backend);
		const fired = vi.fn();

		timer.schedule(new Date(backend.current + 5000), fired);
		expect(timer.pendingCount).toBe(1);

		backend.advanceTo(backend.current + 4999);
		expect(fired).not.toHaveBeenCalled();

		backend.advanceTo(backend.current + 1);
		expect(fired).toHaveBeenCalledTimes(1);
		expect(timer.pendingCount).toBe(0);
	});

	it('clamps a past-due task to a 0 delay (never negative)', () => {
		const backend = new FakeBackend();
		const timer = new PrecisionTimer(backend);
		const fired = vi.fn();

		timer.schedule(new Date(backend.current - 10_000), fired);

		expect(backend.delays).toEqual([0]);
		backend.advanceTo(backend.current);
		expect(fired).toHaveBeenCalledTimes(1);
	});

	it('clamps a far-future delay to the 32-bit setTimeout ceiling', () => {
		const backend = new FakeBackend();
		const timer = new PrecisionTimer(backend);
		const MAX_DELAY_MS = 2_147_483_647;

		timer.schedule(new Date(backend.current + MAX_DELAY_MS + 500_000), vi.fn());

		// Without the clamp, setTimeout would treat the huge delay as 1ms and fire early.
		expect(backend.delays).toEqual([MAX_DELAY_MS]);
	});

	it('cancelAll clears pending timers so they never fire', () => {
		const backend = new FakeBackend();
		const timer = new PrecisionTimer(backend);
		const fired = vi.fn();

		timer.schedule(new Date(backend.current + 5000), fired);
		timer.cancelAll();
		expect(timer.pendingCount).toBe(0);

		backend.advanceTo(backend.current + 10_000);
		expect(fired).not.toHaveBeenCalled();
	});
});
