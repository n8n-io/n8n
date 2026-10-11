import { Time } from '@n8n/constants';
import type { Schedule } from '@n8n/scheduler';
import { computeFirstRunAt, computeNextRunAt } from '@n8n/scheduler';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError } from 'n8n-workflow';

/**
 * Node fires a timeout longer than this straight away (the delay is a signed
 * 32-bit millisecond value), so a longer wait is split into hops.
 */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Most occurrences a walked schedule reports as coalesced. A wider gap counts
 * as this many, because walking a cron expression reparses it at every step:
 * 1000 steps cost about 90 ms of blocked event loop, 43,200 (a month of
 * minutes) cost about 3 s.
 */
const MAX_WALKED_OCCURRENCES = 1_000;

/**
 * One task's in-memory cadence: a chained timeout firing `onFire` at every
 * occurrence of `schedule`, handing it how late the fire is in milliseconds and
 * how many occurrences it stands in for. Every armed occurrence is announced to
 * `onPlan` with the instant it is due.
 *
 * Occurrences the process slept through are coalesced: the timer fires once,
 * counting them, and resumes from now, rather than replaying the whole backlog.
 *
 * The pending timeout is unref'd, so it never keeps the process alive on its own.
 *
 * @remarks Temporary: removed once every task runs on the durable scheduler
 */
export class SystemTaskTimer {
	private timer: NodeJS.Timeout | undefined;

	constructor(
		private readonly schedule: Schedule,
		private readonly onFire: (lagMs: number, coalesced: number) => void,
		private readonly onPlanError: (error: Error) => void,
		private readonly onPlan: (fireAt: Date) => void,
		private readonly now: () => number = Date.now,
	) {}

	start(from: Date): void {
		this.stop();
		this.arm(from, true);
	}

	stop(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	private arm(after: Date, isFirst: boolean): number {
		let next: Date | null;
		try {
			next = this.nextOccurrence(after, isFirst);
		} catch (error) {
			this.timer = undefined;
			this.onPlanError(ensureError(error));
			return 0;
		}

		if (next === null) {
			this.timer = undefined;
			this.onPlanError(new UnexpectedError('A system task schedule has no next occurrence'));
			return 0;
		}

		const fireAtMs = next.getTime();

		if (!Number.isFinite(fireAtMs)) {
			this.timer = undefined;
			this.onPlanError(
				new UnexpectedError('A system task schedule plans past the representable date range'),
			);
			return 0;
		}

		const nowMs = this.now();
		const delayMs = fireAtMs - nowMs;

		if (delayMs < 0) {
			const coalesced = this.countOccurrencesUpTo(next, nowMs);
			this.arm(new Date(nowMs), true);
			return coalesced;
		}

		this.waitFor(next, delayMs);
		this.onPlan(next);
		return 0;
	}

	/**
	 * An interval is planned here rather than by the scheduler, which only
	 * accepts whole seconds: an instance task may run more than once a second.
	 */
	private nextOccurrence(after: Date, isFirst: boolean): Date | null {
		if (this.schedule.kind === 'interval') {
			const intervalMs = this.schedule.intervalSeconds * Time.seconds.toMilliseconds;
			if (!(intervalMs > 0)) {
				throw new UnexpectedError('A system task interval is not positive');
			}
			return new Date(after.getTime() + intervalMs);
		}
		return isFirst
			? computeFirstRunAt(this.schedule, after)
			: computeNextRunAt(this.schedule, after);
	}

	/**
	 * The occurrences from `first` up to and including `untilMs`, which a fire at
	 * `untilMs` stands in for. An interval cadence is counted arithmetically; any
	 * other schedule is walked, and caps at {@link MAX_WALKED_OCCURRENCES}.
	 */
	private countOccurrencesUpTo(first: Date, untilMs: number): number {
		const firstMs = first.getTime();

		if (untilMs < firstMs) {
			return 0;
		}

		if (this.schedule.kind === 'interval') {
			const intervalMs = this.schedule.intervalSeconds * Time.seconds.toMilliseconds;
			return Math.floor((untilMs - firstMs) / intervalMs) + 1;
		}

		let count = 0;
		for (
			let next: Date | null = first;
			next !== null && next.getTime() <= untilMs && count < MAX_WALKED_OCCURRENCES;
			next = computeNextRunAt(this.schedule, next)
		) {
			count++;
		}
		return count;
	}

	private waitFor(fireAt: Date, delayMs: number): void {
		if (delayMs > MAX_TIMEOUT_MS) {
			this.timer = setTimeout(
				() => this.waitFor(fireAt, fireAt.getTime() - this.now()),
				MAX_TIMEOUT_MS,
			);
		} else {
			this.timer = setTimeout(
				() => {
					const lagMs = Math.max(0, this.now() - fireAt.getTime());
					const coalesced = this.arm(fireAt, false);
					this.onFire(lagMs, coalesced);
				},
				Math.max(0, delayMs),
			);
		}

		this.timer.unref();
	}
}
