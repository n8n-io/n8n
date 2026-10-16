/** Reads started for a step before its message is handled, taken at most once. */
export class StepPrefetch<TReads> {
	private readonly pending = new Map<string, Promise<TReads>>();

	put(stepId: string, reads: Promise<TReads>): void {
		// A handler that returns before awaiting its reads must not crash the process.
		reads.catch(() => {});
		this.pending.set(stepId, reads);
	}

	take(stepId: string): Promise<TReads> | undefined {
		const reads = this.pending.get(stepId);
		this.pending.delete(stepId);
		return reads;
	}
}
