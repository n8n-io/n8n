import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';
import { ProxyAgent } from 'undici';

/**
 * Resolves the proxy URL from environment variables for a given target URL.
 *
 * @param targetUrl - The target URL to check proxy configuration for (optional)
 * @returns The proxy URL string or undefined if no proxy is configured
 *
 * @remarks
 * There are cases where we don't know the target URL in advance (e.g. when we need to provide a proxy agent to ChatAwsBedrock).
 * In such case we use a dummy URL.
 * This will lead to `NO_PROXY` environment variable not being respected, but it is better than not having a proxy agent at all.
 */
function getProxyUrlFromEnv(targetUrl?: string): string {
	return proxyFromEnv.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');
}

/**
 * Returns a ProxyAgent or undefined based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 */
export function getProxyAgent(targetUrl?: string) {
	const proxyUrl = getProxyUrlFromEnv(targetUrl);

	if (!proxyUrl) {
		return undefined;
	}

	return new ProxyAgent(proxyUrl);
}

/**
 * Returns a Node.js HTTP/HTTPS proxy agent for use with AWS SDK v3 clients.
 * AWS SDK v3 requires Node.js http.Agent/https.Agent instances (not undici ProxyAgent).
 *
 * @param targetUrl - The target URL to check proxy configuration for
 * @returns HttpsProxyAgent instance or undefined if no proxy is configured
 */
export function getNodeProxyAgent(targetUrl?: string) {
	const proxyUrl = getProxyUrlFromEnv(targetUrl);

	if (!proxyUrl) {
		return undefined;
	}

	return new HttpsProxyAgent(proxyUrl);
}
