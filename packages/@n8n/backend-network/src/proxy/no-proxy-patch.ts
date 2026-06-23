/**
 * Reference-counted patching of `NO_PROXY` so given hosts bypass any configured
 * proxy for the duration of the returned restore closure.
 *
 * `process.env` is process-global and shared across overlapping callers, so the
 * ref-count and the captured original value live on `globalThis` (via a
 * `Symbol.for` registry key) rather than in module scope. This keeps a single
 * shared counter even when this package is loaded as more than one module
 * instance (src + dist), mirroring the global-registry marker in
 * `client-request-error.ts`.
 */

interface NoProxyPatchState {
	activeCount: number;
	originalValue: string | undefined;
	hadOriginal: boolean;
}

const STATE_KEY = Symbol.for('n8n.backend-network.no-proxy-patch');

function getState(): NoProxyPatchState {
	const store = globalThis as unknown as Record<symbol, NoProxyPatchState | undefined>;
	return (store[STATE_KEY] ??= { activeCount: 0, originalValue: undefined, hadOriginal: false });
}

/**
 * Ensures every host in `hosts` is present in `NO_PROXY` until the returned
 * closure is called. Reference-counted: overlapping callers share one patch and
 * `NO_PROXY` reverts to its original value only once the last caller restores.
 * The returned closure is idempotent.
 */
export function ensureHostsBypassProxy(hosts: string[]): () => void {
	const state = getState();

	if (state.activeCount === 0) {
		state.hadOriginal = Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY');
		state.originalValue = process.env.NO_PROXY;
		applyPatch(hosts, state.originalValue);
	}
	state.activeCount++;

	let restored = false;
	return () => {
		if (restored) return;
		restored = true;
		state.activeCount--;
		if (state.activeCount === 0) {
			if (!state.hadOriginal) {
				delete process.env.NO_PROXY;
			} else {
				process.env.NO_PROXY = state.originalValue;
			}
			state.originalValue = undefined;
			state.hadOriginal = false;
		}
	};
}

function applyPatch(hosts: string[], previous: string | undefined): void {
	const required = hosts.join(',');
	if (previous === undefined || previous.length === 0) {
		process.env.NO_PROXY = required;
		return;
	}
	const entries = previous.split(',').map((entry) => entry.trim());
	const allPresent = hosts.every((host) => entries.includes(host));
	if (!allPresent) {
		process.env.NO_PROXY = `${required},${previous}`;
	}
}
