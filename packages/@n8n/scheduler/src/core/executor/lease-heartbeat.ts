import { MAX_INTEGER_32BITS_SIGNED } from '@n8n/constants';

import { MIN_RENEWAL_INTERVAL_MS, RENEWALS_PER_LEASE } from './lease-constants';
import { InvalidLeaseDurationError } from '../errors';

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
 * It calls `renew` {@link RENEWALS_PER_LEASE} times per lease, one beat at a time.
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
	private beatTimer?: NodeJS.Timeout;

	private expiryTimer?: NodeJS.Timeout;

	private stopped = false;

	private readonly intervalMs: number;

	constructor(
		private readonly renew: () => Promise<boolean>,
		private readonly options: LeaseHeartbeatOptions,
		private readonly hooks: LeaseHeartbeatHooks = {},
	) {
		if (!Number.isInteger(options.leaseDurationMs) || options.leaseDurationMs <= 0) {
			throw new InvalidLeaseDurationError(options.leaseDurationMs);
		}
		// Rounded down, so the last renewal of a lease still lands before it expires.
		this.intervalMs = Math.max(
			MIN_RENEWAL_INTERVAL_MS,
			Math.floor(options.leaseDurationMs / RENEWALS_PER_LEASE),
		);
		this.armExpiry(options.leaseSetAt);
		this.scheduleBeat();
	}

	stop(): void {
		this.stopped = true;
		clearTimeout(this.beatTimer);
		clearTimeout(this.expiryTimer);
	}

	private lose(): void {
		this.stop();
		this.hooks.onRenewal?.('lost');
	}

	private armExpiry(leaseSetAt: number): void {
		clearTimeout(this.expiryTimer);
		const remainingMs = leaseSetAt + this.options.leaseDurationMs - performance.now();
		// `setTimeout` fires a longer delay at once, so a long lease is waited out in steps.
		this.expiryTimer =
			remainingMs > MAX_INTEGER_32BITS_SIGNED
				? setTimeout(() => this.armExpiry(leaseSetAt), MAX_INTEGER_32BITS_SIGNED)
				: setTimeout(() => this.hooks.onRenewal?.('expired'), Math.max(0, remainingMs));
	}

	private scheduleBeat(): void {
		this.beatTimer = setTimeout(
			() => {
				this.beat().catch((error: unknown) => this.hooks.onRenewalError?.(error));
			},
			Math.min(this.intervalMs, MAX_INTEGER_32BITS_SIGNED),
		);
	}

	private async beat(): Promise<void> {
		const startedAt = performance.now();
		try {
			const renewed = await this.renew();
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
		this.scheduleBeat();
	}
}
