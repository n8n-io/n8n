import { ensureError } from '@n8n/utils/errors/ensure-error';

interface OutboxWorkerPoolOptions {
	/** A single worker's work: claim and process records until none remain. */
	runPass: () => Promise<void>;
	/** Whether the pool may (keep) spawning workers, checked before every spawn. */
	shouldRun: () => boolean;
	/** Maximum number of concurrent workers. */
	concurrency: number;
	/** The owner's error policy, invoked exactly once per failed pass, at the source. */
	onWorkerError: (error: Error) => void;
}

/**
 * A capped pool of independent, concurrent runs of `runPass`. Owns the pool
 * mechanics only: topping up to `concurrency` workers, containing each
 * pass's failure to its own slot, the follow-up pass for a wake-up that
 * arrives at capacity, and awaiting idleness. Everything domain-specific
 * belongs to the owner, injected via {@link OutboxWorkerPoolOptions}.
 */
export class WorkflowPublicationOutboxWorkerPool {
	/** Worker passes in flight. A worker never rejects (so `Promise.all` over
	 * the set is safe): it settles with the error that ended its pass, or
	 * `null` when the pass completed. */
	private readonly activeWorkers = new Set<Promise<Error | null>>();

	/** Set when a wake-up arrives while the pool is at capacity; a worker
	 * exiting then starts a follow-up pass, so a record committed after the
	 * running workers' final claims is still picked up promptly. */
	private wakeRequested = false;

	constructor(private readonly options: OutboxWorkerPoolOptions) {}

	/**
	 * Top the pool up to the configured concurrency, or flag a follow-up pass
	 * when already at capacity. Synchronous, so a caller (e.g. the poll loop)
	 * is never wedged by a stuck worker.
	 */
	topUp() {
		if (!this.options.shouldRun()) return;

		const { concurrency } = this.options;
		if (this.activeWorkers.size >= concurrency) {
			// The running workers' final claims may predate the record behind this
			// wake-up; have the next worker to exit run a follow-up pass.
			this.wakeRequested = true;
			return;
		}

		while (this.activeWorkers.size < concurrency) this.spawnWorker();
	}

	/** Resolves once the pool is idle, with one of the worker errors if any
	 * pass failed (which one is arbitrary; every failure is already handed to
	 * `onWorkerError` at the source). */
	async awaitIdle(): Promise<Error | null> {
		let error: Error | null = null;
		// Loop: a follow-up pass (see `wakeRequested`) can repopulate the pool
		// after the currently observed workers settle.
		while (this.activeWorkers.size > 0) {
			const outcomes = await Promise.all([...this.activeWorkers]);
			error ??= outcomes.find((outcome) => outcome !== null) ?? null;
		}
		return error;
	}

	private spawnWorker() {
		const worker = this.options
			.runPass()
			.then(
				() => null,
				(error) => {
					const failure = ensureError(error);
					this.options.onWorkerError(failure);
					return failure;
				},
			)
			.finally(() => {
				this.activeWorkers.delete(worker);
				if (this.wakeRequested) {
					this.wakeRequested = false;
					if (this.options.shouldRun()) this.spawnWorker();
				}
			});
		this.activeWorkers.add(worker);
	}
}
