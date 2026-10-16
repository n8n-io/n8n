/** Serialize work per key. A failed operation does not block later work. */
export async function runSerially<T>(
	pending: Map<string, Promise<unknown>>,
	key: string,
	work: () => Promise<T>,
): Promise<T> {
	const previous = pending.get(key) ?? Promise.resolve();
	const run = previous.catch(() => {}).then(work);
	pending.set(key, run);
	try {
		return await run;
	} finally {
		if (pending.get(key) === run) pending.delete(key);
	}
}
