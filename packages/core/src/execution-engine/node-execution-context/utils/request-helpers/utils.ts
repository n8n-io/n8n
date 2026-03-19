import type { AxiosRequestConfig } from 'axios';
import { type AgentOptions } from 'https';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { SsrfBridge } from '@/execution-engine';
import { createHttpProxyAgent, createHttpsProxyAgent } from '@/http-proxy';

/** Attempts to parse a string as a URL. Returns the parsed `URL` or `null` on failure. */
export function tryParseUrl(url: string): URL | null {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

/** Converts an `IHttpRequestOptions['proxy']` (object or string) into a proxy URL string. */
export function getUrlFromProxyConfig(
	proxyConfig: IHttpRequestOptions['proxy'] | string,
): string | null {
	if (typeof proxyConfig === 'string') {
		const isValidUrl = !!tryParseUrl(proxyConfig);
		return isValidUrl ? proxyConfig : null;
	}

	if (!proxyConfig?.host) return null;

	const { protocol, host, port, auth } = proxyConfig;
	const safeProtocol = protocol?.endsWith(':') ? protocol.slice(0, -1) : (protocol ?? 'http');

	try {
		const url = new URL(`${safeProtocol}://${host}`);
		if (port !== undefined) url.port = String(port);
		if (auth?.username) {
			url.username = auth.username;
			url.password = auth.password ?? '';
		}
		return url.href;
	} catch {
		return null;
	}
}

/** Resolves `url` against an optional `baseURL`, returning the absolute href. */
export function buildTargetUrl(url?: string, baseURL?: string): string | undefined {
	if (!url) return undefined;

	try {
		return baseURL ? new URL(url, baseURL).href : url;
	} catch {
		return undefined;
	}
}

/** Sets `httpAgent` and `httpsAgent` on an axios config, respecting proxy and SSRF settings. */
export function setAxiosAgents(
	config: AxiosRequestConfig,
	agentOptions?: AgentOptions,
	proxyConfig?: IHttpRequestOptions['proxy'] | string,
	secureLookup?: ReturnType<SsrfBridge['createSecureLookup']>,
): void {
	if (config.httpAgent || config.httpsAgent) return;

	const customProxyUrl = getUrlFromProxyConfig(proxyConfig);

	const targetUrl = buildTargetUrl(config.url, config.baseURL);

	if (!targetUrl) return;

	// Inject secureLookup only for non-proxy agents. When a proxy is used,
	// the lookup option applies to resolving the proxy server hostname, not
	// the target. Pre-request validateUrl covers the proxy path.
	const effectiveOptions =
		secureLookup && !customProxyUrl ? { ...agentOptions, lookup: secureLookup } : agentOptions;

	config.httpAgent = createHttpProxyAgent(customProxyUrl, targetUrl, effectiveOptions);
	config.httpsAgent = createHttpsProxyAgent(customProxyUrl, targetUrl, effectiveOptions);
}
