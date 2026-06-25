// Pull-based lane allocator. Each lane caps at `maxConcurrentBuilds` and never
// runs the same key twice concurrently — pairing those rules eliminates the
// same-key concentration that breaks the agent under load.

export interface AllocatableLane {
	activeBuilds: number;
	inflightKeys: Set<string>;
}

interface Waiter<L> {
	key: string;
	resolve: (lane: L) => void;
}

export class LaneAllocator<L extends AllocatableLane> {
	private readonly waiters: Array<Waiter<L>> = [];

	constructor(
		private readonly lanes: L[],
		private readonly maxConcurrentBuilds: number,
	) {}

	async acquire(key: string): Promise<L> {
		const lane = this.findFree(key);
		if (lane) {
			this.markBusy(lane, key);
			return lane;
		}
		return await new Promise<L>((resolve) => {
			this.waiters.push({ key, resolve });
		});
	}

	release(lane: L, key: string): void {
		lane.activeBuilds--;
		lane.inflightKeys.delete(key);
		this.wakeNext(lane);
	}

	private findFree(key: string): L | undefined {
		// Least-loaded policy: spread builds evenly across lanes rather than
		// filling lane 0 to cap before touching lane 1. Avoids hot-spotting.
		let best: L | undefined;
		for (const lane of this.lanes) {
			if (!this.canRun(lane, key)) continue;
			if (best === undefined || lane.activeBuilds < best.activeBuilds) best = lane;
		}
		return best;
	}

	private canRun(lane: L, key: string): boolean {
		return lane.activeBuilds < this.maxConcurrentBuilds && !lane.inflightKeys.has(key);
	}

	private markBusy(lane: L, key: string): void {
		lane.activeBuilds++;
		lane.inflightKeys.add(key);
	}

	private wakeNext(lane: L): void {
		// Wake the first waiter this lane can now serve. FIFO ordering.
		for (let i = 0; i < this.waiters.length; i++) {
			const w = this.waiters[i];
			if (this.canRun(lane, w.key)) {
				this.waiters.splice(i, 1);
				this.markBusy(lane, w.key);
				w.resolve(lane);
				return;
			}
		}
	}
}
