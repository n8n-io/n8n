import type { Connection, GuestRuntime, GuestSession } from '../sandbox';

/** The size of `pooledRuntime`. */
export interface PoolOptions {
	/** The most started connections that wait for one session key. */
	readonly size: number;
}

/**
 * The most connections that wait, over all session keys. A waiting guest keeps a process or a
 * thread of about 25 MB, so 8 keep the idle memory near 200 MB.
 */
const MAX_IDLE = 8;

/**
 * A waiting connection that no session takes in this time closes. A bundle that runs again soon,
 * e.g. in a burst of executions, keeps its guest. A bundle that ran once frees it.
 */
const IDLE_MS = 30_000;

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

interface Waiting {
	readonly started: Promise<Connection>;
	readonly timer: NodeJS.Timeout;
}

const closeWaiting = ({ started, timer }: Waiting) => {
	clearTimeout(timer);
	void started.then(
		(connection) => connection.close(),
		() => undefined,
	);
};

/**
 * Keeps up to `size` connections of `inner` started per session key, and up to 8 over all keys.
 * `start()` hands out one and starts the next one in the background. A connection serves one
 * session only, so no state goes from one node execution to the next. A connection that waits
 * 30 s closes. When the pool is full, the key that was used longest ago gives up a connection.
 * `close()` closes the connections that wait.
 */
export function pooledRuntime(
	inner: GuestRuntime,
	{ size }: PoolOptions,
): GuestRuntime & {
	/** Closes the connections that wait. */
	close(): void;
} {
	// The keys in the order of their last use.
	const idle = new Map<string, Waiting[]>();
	const state = { closed: false };

	const remove = (key: string, waiting: Waiting) => {
		clearTimeout(waiting.timer);
		const rest = (idle.get(key) ?? []).filter((each) => each !== waiting);
		if (rest.length > 0) idle.set(key, rest);
		else idle.delete(key);
	};
	const total = () => [...idle.values()].reduce((sum, waiting) => sum + waiting.length, 0);
	/** Closes the oldest connection of the key that was used longest ago, if that is not `key`. */
	const evictFor = (key: string) => {
		const [other, [oldest] = []] = [...idle].find(([each]) => each !== key) ?? [];
		if (other === undefined || !oldest) return false;
		remove(other, oldest);
		closeWaiting(oldest);
		return true;
	};
	const prestart = (key: string, session: GuestSession) => {
		const started = inner.start(session);
		const waiting: Waiting = {
			started,
			timer: setTimeout(() => {
				remove(key, waiting);
				closeWaiting(waiting);
			}, IDLE_MS).unref(),
		};
		// A failed prestart leaves the pool, so the next start() takes another or starts directly.
		void started.catch(() => remove(key, waiting));
		idle.set(key, [...(idle.get(key) ?? []), waiting]);
	};
	const refill = (key: string, session: GuestSession) => {
		while (
			!state.closed &&
			(idle.get(key)?.length ?? 0) < size &&
			(total() < MAX_IDLE || evictFor(key))
		) {
			prestart(key, session);
		}
	};

	return {
		name: `${inner.name}-pool`,
		async start(session) {
			const key = keyOf(session);
			const [next] = idle.get(key) ?? [];
			if (next) remove(key, next);
			const rest = idle.get(key);
			idle.delete(key);
			if (rest) idle.set(key, rest);
			const connection = next
				? next.started.catch(async () => await inner.start(session))
				: inner.start(session);
			refill(key, session);
			return await connection;
		},
		close() {
			state.closed = true;
			idle.forEach((waiting) => waiting.forEach(closeWaiting));
			idle.clear();
		},
	};
}
