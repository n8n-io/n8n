/* eslint-disable n8n-local-rules/no-uncentralized-http -- package pins undici v6 (langchain providers); its dispatchers are not interoperable with the factory's v7 transport. To migrate: once langchain drops its undici v6 pin and this package moves to v7, replace getProxyAgent with @n8n/backend-network's transport */
import proxyFromEnv from 'proxy-from-env';
import { ProxyAgent } from 'undici';
/* eslint-enable n8n-local-rules/no-uncentralized-http */

/**
 * Returns a ProxyAgent or undefined based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 */
export function getProxyAgent(targetUrl?: string) {
	// There are cases where we don't know the target URL in advance (e.g. when we need to provide a proxy agent to ChatAwsBedrock)
	// In such case we use a dummy URL.
	// This will lead to `NO_PROXY` environment variable not being respected, but it is better than not having a proxy agent at all.
	const proxyUrl = proxyFromEnv.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');

	if (!proxyUrl) {
		return undefined;
	}

	return new ProxyAgent(proxyUrl);
}
