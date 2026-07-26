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
}
