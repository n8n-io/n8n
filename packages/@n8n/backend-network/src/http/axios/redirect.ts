import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { AgentOptions } from 'https';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { invokeAxios } from './invoke';
import {
	buildTargetUrl,
	getRedirectLocation,
	getUrlFromProxyConfig,
	isProxyPotentiallyActive,
	isRedirectStatus,
	resolveProxyOption,
	throwIfDomainNotAllowed,
	tryParseUrl,
	validateUrlSsrf,
} from './utils';
import type { SsrfBridge } from '../../ssrf';
import { buildNodeAgents } from '../node-agents';

/**
 * Default redirect cap, matching the limit axios applies through `follow-redirects`.
 * Used when a request enables redirect following without naming an explicit limit.
 */
const MAX_REDIRECTS_DEFAULT = 21;

/**
 * Inputs the manual redirect follower needs to re-derive each hop the way axios would,
 * while validating the target of every hop against the SSRF policy.
 */
export interface SsrfRedirectPolicy {
	ssrf: SsrfBridge;
	proxyConfig?: IHttpRequestOptions['proxy'] | string;
	agentOptions: AgentOptions;
	allowedDomains?: string;
	sendCredentialsOnCrossOriginRedirect: boolean;
	authSendImmediately?: boolean;
}

/**
 * Whether redirects must be followed manually instead of by axios.
 *
 * axios follows redirects synchronously via `follow-redirects`,
 * so a redirect target can only be validated synchronously there,
 * which cannot resolve a hostname.
 * When a proxy may carry the request the connection-time DNS check does not see the final target either,
 * so we take over redirect following to run the same async target validation as the initial request on every hop.
 */
export function shouldFollowRedirectsManually(
	axiosConfig: AxiosRequestConfig,
	proxyConfig: IHttpRequestOptions['proxy'] | string | undefined,
	ssrfBridge?: SsrfBridge,
): ssrfBridge is SsrfBridge {
	if (!ssrfBridge) {
		return false;
	}
	const maxRedirects = axiosConfig.maxRedirects ?? MAX_REDIRECTS_DEFAULT;
	if (maxRedirects === 0) {
		return false;
	}
	return isProxyPotentiallyActive(proxyConfig);
}

/**
 * @returns the absolute origin of a URL, falling back to the raw string.
 */
function safeOrigin(url: string): string {
	return tryParseUrl(url)?.origin ?? url;
}

/** Whether two URLs live on different origins (scheme + host + port). */
function isCrossOrigin(fromUrl: string, toUrl: string): boolean {
	return safeOrigin(fromUrl) !== safeOrigin(toUrl);
}

/**
 * Whether a redirect must rewrite the request into a body-less GET.
 * Mirrors `follow-redirects`: 303 downgrades any non-GET/HEAD; 301/302 downgrade a POST.
 */
function redirectDowngradesToGet(method: string, status: number): boolean {
	const normalized = method.toUpperCase();
	const isGetOrHead = normalized === 'GET' || normalized === 'HEAD';
	return (
		(status === 303 && !isGetOrHead) ||
		((status === 301 || status === 302) && normalized === 'POST')
	);
}

/**
 * Header names that must not carry over to the next hop:
 * - `Host`: always — the transport recomputes it for the new target
 * - `Content-*`: only when the body is dropped on a GET downgrade, so its descriptors go too
 * - `Authorization`/`Proxy-Authorization`/`Cookie`: credentials, dropped on a cross-origin hop unless explicitly allowed
 */
function headerPatternsToDropOnRedirect(
	downgradeToGet: boolean,
	stripCredentials: boolean,
): RegExp[] {
	return [
		/^host$/i,
		...(downgradeToGet ? [/^content-/i] : []),
		...(stripCredentials ? [/^authorization$/i, /^proxy-authorization$/i, /^cookie$/i] : []),
	];
}

/** @returns a copy of `headers` without the entries whose name matches any pattern. */
function omitHeaders(
	headers: AxiosRequestConfig['headers'],
	patterns: RegExp[],
): AxiosRequestConfig['headers'] {
	return Object.fromEntries(
		Object.entries(headers ?? {}).filter(
			([name]) => !patterns.some((pattern) => pattern.test(name)),
		),
	);
}

/** Fresh agents bound to the next target's host, re-running the SSRF policy on the new connection. */
function buildRedirectHopAgents(
	nextUrl: string,
	policy: SsrfRedirectPolicy,
): Pick<AxiosRequestConfig, 'httpAgent' | 'httpsAgent'> {
	const host = tryParseUrl(nextUrl)?.hostname;
	const customProxyUrl = policy.proxyConfig ? getUrlFromProxyConfig(policy.proxyConfig) : null;
	const proxy = resolveProxyOption(customProxyUrl);
	return buildNodeAgents(proxy, policy.ssrf, {
		...policy.agentOptions,
		...(host ? { servername: host } : {}),
	});
}

/**
 * Frees an intermediate streamed response body before following the next hop.
 */
function discardResponseBody(response: AxiosResponse): void {
	const data: unknown = response.data;
	if (
		data !== null &&
		typeof data === 'object' &&
		typeof (data as { destroy?: unknown }).destroy === 'function'
	) {
		(data as { destroy: () => void }).destroy();
	}
}

/**
 * Builds the next-hop axios config, mirroring how `follow-redirects` rewrites a
 * request across a redirect: method/body downgrade, credential stripping on
 * cross-origin hops, and fresh agents bound to the new target's host.
 */
function buildRedirectHopConfig(
	prevConfig: AxiosRequestConfig,
	status: number,
	originalUrl: string,
	nextUrl: string,
	policy: SsrfRedirectPolicy,
): AxiosRequestConfig {
	const downgradeToGet = redirectDowngradesToGet(prevConfig.method ?? 'GET', status);
	const stripCredentials =
		isCrossOrigin(originalUrl, nextUrl) && !policy.sendCredentialsOnCrossOriginRedirect;

	return {
		...prevConfig,
		url: nextUrl,
		// nextUrl is absolute and carries its own query string, so neither must carry over.
		baseURL: undefined,
		params: undefined,
		// A GET downgrade drops the body, so its method and payload reset.
		...(downgradeToGet ? { method: 'GET', data: undefined } : {}),
		// Credentials must not follow a cross-origin hop unless explicitly allowed.
		...(stripCredentials ? { auth: undefined } : {}),
		headers: omitHeaders(
			prevConfig.headers,
			headerPatternsToDropOnRedirect(downgradeToGet, stripCredentials),
		),
		...buildRedirectHopAgents(nextUrl, policy),
	};
}

/**
 * Enforces the caller's status policy on a terminal response, throwing the same `AxiosError` axios would.
 */
function throwIfStatusRejected(
	response: AxiosResponse,
	validateStatus: (status: number) => boolean,
): void {
	if (!validateStatus(response.status)) {
		// Same code axios derives in `settle`: 4xx -> ERR_BAD_REQUEST, 5xx -> ERR_BAD_RESPONSE, else undefined.
		const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][
			Math.floor(response.status / 100) - 4
		];
		throw new AxiosError(
			`Request failed with status code ${response.status}`,
			code,
			response.config,
			response.request,
			response,
		);
	}
}

/**
 * Resolves a redirect `Location` against the current URL.
 * @throws OperationalError when the server returns a malformed Location that cannot be resolved.
 */
function resolveRedirectUrl(location: string, currentUrl: string): string {
	try {
		return new URL(location, currentUrl).href;
	} catch {
		throw new OperationalError(`Invalid redirect location received from server: ${location}`);
	}
}

/**
 * Follows redirects manually, validating the target of every hop against the SSRF policy (DNS + IP),
 * so a redirect cannot reach a target the initial pre-flight check never saw,
 * including hostname targets carried by a proxy.
 */
export async function followSsrfRedirects(
	initialConfig: AxiosRequestConfig,
	policy: SsrfRedirectPolicy,
): Promise<AxiosResponse> {
	const maxRedirects = initialConfig.maxRedirects ?? MAX_REDIRECTS_DEFAULT;
	const originalUrl =
		buildTargetUrl(initialConfig.url, initialConfig.baseURL) ?? initialConfig.url ?? '';
	const baseValidateStatus =
		initialConfig.validateStatus ?? ((status: number) => status >= 200 && status < 300);

	// Each hop is a single request: disable axios' own following, let our custom
	// agents do the proxying (so axios' built-in proxy does not wrap it again),
	// and pass every 3xx through so we can inspect it for a `Location` to follow.
	// The caller's status policy still applies to the final, non-redirect response
	// (a non-3xx via axios here, a 3xx-without-Location via `throwIfStatusRejected`).
	const prepareHop = (config: AxiosRequestConfig): AxiosRequestConfig => ({
		...config,
		maxRedirects: 0,
		proxy: false,
		validateStatus: (status: number) =>
			isRedirectStatus(status) ? true : baseValidateStatus(status),
	});

	let config = prepareHop(initialConfig);
	let currentUrl = originalUrl;

	for (let redirectCount = 0; ; redirectCount++) {
		const response = await invokeAxios(config, policy.authSendImmediately);
		const location = getRedirectLocation(response);

		if (!isRedirectStatus(response.status) || !location) {
			if (isRedirectStatus(response.status)) {
				throwIfStatusRejected(response, baseValidateStatus);
			}
			return response;
		}

		// This response is a redirect we will not return.
		// Release its body (a no-op for buffered bodies, frees the socket for streamed ones)
		// before we either stop or follow.
		discardResponseBody(response);

		if (redirectCount >= maxRedirects) {
			throw new OperationalError(`Maximum number of redirects (${maxRedirects}) exceeded`);
		}

		const nextUrl = resolveRedirectUrl(location, currentUrl);
		throwIfDomainNotAllowed(nextUrl, policy.allowedDomains);
		await validateUrlSsrf(nextUrl, policy.ssrf);

		config = prepareHop(
			buildRedirectHopConfig(config, response.status, originalUrl, nextUrl, policy),
		);
		currentUrl = nextUrl;
	}
}
