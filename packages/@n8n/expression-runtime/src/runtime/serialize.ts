import { isLazyProxy, getProxyPath } from './lazy-proxy';
import { prepareForTransfer } from '../shared/serialize';

/**
 * Isolate-side prepareForTransfer with proxy detection.
 *
 * If the value is a lazy proxy, returns a ProxyResultSentinel with the
 * proxy's path instead of recursing into it (which would trigger thousands
 * of cross-bridge callbacks). The host detects the sentinel and resolves
 * the value from its in-memory data.
 *
 * For non-proxy values, delegates to the shared prepareForTransfer.
 */
export function __prepareForTransfer(value: unknown): unknown {
	if (value !== null && value !== undefined && typeof value === 'object') {
		if (isLazyProxy(value)) {
			const path = getProxyPath(value as object);
			if (path) return { __isProxyResult: true, __path: path };
		}
	}
	return prepareForTransfer(value);
}
