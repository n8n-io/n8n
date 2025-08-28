import { HttpsProxyAgent } from 'https-proxy-agent';
import proxyFromEnv from 'proxy-from-env';
import { ProxyAgent } from 'undici';

/**
 * Returns the proxy URL for the given target URL based on environment variables.
 * When target URL is not provided, a dummy URL is used which means the NO_PROXY
 * environment variable will not be properly respected. There are cases where we
 * don't know the target URL in advance (e.g. when we need to provide a proxy agent
 * to ChatAwsBedrock), but it's better than not having a proxy agent at all.
 */
function getProxyUrl(targetUrl?: string): string | undefined {
	return proxyFromEnv.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');
}

/**
 * Returns a ProxyAgent for modern HTTP clients (fetch, undici) or undefined based on the environment variables and target URL.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 */
export function getProxyAgent(targetUrl?: string) {
	const proxyUrl = getProxyUrl(targetUrl);
	return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

/**
 * Returns an HttpsProxyAgent for Node.js HTTP clients or undefined based on the environment variables and target URL.
 * This is specifically for traditional Node.js HTTP clients like AWS SDK's NodeHttpHandler.
 * When target URL is not provided, NO_PROXY environment variable is not respected.
 */
export function getNodeProxyAgent(targetUrl?: string) {
	const proxyUrl = getProxyUrl(targetUrl);
	return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
}
