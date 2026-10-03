import type { Connection, GuestRuntime, GuestSession } from '../sandbox';

/** The size of `pooledRuntime`. */
export interface PoolOptions {
	/** The most started connections that wait for one session key. */
	readonly size: number;
}

/** Sessions with the same key start the same guest, so a prestarted connection fits all of them. */
const keyOf = ({ kind, manifest, grants, limits, bundleFile, cacheDir }: GuestSession) =>
	JSON.stringify([
		kind,
		manifest.bundleHash,
		// A prestarted guest reads these paths, so a session with other paths needs another guest.
		bundleFile,
		cacheDir,
		[...grants].sort(),
		Object.entries(limits).sort(([a], [b]) => a.localeCompare(b)),
	]);

/**
 * Keeps up to `size` connections of `inner` started per session key. `start()` hands out one and
 * starts the next one in the background. A connection serves one session only, so no state goes
 * from one node execution to the next. `close()` closes the connections that wait.
 */
export function pooledRuntime(
	inner: GuestRuntime,
	{ size }: PoolOptions,
): GuestRuntime & {
	/** Closes the connections that wait. */
	close(): void;
} {
	const idle = new Map<string, Set<Promise<Connection>>>();
	const state = { closed: false };

	const refill = (key: string, session: GuestSession) => {
		const waiting = idle.get(key) ?? new Set<Promise<Connection>>();
		idle.set(key, waiting);
		while (!state.closed && waiting.size < size) {
			const started = inner.start(session);
			waiting.add(started);
			// A failed prestart leaves the pool, so the next start() takes another or starts directly.
			void started.catch(() => waiting.delete(started));
		}
	};

	return {
		name: `${inner.name}-pool`,
		async start(session) {
			const key = keyOf(session);
			const waiting = idle.get(key);
			const [next] = waiting ?? [];
			if (next !== undefined) waiting?.delete(next);
			const connection =
				next !== undefined
					? next.catch(async () => await inner.start(session))
					: inner.start(session);
			refill(key, session);
			return await connection;
		},
		close() {
			state.closed = true;
			idle.forEach((waiting) =>
				waiting.forEach((started) => {
					void started.then(
						(connection) => connection.close(),
						() => undefined,
					);
				}),
			);
			idle.clear();
		},
	};
}
