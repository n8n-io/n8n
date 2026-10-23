import { MIN_RENEWAL_INTERVAL_MS, RENEWALS_PER_LEASE } from './lease-constants';
import type { LeaseRenewalResult } from './lease-heartbeat';
import type { ClaimedTaskRef, LeaseRenewal } from './store';
import { Alarm } from '../lifecycle/alarm';

export interface BatchedLease {
	leaseMs: number;
	/** `performance.now()` just before the write that last set the lease. */
	leaseSetAt: number;
	fenceMarginMs: number;
}

export interface BatchedLeaseRenewerHooks {
	onRenewalError?: (error: unknown) => void;
	/** One batch write finished: how many claims it carried and how long it took. */
	onBatch?: (size: number, durationMs: number) => void;
}

interface Entry extends BatchedLease {
	claim: ClaimedTaskRef;
	fence: Alarm;
	onRenewal: (result: LeaseRenewalResult) => void;
}

/**
 * Renews the leases of every claim one host keeps with one write per beat, instead
 * of one write per claim. Each claim keeps its own epoch fence and its own expiry
 * alarm, which reports `expired` `fenceMarginMs` before its lease runs out.
 */
export class BatchedLeaseRenewer {
	private readonly entries = new Map<string, Entry>();

	private readonly beatAlarm = new Alarm(() => performance.now());

	private stopped = false;

	private beating = false;

	constructor(
		private readonly host: string,
		private readonly renewLeases: (host: string, renewals: LeaseRenewal[]) => Promise<Set<string>>,
		private readonly hooks: BatchedLeaseRenewerHooks = {},
	) {}

	/** Start renewing `claim`. Returns the function that stops it. */
	add(
		claim: ClaimedTaskRef,
		lease: BatchedLease,
		onRenewal: (result: LeaseRenewalResult) => void,
	): () => void {
		const entry: Entry = {
			...lease,
			claim,
			fence: new Alarm(() => performance.now()),
			onRenewal,
		};
		this.entries.set(claim.id, entry);
		this.armFence(entry);
		if (!this.beatAlarm.isSet() && !this.beating) {
			this.scheduleBeat(performance.now());
		}
		return () => this.remove(claim.id, entry);
	}

	stop(): void {
		this.stopped = true;
		this.beatAlarm.cancel();
		for (const entry of this.entries.values()) entry.fence.cancel();
		this.entries.clear();
	}

	get size(): number {
		return this.entries.size;
	}

	private remove(id: string, entry: Entry): void {
		entry.fence.cancel();
		if (this.entries.get(id) === entry) this.entries.delete(id);
		if (this.entries.size === 0) this.beatAlarm.cancel();
	}

	private armFence(entry: Entry): void {
		entry.fence.set(entry.leaseSetAt + entry.leaseMs - entry.fenceMarginMs, () =>
			entry.onRenewal('expired'),
		);
	}

	private intervalMs(): number {
		let shortest = Number.POSITIVE_INFINITY;
		for (const entry of this.entries.values()) shortest = Math.min(shortest, entry.leaseMs);
		return Math.max(MIN_RENEWAL_INTERVAL_MS, Math.floor(shortest / (RENEWALS_PER_LEASE + 1)));
	}

	private scheduleBeat(from: number): void {
		if (this.stopped || this.entries.size === 0) return;
		this.beatAlarm.set(from + this.intervalMs(), () => {
			void this.beat();
		});
	}

	private async beat(): Promise<void> {
		const startedAt = performance.now();
		const batch = [...this.entries.values()];
		this.beating = true;
		try {
			const renewed = await this.renewLeases(
				this.host,
				batch.map((entry) => ({
					id: entry.claim.id,
					claimedEpoch: entry.claim.claimedEpoch,
					expiresInMs: entry.leaseMs,
				})),
			);
			this.hooks.onBatch?.(batch.length, performance.now() - startedAt);
			for (const entry of batch) {
				if (this.entries.get(entry.claim.id) !== entry) continue;
				if (renewed.has(entry.claim.id)) {
					entry.leaseSetAt = startedAt;
					this.armFence(entry);
					entry.onRenewal('renewed');
				} else {
					this.remove(entry.claim.id, entry);
					entry.onRenewal('lost');
				}
			}
		} catch (error) {
			this.hooks.onRenewalError?.(error);
		} finally {
			this.beating = false;
		}
		this.scheduleBeat(startedAt);
	}
}
