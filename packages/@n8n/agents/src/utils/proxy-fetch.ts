import type * as Undici from 'undici';

/**
 * Env-proxy `fetch` fallback for callers that do not inject a `fetch`.
 *
 * `@n8n/agents` is a standalone SDK and deliberately does not depend on `@n8n/backend-network`,
 * so it cannot build the backend's centrally-guarded transport itself. Inside the n8n backend,
 * inject cli's `createAiProxyFetch` where possible.
 */
export function getProxyFetch(): typeof globalThis.fetch | undefined {
	const { HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy } = process.env;
	if (!HTTPS_PROXY && !https_proxy && !HTTP_PROXY && !http_proxy) return undefined;

	// eslint-disable-next-line n8n-local-rules/no-uncentralized-http, @typescript-eslint/no-require-imports -- standalone SDK cannot depend on @n8n/backend-network (see doc comment above). To drop this: make `fetch` a required arg of every caller and delete the fallback
	const { EnvHttpProxyAgent } = require('undici') as typeof Undici;
	// Picks the proxy per target scheme and honors NO_PROXY. Plain HTTP goes to an HTTP proxy
	// without CONNECT, because some proxies allow CONNECT only to port 443.
	const dispatcher = new EnvHttpProxyAgent({ proxyTunnel: false });
	return async (url, init) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		});
}
