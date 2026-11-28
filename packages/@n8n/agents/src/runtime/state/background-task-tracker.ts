/** Observer → reflector → usage report is the longest chain today; this leaves headroom. */
const DEFAULT_DRAIN_ROUNDS = 10;

export class BackgroundTaskTracker {
	private inFlight = new Set<Promise<unknown>>();

	get pendingCount(): number {
		return this.inFlight.size;
	}

	track(promise: Promise<unknown>): void {
		this.inFlight.add(promise);
		const cleanup = () => {
			this.inFlight.delete(promise);
		};
		void promise.then(cleanup, cleanup);
	}

	async flush(): Promise<void> {
		if (this.inFlight.size === 0) return;
		const snapshot = Array.from(this.inFlight);
		await Promise.allSettled(snapshot);
	}

	/**
	 * Like `flush`, but also waits for tasks tracked while it waits, for up to
	 * `maxRounds` flushes, so a task that always schedules another cannot keep
	 * a caller waiting forever. True when nothing is left in flight.
	 */
	async drain({ maxRounds = DEFAULT_DRAIN_ROUNDS }: { maxRounds?: number } = {}): Promise<boolean> {
		for (let round = 0; round < maxRounds && this.inFlight.size > 0; round++) await this.flush();
		return this.inFlight.size === 0;
	}
}
