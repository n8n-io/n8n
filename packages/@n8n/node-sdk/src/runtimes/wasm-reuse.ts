import { UnexpectedError, UserError } from 'n8n-workflow';

import {
	wasmSidecarRuntime,
	type Connection,
	type GuestRuntime,
	type GuestSession,
	type WasmSidecarOptions,
} from '../sandbox';

/**
 * The longest delay of `setTimeout`. A reused sidecar outlives its sessions, so each session runs
 * its own wall clock.
 */
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * The most sidecars that wait, over all keys. A waiting sidecar keeps about 24 MB of memory, so 8
 * keep the idle memory near 200 MB.
 */
const MAX_IDLE = 8;

/** The most sidecars that wait for one key, so a burst of one bundle leaves room for others. */
const MAX_IDLE_PER_KEY = 4;

/** A sidecar that no session takes in this time stops, so a bundle that ran once frees it. */
const IDLE_MS = 30_000;

/**
 * A sidecar stops after this many sessions. This frees the memory that the process does not give
 * back, and keeps the life of the sidecar far below its own wall clock of `MAX_TIMER_MS`.
 */
const MAX_RUNS = 100;

/** Sessions with the same key start the sidecar with the same arguments. */
const keyOf = ({ kind, manifest, bundleFile, grants, limits, cacheDir }: GuestSession) =>
	JSON.stringify([
		kind,
		manifest.bundleHash,
		manifest.nodeContract,
		bundleFile,
		cacheDir,
		[...grants].sort(),
		Object.entries(limits).sort(([a], [b]) => a.localeCompare(b)),
	]);

/**
 * One session on a reused sidecar. `close()` gives the sidecar back with a `[reset]` on its way, or
 * kills it when the session failed or a request still waits.
 */
function sessionOf(
	sidecar: Connection,
	{ limits, manifest }: GuestSession,
	release: (reset: Promise<Connection>) => void,
): Connection {
	const state = { pending: 0, closed: false };
	const failure = new Map<'error', Error>();
	const timers = new Map<'wall', NodeJS.Timeout>();
	const stops = new Set<() => boolean>();
	return {
		async request(method, params) {
			if (!timers.has('wall')) {
				timers.set(
					'wall',
					setTimeout(() => {
						failure.set(
							'error',
							new UserError(`${manifest.id} ran longer than ${limits.wallMs} ms and was stopped`),
						);
						sidecar.close();
					}, limits.wallMs),
				);
			}
			const known = failure.get('error');
			if (known) throw known;
			state.pending += 1;
			try {
				return await sidecar.request(method, params);
			} catch (error) {
				throw failure.get('error') ?? error;
			} finally {
				state.pending -= 1;
			}
		},
		notify(method, params) {
			if (!state.closed) sidecar.notify(method, params);
		},
		serve(calls) {
			const stop = sidecar.serve(calls);
			stops.add(stop);
			return () => stops.delete(stop) && stop();
		},
		trace(recorder) {
			const stop = sidecar.trace?.(recorder) ?? (() => false);
			stops.add(stop);
			return () => stops.delete(stop) && stop();
		},
		close() {
			if (state.closed) return;
			state.closed = true;
			clearTimeout(timers.get('wall'));
			stops.forEach((stop) => stop());
			if (failure.has('error') || state.pending > 0) {
				sidecar.close();
				return;
			}
			failure.set('error', new UnexpectedError('The sandbox is closed'));
			release(
				sidecar.request('[reset]', {}).then(
					() => sidecar,
					(error: unknown) => {
						sidecar.close();
						throw error;
					},
				),
			);
		},
	};
}

interface Parked {
	/** The sidecar after its `[reset]`. */
	readonly sidecar: Promise<Connection>;
	/** The sessions that the sidecar served. */
	readonly runs: number;
	readonly timer: NodeJS.Timeout;
}

const stop = (sidecar: Promise<Connection>) => {
	void sidecar.then(
		(connection) => connection.close(),
		() => undefined,
	);
};

/**
 * Like `wasmSidecarRuntime`, but a closed session gives its sidecar back for the next session with
 * the same key. `[reset]` drops the component instance, so the next `[initialize]` gets a fresh
 * one with a new CPU budget, memory limit and handle tables, and no state of the bundle.
 * At most 8 sidecars wait (4 for one key), each for at most 30 s and 100 sessions. When 8 wait,
 * the key that was used longest ago gives up a sidecar. `close()` stops the sidecars that wait.
 */
export function wasmReuseRuntime(options: WasmSidecarOptions): GuestRuntime & {
	/** Stops the sidecars that wait. */
	close(): void;
} {
	const spawner = wasmSidecarRuntime(options);
	// The keys in the order of their last use. A parked sidecar waits for its `[reset]`, so the next
	// session can take it at once.
	const idle = new Map<string, Parked[]>();
	const state = { closed: false };
	const unpark = (key: string, parked: Parked) => {
		clearTimeout(parked.timer);
		const rest = (idle.get(key) ?? []).filter((each) => each !== parked);
		if (rest.length > 0) idle.set(key, rest);
		else idle.delete(key);
	};
	const evictOldest = () => {
		const [key, [oldest] = []] = [...idle][0] ?? [];
		if (key === undefined || !oldest) return;
		unpark(key, oldest);
		stop(oldest.sidecar);
	};
	const park = (key: string, sidecar: Promise<Connection>, runs: number) => {
		// A failed reset is no error of any session: `start()` then spawns a new sidecar.
		void sidecar.catch(() => undefined);
		if (state.closed || runs >= MAX_RUNS || (idle.get(key)?.length ?? 0) >= MAX_IDLE_PER_KEY) {
			stop(sidecar);
			return;
		}
		if ([...idle.values()].reduce((sum, each) => sum + each.length, 0) >= MAX_IDLE) evictOldest();
		const parked: Parked = {
			sidecar,
			runs,
			timer: setTimeout(() => {
				unpark(key, parked);
				stop(sidecar);
			}, IDLE_MS).unref(),
		};
		idle.set(key, [...(idle.get(key) ?? []), parked]);
	};
	return {
		name: 'wasm-reuse',
		...(spawner.compiled && { compiled: spawner.compiled }),
		async start(session) {
			const key = keyOf(session);
			const parked = idle.get(key)?.at(-1);
			if (parked) unpark(key, parked);
			const rest = idle.get(key);
			idle.delete(key);
			if (rest) idle.set(key, rest);
			const reused = await parked?.sidecar.catch(() => undefined);
			const runs = reused && parked ? parked.runs : 0;
			const sidecar =
				reused ??
				(await spawner.start({ ...session, limits: { ...session.limits, wallMs: MAX_TIMER_MS } }));
			return sessionOf(sidecar, session, (reset) => park(key, reset, runs + 1));
		},
		close() {
			state.closed = true;
			idle.forEach((each) =>
				each.forEach(({ sidecar, timer }) => {
					clearTimeout(timer);
					stop(sidecar);
				}),
			);
			idle.clear();
		},
	};
}
