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
 */
export function patchNoProxyForLoopback(): () => void {
	const previous = process.env.NO_PROXY;
	const loopback = '127.0.0.1,localhost';

	if (previous === undefined || previous.length === 0) {
		process.env.NO_PROXY = loopback;
	} else {
		const entries = previous.split(',').map((s) => s.trim());
		const already = entries.includes('127.0.0.1') && entries.includes('localhost');
		if (!already) {
			process.env.NO_PROXY = `${loopback},${previous}`;
		}
	}

	return () => {
		if (previous === undefined) {
			delete process.env.NO_PROXY;
		} else {
			process.env.NO_PROXY = previous;
		}
	};
}
