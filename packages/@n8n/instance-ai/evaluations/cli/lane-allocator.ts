// Pull-based lane allocator. Each lane caps at `maxConcurrentBuilds` and never
// runs the same key twice concurrently — pairing those rules eliminates the
// same-key concentration that breaks the agent under load.
//
// Lanes additionally report build transport outcomes. A dead lane fails builds
// in milliseconds, so under the least-loaded policy it is permanently the
// emptiest lane and would swallow the entire remaining queue ("black hole").
// Consecutive transient failures therefore quarantine a lane, and a health
// probe re-admits it once its backend responds again (pairing with the
// containers' restart policy). If every lane stays quarantined past a grace
// period, pending and future acquires abort instead of hanging the run.

export interface AllocatableLane {
	activeBuilds: number;
	inflightKeys: Set<string>;
}

interface Waiter<L> {
	key: string;
	resolve: (lane: L) => void;
	reject: (error: Error) => void;
}

export interface LaneHealthOptions<L> {
	/** Resolves true when the lane's backend responds healthy again. */
	probe: (lane: L) => Promise<boolean>;
	/** Delay between health probes of a quarantined lane. */
	probeIntervalMs?: number;
	/** Consecutive transient build failures before a lane is quarantined. */
	quarantineThreshold?: number;
	/** How long ALL lanes may stay quarantined before acquires abort. */
	allQuarantinedGraceMs?: number;
	onQuarantine?: (lane: L) => void;
	onReadmit?: (lane: L) => void;
	onAllQuarantined?: () => void;
}

const DEFAULT_PROBE_INTERVAL_MS = 30_000;
const DEFAULT_QUARANTINE_THRESHOLD = 3;
const DEFAULT_ALL_QUARANTINED_GRACE_MS = 5 * 60_000;

export class LaneAllocator<L extends AllocatableLane> {
	private readonly waiters: Array<Waiter<L>> = [];

	private readonly consecutiveFailures = new Map<L, number>();

	private readonly quarantined = new Set<L>();

	private readonly lastQuarantinedAt = new Map<L, number>();

	private allQuarantinedTimer?: NodeJS.Timeout;

	private aborted?: Error;

	constructor(
		private readonly lanes: L[],
		private readonly maxConcurrentBuilds: number,
		private readonly health?: LaneHealthOptions<L>,
	) {}

	async acquire(key: string, opts?: { not?: L }): Promise<L> {
		if (this.aborted) throw this.aborted;
		// Prefer a lane other than `not` (e.g. retrying a build that just failed
		// there), but fall back to it rather than starving.
		const lane = this.findFree(key, opts?.not) ?? this.findFree(key);
		if (lane) {
			this.markBusy(lane, key);
			return lane;
		}
		return await new Promise<L>((resolve, reject) => {
			this.waiters.push({ key, resolve, reject });
		});
	}

	release(lane: L, key: string): void {
		lane.activeBuilds--;
		lane.inflightKeys.delete(key);
		this.wakeNext(lane);
	}

	/**
	 * Record whether a build's transport to the lane worked. A completed build —
	 * even one the agent failed — is 'ok'; only network-level failures count
	 * toward quarantine.
	 */
	reportBuildOutcome(lane: L, outcome: 'ok' | 'transient-failure'): void {
		if (outcome === 'ok') {
			this.consecutiveFailures.delete(lane);
			return;
		}
		const failures = (this.consecutiveFailures.get(lane) ?? 0) + 1;
		this.consecutiveFailures.set(lane, failures);
		const threshold = this.health?.quarantineThreshold ?? DEFAULT_QUARANTINE_THRESHOLD;
		if (failures >= threshold && !this.quarantined.has(lane)) this.quarantine(lane);
	}

	isQuarantined(lane: L): boolean {
		return this.quarantined.has(lane);
	}

	/**
	 * Whether the lane entered quarantine at or after `sinceMs`. Lets callers
	 * attribute a slow failure (e.g. a build timing out) to a lane death that
	 * happened mid-flight, even if the lane has since restarted and probes healthy.
	 */
	wasQuarantinedSince(lane: L, sinceMs: number): boolean {
		const at = this.lastQuarantinedAt.get(lane);
		return at !== undefined && at >= sinceMs;
	}

	private quarantine(lane: L): void {
		this.quarantined.add(lane);
		this.lastQuarantinedAt.set(lane, Date.now());
		this.health?.onQuarantine?.(lane);
		if (this.health?.probe) this.scheduleProbe(lane);
		if (this.quarantined.size === this.lanes.length) {
			this.health?.onAllQuarantined?.();
			const graceMs = this.health?.allQuarantinedGraceMs ?? DEFAULT_ALL_QUARANTINED_GRACE_MS;
			this.allQuarantinedTimer = setTimeout(() => {
				if (this.quarantined.size === this.lanes.length) {
					this.abort(
						new Error(
							`All ${String(this.lanes.length)} lanes quarantined for ${String(graceMs)}ms — no healthy backend to build on`,
						),
					);
				}
			}, graceMs);
			this.allQuarantinedTimer.unref?.();
		}
	}

	private scheduleProbe(lane: L): void {
		const intervalMs = this.health?.probeIntervalMs ?? DEFAULT_PROBE_INTERVAL_MS;
		const timer = setTimeout(() => {
			if (!this.quarantined.has(lane) || this.aborted) return;
			this.health
				?.probe(lane)
				.then((healthy) => {
					if (healthy) this.readmit(lane);
					else this.scheduleProbe(lane);
				})
				.catch(() => this.scheduleProbe(lane));
		}, intervalMs);
		timer.unref?.();
	}

	private readmit(lane: L): void {
		this.quarantined.delete(lane);
		this.consecutiveFailures.delete(lane);
		if (this.allQuarantinedTimer) {
			clearTimeout(this.allQuarantinedTimer);
			this.allQuarantinedTimer = undefined;
		}
		this.health?.onReadmit?.(lane);
		// A re-admitted lane is idle — wake every waiter it can serve.
		let woke = true;
		while (woke) woke = this.wakeNext(lane);
	}

	private abort(error: Error): void {
		this.aborted = error;
		for (const w of this.waiters.splice(0)) w.reject(error);
	}

	private findFree(key: string, not?: L): L | undefined {
		// Least-loaded policy: spread builds evenly across lanes rather than
		// filling lane 0 to cap before touching lane 1. Avoids hot-spotting.
		let best: L | undefined;
		for (const lane of this.lanes) {
			if (lane === not || !this.canRun(lane, key)) continue;
			if (best === undefined || lane.activeBuilds < best.activeBuilds) best = lane;
		}
		return best;
	}

	private canRun(lane: L, key: string): boolean {
		return (
			!this.quarantined.has(lane) &&
			lane.activeBuilds < this.maxConcurrentBuilds &&
			!lane.inflightKeys.has(key)
		);
	}

	private markBusy(lane: L, key: string): void {
		lane.activeBuilds++;
		lane.inflightKeys.add(key);
	}

	private wakeNext(lane: L): boolean {
		// Wake the first waiter this lane can now serve. FIFO ordering.
		for (let i = 0; i < this.waiters.length; i++) {
			const w = this.waiters[i];
			if (this.canRun(lane, w.key)) {
				this.waiters.splice(i, 1);
				this.markBusy(lane, w.key);
				w.resolve(lane);
				return true;
			}
		}
		return false;
	}
}
