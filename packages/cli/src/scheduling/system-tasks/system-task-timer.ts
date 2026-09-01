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
 * occurrence of `schedule`.
 *
 * Occurrences the process slept through are coalesced: the timer fires once and
 * resumes from now, rather than replaying the whole backlog.
 *
 * The pending timeout is unref'd, so it never keeps the process alive on its own.
 *
 * @remarks Temporary: removed once every task runs on the durable scheduler
 */
export class SystemTaskTimer {
	private timer: NodeJS.Timeout | undefined;

	constructor(
		private readonly schedule: Schedule,
		private readonly onFire: () => void,
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

	private arm(after: Date, isFirst: boolean): void {
		let next: Date | null;
		try {
			next = isFirst
				? computeFirstRunAt(this.schedule, after)
				: computeNextRunAt(this.schedule, after);
		} catch (error) {
			this.timer = undefined;
			this.onPlanError(ensureError(error));
			return;
		}

		if (next === null) {
			this.timer = undefined;
			return;
		}

		const fireAtMs = next.getTime();

		if (!Number.isFinite(fireAtMs)) {
			this.timer = undefined;
			this.onPlanError(
				new UnexpectedError('A system task schedule plans past the representable date range'),
			);
			return;
		}

		const delayMs = fireAtMs - this.now();

		if (delayMs < 0) {
			this.arm(new Date(this.now()), true);
			return;
		}

		this.waitFor(next, delayMs);
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
					this.arm(fireAt, false);
					this.onFire();
				},
				Math.max(0, delayMs),
			);
		}

		this.timer.unref();
	}
}
