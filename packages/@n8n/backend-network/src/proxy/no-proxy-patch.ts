/**
 * Reference-counted patching of the no-proxy environment so given hosts bypass
 * any configured proxy for the duration of the returned restore closure.
 *
 * `process.env` is process-global and shared across overlapping callers, so the
 * ref-count and the captured original values live on `globalThis` (via a
 * `Symbol.for` registry key) rather than in module scope.
 *
 * This keeps a single shared counter even when this package is loaded as more than one module
 * instance (src + dist), mirroring the global-registry marker in `client-request-error.ts`.
 */

interface CapturedEnv {
	had: boolean;
	value: string | undefined;
}

interface NoProxyPatchState {
	activeCount: number;
	upper: CapturedEnv;
	lower: CapturedEnv;
}

const STATE_KEY = Symbol.for('n8n.backend-network.no-proxy-patch');

function getState(): NoProxyPatchState {
	const store = globalThis as unknown as Record<symbol, NoProxyPatchState | undefined>;
	return (store[STATE_KEY] ??= {
		activeCount: 0,
		upper: { had: false, value: undefined },
		lower: { had: false, value: undefined },
	});
}

function capture(name: 'NO_PROXY' | 'no_proxy'): CapturedEnv {
	return {
		had: Object.prototype.hasOwnProperty.call(process.env, name),
		value: process.env[name],
	};
}

function restore(name: 'NO_PROXY' | 'no_proxy', captured: CapturedEnv): void {
	if (!captured.had) {
		delete process.env[name];
	} else {
		process.env[name] = captured.value;
	}
}

/**
 * The no-proxy value `proxy-from-env` would use: lowercase wins, then uppercase.
 * An empty value falls through (not nullish coalescing), matching the resolver.
 */
function effectiveNoProxy(): string {
	const lower = process.env.no_proxy;
	if (lower !== undefined && lower.length > 0) return lower;
	const upper = process.env.NO_PROXY;
	if (upper !== undefined && upper.length > 0) return upper;
	return '';
}

/**
 * Ensures every host in `hosts` is exempt from proxying (present in the no-proxy
 * env) until the returned closure is called. Reference-counted: overlapping
 * callers share one patch and the no-proxy env reverts to its original value
 * only once the last caller restores. The returned closure is idempotent.
 */
export function ensureHostsBypassProxy(hosts: string[]): () => void {
	const state = getState();

	if (state.activeCount === 0) {
		state.upper = capture('NO_PROXY');
		state.lower = capture('no_proxy');
	}
	applyPatch(hosts);
	state.activeCount++;

	let restored = false;
	return () => {
		if (restored) return;
		restored = true;
		state.activeCount--;
		if (state.activeCount === 0) {
			restore('NO_PROXY', state.upper);
			restore('no_proxy', state.lower);
			state.upper = { had: false, value: undefined };
			state.lower = { had: false, value: undefined };
		}
	};
}

function applyPatch(hosts: string[]): void {
	const previous = effectiveNoProxy();
	const entries = previous
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	const missing = hosts.filter((host) => !entries.includes(host));
	if (missing.length > 0) {
		const merged = previous.length > 0 ? `${missing.join(',')},${previous}` : missing.join(',');
		process.env.NO_PROXY = merged;
		process.env.no_proxy = merged;
	}
}
