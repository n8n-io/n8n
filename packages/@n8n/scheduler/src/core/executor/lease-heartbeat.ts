import { MIN_RENEWAL_INTERVAL_MS, RENEWALS_PER_LEASE } from './lease-constants';
import { InvalidLeaseDurationError } from '../errors';
import { Alarm } from '../lifecycle/alarm';

/**
 * How the claim stands:
 * - `renewed`: the lease was extended.
 * - `lost`: a renewal found the claim gone.
 * - `expired`: no renewal succeeded for a whole lease, so the reaper may hand the
 *   claim to another instance.
 */
export type LeaseRenewalResult = 'renewed' | 'lost' | 'expired';

export interface LeaseHeartbeatOptions {
	/** How long a lease stays valid after the write that sets it. A positive integer. */
	leaseDurationMs: number;
	/** `performance.now()` just before the write that last set the lease. */
	leaseSetAt: number;
}

export interface LeaseHeartbeatHooks {
	onRenewal?: (result: LeaseRenewalResult) => void;
	/** A renewal write failed. The next beat tries again while the lease still holds. */
	onRenewalError?: (error: unknown) => void;
}

/**
 * Keeps a claim's lease alive while its handler runs.
 *
 * It calls `renew` {@link RENEWALS_PER_LEASE} times per lease, one beat at a time,
 * with `leaseDurationMs` as the new lease length.
 * It reports `lost` and stops when `renew` reports `false`.
 * It reports `expired` when `leaseDurationMs` passes without a successful renewal,
 * since the reaper may then hand the claim to another instance,
 * but it keeps renewing:
 * the claim survives if a renewal lands before the reaper sweeps.
 *
 * Call {@link stop} once the handler settles.
 *
 * @throws {InvalidLeaseDurationError} when `leaseDurationMs` is not a positive integer
 */
export class LeaseHeartbeat {
	private readonly beatAlarm = new Alarm(() => performance.now());

	private readonly expiryAlarm = new Alarm(() => performance.now());

	private stopped = false;

	private readonly intervalMs: number;

	constructor(
		private readonly renew: (expiresInMs: number) => Promise<boolean>,
		private readonly options: LeaseHeartbeatOptions,
		private readonly hooks: LeaseHeartbeatHooks = {},
	) {
		if (!Number.isInteger(options.leaseDurationMs) || options.leaseDurationMs <= 0) {
			throw new InvalidLeaseDurationError(options.leaseDurationMs);
		}
		// One spare interval, so the last renewal of a lease still lands before it expires.
		this.intervalMs = Math.max(
			MIN_RENEWAL_INTERVAL_MS,
			Math.floor(options.leaseDurationMs / (RENEWALS_PER_LEASE + 1)),
		);
		this.armExpiry(options.leaseSetAt);
		this.scheduleBeat(options.leaseSetAt);
	}

	stop(): void {
		this.stopped = true;
		this.beatAlarm.cancel();
		this.expiryAlarm.cancel();
	}

	private lose(): void {
		this.stop();
		this.hooks.onRenewal?.('lost');
	}

	private armExpiry(leaseSetAt: number): void {
		this.expiryAlarm.set(leaseSetAt + this.options.leaseDurationMs, () =>
			this.hooks.onRenewal?.('expired'),
		);
	}

	private scheduleBeat(intervalStartAt: number): void {
		this.beatAlarm.set(intervalStartAt + this.intervalMs, () => {
			this.beat().catch((error: unknown) => this.hooks.onRenewalError?.(error));
		});
	}

	private async beat(): Promise<void> {
		const startedAt = performance.now();
		try {
			const renewed = await this.renew(this.options.leaseDurationMs);
			// The handler settled while the renewal was in flight, so a refusal here can
			// be its own terminal write, not a lost claim.
			if (this.stopped) {
				return;
			}
			if (!renewed) {
				this.lose();
				return;
			}
			this.armExpiry(startedAt);
			this.hooks.onRenewal?.('renewed');
		} catch (error) {
			if (this.stopped) {
				return;
			}
			this.hooks.onRenewalError?.(error);
		}
		// Count the interval from this beat's start, so a slow renewal does not delay the next one.
		this.scheduleBeat(startedAt);
	}
}
