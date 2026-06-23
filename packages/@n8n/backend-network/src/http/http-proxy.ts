import http from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { LoggerProxy } from 'n8n-workflow';
import { getProxyForUrl } from 'proxy-from-env';

import { EnvProxyHttpAgent } from './env-proxy-http-agent';
import { EnvProxyHttpsAgent } from './env-proxy-https-agent';

/**
 * Resolves the proxy URL configured via environment variables
 * (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, etc.) for a given target URL.
 *
 * @param targetUrl - The target URL the request will be sent to.
 * @returns The proxy URL to use, or undefined if no proxy applies.
 */
export function resolveProxyUrl(targetUrl: string): string | undefined {
	return getProxyForUrl(targetUrl) || undefined;
}

export function createHttpProxyAgent(
	customProxyUrl: string | null = null,
	targetUrl: string,
	options?: http.AgentOptions,
): http.Agent {
	const proxyUrl = customProxyUrl ?? getProxyForUrl(targetUrl);

	if (proxyUrl) {
		return new HttpProxyAgent(proxyUrl, options);
	}

	return new http.Agent(options);
}

export function createHttpsProxyAgent(
	customProxyUrl: string | null = null,
	targetUrl: string,
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
	return Boolean(
		process.env.HTTP_PROXY ||
			process.env.http_proxy ||
			process.env.HTTPS_PROXY ||
			process.env.https_proxy ||
			process.env.ALL_PROXY ||
			process.env.all_proxy,
	);
}

export function installGlobalProxyAgent(): void {
	if (hasProxyEnvironmentVariables()) {
		LoggerProxy.debug('Installing global HTTP proxy agents', {
			HTTP_PROXY: process.env.HTTP_PROXY ?? process.env.http_proxy,
			HTTPS_PROXY: process.env.HTTPS_PROXY ?? process.env.https_proxy,
			NO_PROXY: process.env.NO_PROXY ?? process.env.no_proxy,
			ALL_PROXY: process.env.ALL_PROXY ?? process.env.all_proxy,
		});

		// Reuse the factory's env-proxy agents (no SSRF lookup at the global level;
		// per-request SSRF enforcement is applied by the outbound HTTP client).
		http.globalAgent = new EnvProxyHttpAgent();
		https.globalAgent = new EnvProxyHttpsAgent();
	}
}

export function uninstallGlobalProxyAgent(): void {
	http.globalAgent = new http.Agent();
	https.globalAgent = new https.Agent();
}
