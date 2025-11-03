import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';
import { ProxyAgent } from 'undici';

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

/**
 * Returns a Node.js HTTP/HTTPS proxy agent for use with AWS SDK v3 clients.
 * AWS SDK v3 requires Node.js http.Agent/https.Agent instances (not undici ProxyAgent).
 *
 * @param targetUrl - The target URL to check proxy configuration for
 * @returns HttpsProxyAgent instance or undefined if no proxy is configured
 */
export function getNodeProxyAgent(targetUrl?: string) {
	const proxyUrl = proxyFromEnv.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');

	if (!proxyUrl) {
		return undefined;
	}

	// AWS SDK v3 needs Node.js http.Agent/https.Agent, not undici ProxyAgent
	return new HttpsProxyAgent(proxyUrl);
}
