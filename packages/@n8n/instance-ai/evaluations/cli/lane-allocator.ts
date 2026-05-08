// Pull-based lane allocator. Each lane caps at `maxConcurrentBuilds` and never
// runs the same prompt twice concurrently — pairing those rules eliminates the
// same-prompt concentration that breaks the agent under load.

export interface AllocatableLane {
	activeBuilds: number;
	inflightPrompts: Set<string>;
}

interface Waiter<L> {
	prompt: string;
	resolve: (lane: L) => void;
}

export class LaneAllocator<L extends AllocatableLane> {
	private readonly waiters: Array<Waiter<L>> = [];

	constructor(
		private readonly lanes: L[],
		private readonly maxConcurrentBuilds: number,
	) {}

	async acquire(prompt: string): Promise<L> {
		const lane = this.findFree(prompt);
		if (lane) {
			this.markBusy(lane, prompt);
			return lane;
		}
		return await new Promise<L>((resolve) => {
			this.waiters.push({ prompt, resolve });
		});
	}

	release(lane: L, prompt: string): void {
		lane.activeBuilds--;
		lane.inflightPrompts.delete(prompt);
		this.wakeNext(lane);
	}

	private findFree(prompt: string): L | undefined {
		// Least-loaded policy: spread builds evenly across lanes rather than
		// filling lane 0 to cap before touching lane 1. Avoids hot-spotting.
		let best: L | undefined;
		for (const lane of this.lanes) {
			if (!this.canRun(lane, prompt)) continue;
			if (best === undefined || lane.activeBuilds < best.activeBuilds) best = lane;
		}
		return best;
	}

	private canRun(lane: L, prompt: string): boolean {
		return lane.activeBuilds < this.maxConcurrentBuilds && !lane.inflightPrompts.has(prompt);
	}

	private markBusy(lane: L, prompt: string): void {
		lane.activeBuilds++;
		lane.inflightPrompts.add(prompt);
	}

	private wakeNext(lane: L): void {
		// Wake the first waiter this lane can now serve. FIFO ordering.
		for (let i = 0; i < this.waiters.length; i++) {
			const w = this.waiters[i];
			if (this.canRun(lane, w.prompt)) {
				this.waiters.splice(i, 1);
				this.markBusy(lane, w.prompt);
				w.resolve(lane);
				return;
			}
		}
	}
}
