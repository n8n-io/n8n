import { isLazyProxy, getProxyPath } from './lazy-proxy';
import { prepareForTransfer } from '../shared/serialize';

/**
 * Isolate-side prepareForTransfer with proxy detection.
 *
 * Always returns a sentinel wrapper so the host can distinguish between:
 * - ProxyResultSentinel: resolve the path from host-side data (zero crossings)
 * - DataResultSentinel: use the serialized value directly
 *
 * This makes sentinel forgery impossible — user code returning a fake
 * { __isProxyResult: true, __path: [...] } gets wrapped in a DataResultSentinel,
 * so the host treats it as data, not a proxy path.
 */
export function __prepareForTransfer(value: unknown): unknown {
	if (value !== null && value !== undefined && typeof value === 'object') {
		if (isLazyProxy(value)) {
			const path = getProxyPath(value);
			if (path) return { __isProxyResult: true, __path: path };
		}
	}
	return { __isDataResult: true, __value: prepareForTransfer(value) };
}
