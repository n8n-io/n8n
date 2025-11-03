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

	console.log('[httpProxyAgent] targetUrl:', targetUrl);
	console.log('[httpProxyAgent] proxyUrl:', proxyUrl);
	console.log('[httpProxyAgent] HTTP_PROXY:', process.env.HTTP_PROXY);
	console.log('[httpProxyAgent] HTTPS_PROXY:', process.env.HTTPS_PROXY);

	if (!proxyUrl) {
		console.log('[httpProxyAgent] No proxy URL found - returning undefined');
		return undefined;
	}

	console.log('[httpProxyAgent] Creating ProxyAgent with URL:', proxyUrl);
	return new ProxyAgent(proxyUrl);
}
