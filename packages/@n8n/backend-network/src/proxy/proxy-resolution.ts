import http from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';

/**
 * Resolves the proxy URL configured via environment variables
 * (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, etc.) for a given target URL.
 *
 * @param targetUrl - The target URL the request will be sent to. When absent
 *   (the caller does not know the target in advance, e.g. AWS Bedrock), pass a
 *   `fallbackUrl` to resolve against instead.
 * @param fallbackUrl - URL to resolve against when `targetUrl` is not provided.
 *   NOTE: resolving against a stand-in URL cannot honor `NO_PROXY` for the real
 *   target, so a host that should be excluded may still be proxied. Only use a
 *   fallback when no concrete target is available.
 * @returns The proxy URL to use, or undefined if no proxy applies.
 */
export function resolveProxyUrl(
	targetUrl: string | undefined,
	fallbackUrl?: string,
): string | undefined {
	return getProxyForUrl(targetUrl ?? fallbackUrl ?? '') || undefined;
}

/**
 * DI-free proxy resolution and Node proxy-agent factory.
 *
 * Kept free of DI / config / `n8n-workflow` so they can back the
 * `@n8n/backend-network/proxy` subpath: callers that only need env-proxy
 * resolution (or a Node `http(s).Agent`) can consume them without dragging the
 * full `OutboundHttp` service and its backend dependencies into their bundle.
 */
export function createHttpProxyAgent(
	targetUrl: string,
	customProxyUrl?: string | null,
	options?: http.AgentOptions,
): http.Agent {
	const proxyUrl = customProxyUrl ?? getProxyForUrl(targetUrl);

	if (proxyUrl) {
		return new HttpProxyAgent(proxyUrl, options);
	}

	return new http.Agent(options);
}

/**
 * DI-free proxy resolution and Node proxy-agent factory.
 *
 * Kept free of DI / config / `n8n-workflow` so they can back the
 * `@n8n/backend-network/proxy` subpath: callers that only need env-proxy
 * resolution (or a Node `http(s).Agent`) can consume them without dragging the
 * full `OutboundHttp` service and its backend dependencies into their bundle.
 */
export function createHttpsProxyAgent(
	targetUrl: string,
	customProxyUrl?: string | null,
	options?: https.AgentOptions,
): https.Agent {
	const proxyUrl = customProxyUrl ?? getProxyForUrl(targetUrl);

	if (proxyUrl) {
		return new HttpsProxyAgent(proxyUrl, options);
	}

	return new https.Agent(options);
}

/** Whether any standard proxy environment variable is set (non-empty). */
export function hasProxyEnvironmentVariables(): boolean {
	return [
		process.env.HTTP_PROXY,
		process.env.http_proxy,
		process.env.HTTPS_PROXY,
		process.env.https_proxy,
		process.env.ALL_PROXY,
		process.env.all_proxy,
	].some((value) => Boolean(value));
}
