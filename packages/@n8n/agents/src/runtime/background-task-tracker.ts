/**
 * Tracks fire-and-forget promises so the runtime can `await` them on
 * disposal. Without this, background work like title generation or
 * (future) observer cycles would either leak across runtime instances
 * or force tests to scatter `await new Promise(setImmediate)` to settle
 * unhandled rejections and pending writes.
 *
 * Tracked promises are not awaited eagerly — `track` returns the same
 * promise it received, so call sites that need to `await` for `sync`
 * behaviour can do so without involving the tracker. The tracker only
 * matters for the *unawaited* dispatch path.
 */
export class BackgroundTaskTracker {
	private inFlight = new Set<Promise<unknown>>();

	/** Number of promises currently in flight. */
	get pendingCount(): number {
		return this.inFlight.size;
	}

	/** Register a promise so `flush()` will wait for it. */
	track(promise: Promise<unknown>): void {
		this.inFlight.add(promise);
		const cleanup = () => {
			this.inFlight.delete(promise);
		};
		// `then(cleanup, cleanup)` handles both branches in one chain, so the
		// new promise we return to nobody is fully settled (no unhandled-
		// rejection warning even when `promise` rejects). `.finally` would
		// re-propagate the rejection on the chained promise.
		void promise.then(cleanup, cleanup);
	}

	/**
	 * Wait for all currently-tracked promises to settle. Errors are
	 * swallowed (`Promise.allSettled`); the caller's task at this point
	 * is to guarantee that disposal can complete, not to surface
	 * background failures.
	 */
	async flush(): Promise<void> {
		if (this.inFlight.size === 0) return;
		const snapshot = Array.from(this.inFlight);
		await Promise.allSettled(snapshot);
	}
}
