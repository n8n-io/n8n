/** Runs one call at a time. Calls during a run share the next run, so each caller waits for a run that starts after its call. */
export function latestWins(fn: () => Promise<void>): () => Promise<void> {
	let queue: Promise<void> = Promise.resolve();
	let next: Promise<void> | null = null;

	return async () => {
		next ??= queue.then(async () => {
			next = null;
			await fn();
		});

		const run = next;
		queue = run.catch(() => {});

		await run;
	};
}
