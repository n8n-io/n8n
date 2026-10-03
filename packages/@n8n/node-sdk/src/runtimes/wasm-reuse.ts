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

/**
 * Like `wasmSidecarRuntime`, but a closed session gives its sidecar back for the next session with
 * the same key. `[reset]` drops the component instance, so the next `[initialize]` gets a fresh
 * one with a new CPU budget, memory limit and handle tables, and no state of the bundle.
 * `close()` stops the sidecars that wait.
 */
export function wasmReuseRuntime(options: WasmSidecarOptions): GuestRuntime & {
	/** Stops the sidecars that wait. */
	close(): void;
} {
	const spawner = wasmSidecarRuntime(options);
	// A parked sidecar waits for its `[reset]`, so the next session can take it at once.
	const idle = new Map<string, Array<Promise<Connection>>>();
	const state = { closed: false };
	const stop = (parked: Promise<Connection>) => {
		void parked.then(
			(sidecar) => sidecar.close(),
			() => undefined,
		);
	};
	const park = (key: string, parked: Promise<Connection>) => {
		// A failed reset is no error of any session: `start()` then spawns a new sidecar.
		void parked.catch(() => undefined);
		if (state.closed) stop(parked);
		else idle.set(key, [...(idle.get(key) ?? []), parked]);
	};
	return {
		name: 'wasm-reuse',
		...(spawner.compiled && { compiled: spawner.compiled }),
		async start(session) {
			const key = keyOf(session);
			const reused = await idle
				.get(key)
				?.pop()
				?.catch(() => undefined);
			const sidecar =
				reused ??
				(await spawner.start({ ...session, limits: { ...session.limits, wallMs: MAX_TIMER_MS } }));
			return sessionOf(sidecar, session, (parked) => park(key, parked));
		},
		close() {
			state.closed = true;
			idle.forEach((parked) => parked.forEach(stop));
			idle.clear();
		},
	};
}
