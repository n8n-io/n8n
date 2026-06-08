import { RUDDERSTACK_CDN_ORIGIN } from './constants';
import type { RudderStack } from './rudderstack-types';

const RUDDERSTACK_METHODS = [
	'load',
	'page',
	'track',
	'identify',
	'alias',
	'group',
	'ready',
	'reset',
	'getAnonymousId',
	'setAnonymousId',
];

export type LoadRudderStackOptions = {
	/** RudderStack write key. */
	writeKey: string;
	/** RudderStack data plane URL (typically the n8n proxy endpoint). */
	dataPlaneUrl: string;
	/** Options forwarded to RudderStack's `load(...)` call (configUrl, integrations, etc.). */
	options?: object;
	/** Override the CDN the v1 SDK script is fetched from. Defaults to {@link RUDDERSTACK_CDN_ORIGIN}. */
	cdnOrigin?: string;
};

/**
 * Install the RudderStack v1 browser-SDK stub on `window.rudderanalytics` and
 * inject the script tag that loads the real SDK. The stub buffers calls until
 * the script finishes loading, at which point the SDK replaces the stub and
 * drains the queue.
 *
 * Calling this when `window.rudderanalytics` is already populated is safe: the
 * existing buffer is reused, the methods are re-bound (idempotent), and the
 * script tag is inserted again — callers that need single-load semantics
 * should gate this call themselves.
 */
export function loadRudderStack({
	writeKey,
	dataPlaneUrl,
	options,
	cdnOrigin = RUDDERSTACK_CDN_ORIGIN,
}: LoadRudderStackOptions): RudderStack {
	const stub = (window.rudderanalytics ?? []) as RudderStack;
	window.rudderanalytics = stub;

	stub.methods = RUDDERSTACK_METHODS;

	stub.factory =
		(method: string) =>
		(...args: unknown[]) => {
			stub.push([method, ...args]);
			return stub;
		};

	for (const method of stub.methods) {
		stub[method] = stub.factory(method);
	}

	stub.loadJS = () => {
		const script = document.createElement('script');
		script.type = 'text/javascript';
		script.async = true;
		script.src = `${cdnOrigin}/v1/ra.min.js`;

		const first = document.getElementsByTagName('script')[0];
		if (first?.parentNode) {
			first.parentNode.insertBefore(script, first);
		} else {
			document.head.appendChild(script);
		}
	};

	stub.loadJS();
	stub.load(writeKey, dataPlaneUrl, options);

	return stub;
}
