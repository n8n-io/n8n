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
 * One task's in-memory cadence: a chained timeout firing `onFire` at every
 * occurrence of `schedule`, handing it how late the fire is in milliseconds and
 * how many occurrences it stands in for.
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
			next = isFirst
				? computeFirstRunAt(this.schedule, after)
				: computeNextRunAt(this.schedule, after);
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
		return 0;
	}

	/** The occurrences from `first` up to and including `untilMs`, which a fire at `untilMs` stands in for. */
	private countOccurrencesUpTo(first: Date, untilMs: number): number {
		let count = 0;
		for (
			let next: Date | null = first;
			next !== null && next.getTime() <= untilMs;
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
