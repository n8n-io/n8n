import type * as Undici from 'undici';

/**
 * Env-proxy `fetch` fallback for callers that do not pass a `fetch`.
 * Backend callers pass their configured transport (cli's `createAiProxyFetch`).
 */
export function getProxyFetch(): typeof globalThis.fetch | undefined {
	const { HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy } = process.env;
	if (!HTTPS_PROXY && !https_proxy && !HTTP_PROXY && !http_proxy) return undefined;

	// eslint-disable-next-line n8n-local-rules/no-uncentralized-http, @typescript-eslint/no-require-imports -- fallback for callers that pass no `fetch`. To drop this: make `fetch` a required arg and delete the fallback
	const { EnvHttpProxyAgent } = require('undici') as typeof Undici;
	// Picks the proxy per target scheme and honors NO_PROXY.
	const dispatcher = new EnvHttpProxyAgent();
	return async (url, init) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		});
}
