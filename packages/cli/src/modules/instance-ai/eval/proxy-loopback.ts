/**
 * Workaround for the M0 finding: when `HTTP_PROXY` is set and `NO_PROXY` does
 * not include `127.0.0.1`/`localhost`, n8n's `getProxyAgent` routes loopback
 * traffic through the configured proxy. The eval wire server lives on
 * `127.0.0.1:<port>`, so vendor SDK calls would never reach it.
 *
 * `patchNoProxyForLoopback()` prepends the loopback entries to `NO_PROXY`
 * (preserving anything the operator already configured) and returns a restore
 * closure that resets the env var to its prior value — including the case
 * where it was undefined to begin with. Call the closure inside `finally` so
 * the patch never outlives the eval execution that needed it.
 *
 * The patch is **reference-counted**. `process.env` is shared process-wide,
 * so overlapping eval executions would otherwise stomp on each other: eval A
 * snapshots, eval B sees A's patched state, A restores → B's loopback
 * exemption vanishes mid-flight. The counter keeps the patch in place until
 * the last active restore closure fires. Each closure is idempotent.
 */

// Module-level state. The first concurrent caller snapshots the operator's
// original NO_PROXY value here; subsequent overlapping callers just increment
// the counter. When `activeCount` returns to zero the snapshot is restored
// and these fields reset.
let activeCount = 0;
let originalValue: string | undefined;
let hadOriginal = false;

export function patchNoProxyForLoopback(): () => void {
	if (activeCount === 0) {
		hadOriginal = Object.prototype.hasOwnProperty.call(process.env, 'NO_PROXY');
		originalValue = process.env.NO_PROXY;
		applyLoopbackPatch(originalValue);
	}
	activeCount++;

	let restored = false;
	return () => {
		if (restored) return;
		restored = true;
		activeCount--;
		if (activeCount === 0) {
			if (!hadOriginal) {
				delete process.env.NO_PROXY;
			} else {
				process.env.NO_PROXY = originalValue;
			}
			originalValue = undefined;
			hadOriginal = false;
		}
	};
}

function applyLoopbackPatch(previous: string | undefined): void {
	const loopback = '127.0.0.1,localhost';
	if (previous === undefined || previous.length === 0) {
		process.env.NO_PROXY = loopback;
		return;
	}
	const entries = previous.split(',').map((s) => s.trim());
	const alreadyPresent = entries.includes('127.0.0.1') && entries.includes('localhost');
	if (!alreadyPresent) {
		process.env.NO_PROXY = `${loopback},${previous}`;
	}
}
