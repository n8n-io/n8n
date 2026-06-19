/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import type { AgentOptions } from 'https';
import type {
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IRequestOptions,
} from 'n8n-workflow';
import { isObjectEmpty, OperationalError } from 'n8n-workflow';
import { stringify } from 'qs';

import { applyDefaultOutboundUserAgent } from './user-agent';
import {
	buildAgentOptions,
	buildTargetUrl,
	digestAuthAxiosConfig,
	getBeforeRedirectFn,
	getRedirectLocation,
	getUrlFromProxyConfig,
	isFormDataInstance,
	isIgnoreStatusErrorConfig,
	isProxyPotentiallyActive,
	isRedirectStatus,
	resolveProxyOption,
	searchForHeader,
	setAxiosAgents,
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

export async function invokeAxios(
	axiosConfig: AxiosRequestConfig,
	authOptions: IRequestOptions['auth'] = {},
) {
	try {
		return await axios(axiosConfig);
	} catch (error) {
		if (authOptions.sendImmediately !== false || !(error instanceof axios.AxiosError)) throw error;
		// for digest-auth
		const { response } = error;
		if (response?.status !== 401 || !response.headers['www-authenticate']?.includes('nonce')) {
			throw error;
		}
		const { auth } = axiosConfig;
		delete axiosConfig.auth;
		axiosConfig = digestAuthAxiosConfig(axiosConfig, response, auth);
		return await axios(axiosConfig);
	}
}

export function convertN8nRequestToAxios(
	n8nRequest: IHttpRequestOptions,
	ssrfBridge?: SsrfBridge,
): AxiosRequestConfig {
	// Destructure properties with the same name first.
	const { headers, method, timeout, auth, proxy, url } = n8nRequest;

	const axiosRequest: AxiosRequestConfig = {
		headers: headers ?? {},
		method,
		timeout,
		auth,
		url,
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	} as AxiosRequestConfig;

	axiosRequest.params = n8nRequest.qs;

	if (n8nRequest.abortSignal) {
		axiosRequest.signal = n8nRequest.abortSignal;
	}

	if (n8nRequest.baseURL !== undefined) {
		axiosRequest.baseURL = n8nRequest.baseURL;
	}

	if (n8nRequest.disableFollowRedirect === true) {
		axiosRequest.maxRedirects = 0;
	} else if (n8nRequest.maxRedirects !== undefined) {
		axiosRequest.maxRedirects = n8nRequest.maxRedirects;
	}

	if (n8nRequest.encoding !== undefined) {
		axiosRequest.responseType = n8nRequest.encoding;
	}

	const agentOptions = buildAgentOptions(n8nRequest);
	setAxiosAgents(axiosRequest, agentOptions, proxy, ssrfBridge ?? 'disabled');

	axiosRequest.beforeRedirect = getBeforeRedirectFn(
		agentOptions,
		axiosRequest,
		n8nRequest.proxy,
		n8nRequest.sendCredentialsOnCrossOriginRedirect ?? true,
		n8nRequest.allowedDomains,
		ssrfBridge ?? 'disabled',
	);

	if (n8nRequest.arrayFormat !== undefined) {
		axiosRequest.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: n8nRequest.arrayFormat });
		};
	}

	const { body } = n8nRequest;
	if (body) {
		// Let's add some useful header standards here.
		const existingContentTypeHeaderKey = searchForHeader(axiosRequest, 'content-type');
		if (existingContentTypeHeaderKey === undefined) {
			axiosRequest.headers = axiosRequest.headers || {};
			// We are only setting content type headers if the user did
			// not set it already manually. We're not overriding, even if it's wrong.
			if (isFormDataInstance(body)) {
				axiosRequest.headers = {
					...axiosRequest.headers,
					...body.getHeaders(),
				};
			} else if (body instanceof URLSearchParams) {
				axiosRequest.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			}
		} else if (
			axiosRequest.headers?.[existingContentTypeHeaderKey] === 'application/x-www-form-urlencoded'
		) {
			axiosRequest.data = new URLSearchParams(n8nRequest.body as Record<string, string>);
		}
		// if there is a body and it's empty (does not have properties),
		// make sure not to send anything in it as some services fail when
		// sending GET request with empty body.
		if (typeof body === 'string' || (typeof body === 'object' && !isObjectEmpty(body))) {
			axiosRequest.data = body;
		}
	}

	if (n8nRequest.json) {
		const key = searchForHeader(axiosRequest, 'accept');
		// If key exists, then the user has set both accept
		// header and the json flag. Header should take precedence.
		if (!key) {
			axiosRequest.headers = {
				...axiosRequest.headers,
				Accept: 'application/json',
			};
		}
	}

	applyDefaultOutboundUserAgent(axiosRequest);

	if (n8nRequest.ignoreHttpStatusErrors) {
		const ignoreHttpStatusErrors = n8nRequest.ignoreHttpStatusErrors;
		if (isIgnoreStatusErrorConfig(ignoreHttpStatusErrors)) {
			axiosRequest.validateStatus = (status) => {
				return !ignoreHttpStatusErrors.except.includes(status);
			};
		} else {
			axiosRequest.validateStatus = () => true;
		}
	}

	return axiosRequest;
}

const NoBodyHttpMethods = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Checks whether a request body should be considered empty.
 */
function isEmpty(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}
	if (typeof value === 'string' || Array.isArray(value) || Buffer.isBuffer(value)) {
		return value.length === 0;
	}
	if (typeof value === 'object') {
		return Object.keys(value).length === 0;
	}
	return false;
}

/** Remove empty request body on GET, HEAD, and OPTIONS requests */
export function removeEmptyBody(requestOptions: IHttpRequestOptions | IRequestOptions) {
	const method = requestOptions.method || 'GET';
	if (NoBodyHttpMethods.includes(method) && isEmpty(requestOptions.body)) {
		delete requestOptions.body;
	}
}

/**
 * Inputs the manual redirect follower needs to re-derive each hop the way axios would,
 * while validating the target of every hop against the SSRF policy.
 */
interface SsrfRedirectPolicy {
	ssrf: SsrfBridge;
	proxyConfig?: IHttpRequestOptions['proxy'] | string;
	agentOptions: AgentOptions;
	allowedDomains?: string;
	sendCredentialsOnCrossOriginRedirect: boolean;
	authOptions?: IRequestOptions['auth'];
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

/**
 * Deletes every header whose name matches `pattern` (case-insensitive).
 */
function removeMatchingHeaders(headers: AxiosRequestConfig['headers'], pattern: RegExp): void {
	if (headers) {
		for (const key of Object.keys(headers)) {
			if (pattern.test(key)) {
				delete headers[key];
			}
		}
	}
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
	const next: AxiosRequestConfig = { ...prevConfig };
	next.url = nextUrl;
	delete next.baseURL;
	// The query string is already part of `nextUrl`; drop carried-over params.
	delete next.params;

	const headers: AxiosRequestConfig['headers'] = { ...prevConfig.headers };

	const method = (prevConfig.method ?? 'GET').toUpperCase();
	const isGetOrHead = method === 'GET' || method === 'HEAD';
	const downgradeToGet =
		(status === 303 && !isGetOrHead) || ((status === 301 || status === 302) && method === 'POST');
	if (downgradeToGet) {
		next.method = 'GET';
		delete next.data;
		removeMatchingHeaders(headers, /^content-/i);
	}

	// Let the transport recompute Host for the new target.
	removeMatchingHeaders(headers, /^host$/i);

	const crossOrigin = safeOrigin(originalUrl) !== safeOrigin(nextUrl);
	if (crossOrigin && !policy.sendCredentialsOnCrossOriginRedirect) {
		delete next.auth;
		removeMatchingHeaders(headers, /^authorization$/i);
	}
	next.headers = headers;

	const host = tryParseUrl(nextUrl)?.hostname;
	const customProxyUrl = policy.proxyConfig ? getUrlFromProxyConfig(policy.proxyConfig) : null;
	const proxy = resolveProxyOption(customProxyUrl);
	const { httpAgent, httpsAgent } = buildNodeAgents(proxy, policy.ssrf, {
		...policy.agentOptions,
		...(host ? { servername: host } : {}),
	});
	next.httpAgent = httpAgent;
	next.httpsAgent = httpsAgent;

	return next;
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
	// and treat redirect responses as non-errors so we can follow them.
	//  The caller's status policy still applies to the final, non-redirect response.
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
		const response = await invokeAxios(config, policy.authOptions);
		const location = getRedirectLocation(response);

		if (!isRedirectStatus(response.status) || !location) {
			return response;
		}

		// This response is a redirect we will not return.
		// Release its body (a no-op for buffered bodies, frees the socket for streamed ones)
		// before we either stop or follow.
		discardResponseBody(response);

		if (redirectCount >= maxRedirects) {
			throw new OperationalError(`Maximum number of redirects (${maxRedirects}) exceeded`);
		}

		const nextUrl = new URL(location, currentUrl).href;
		throwIfDomainNotAllowed(nextUrl, policy.allowedDomains);
		await validateUrlSsrf(nextUrl, policy.ssrf);

		config = prepareHop(
			buildRedirectHopConfig(config, response.status, originalUrl, nextUrl, policy),
		);
		currentUrl = nextUrl;
	}
}

/**
 * @deprecated Prefer the package's single entry point:
 * `Container.get(OutboundHttp).requests({ ssrf }).request(options)`.
 * Kept exported for callers not yet migrated to the facade.
 */
export async function httpRequest(
	requestOptions: IHttpRequestOptions & { returnFullResponse: true },
	ssrfBridge?: SsrfBridge,
): Promise<IN8nHttpFullResponse>;
export async function httpRequest(
	requestOptions: IHttpRequestOptions & { returnFullResponse?: false },
	ssrfBridge?: SsrfBridge,
): Promise<IN8nHttpResponse>;
export async function httpRequest(
	requestOptions: IHttpRequestOptions,
	ssrfBridge?: SsrfBridge,
): Promise<IN8nHttpFullResponse | IN8nHttpResponse>;
export async function httpRequest(
	requestOptions: IHttpRequestOptions,
	ssrfBridge?: SsrfBridge,
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
	removeEmptyBody(requestOptions);

	const url = buildTargetUrl(requestOptions.url, requestOptions.baseURL) ?? requestOptions.url;
	await validateUrlSsrf(url, ssrfBridge);

	const axiosRequest = convertN8nRequestToAxios(requestOptions, ssrfBridge);
	if (
		axiosRequest.data === undefined ||
		(axiosRequest.method !== undefined && axiosRequest.method.toUpperCase() === 'GET')
	) {
		delete axiosRequest.data;
	}

	throwIfDomainNotAllowed(axiosRequest, requestOptions.allowedDomains);

	const result = shouldFollowRedirectsManually(axiosRequest, requestOptions.proxy, ssrfBridge)
		? await followSsrfRedirects(axiosRequest, {
				ssrf: ssrfBridge,
				proxyConfig: requestOptions.proxy,
				agentOptions: buildAgentOptions(requestOptions),
				allowedDomains: requestOptions.allowedDomains,
				sendCredentialsOnCrossOriginRedirect:
					requestOptions.sendCredentialsOnCrossOriginRedirect ?? true,
				authOptions: requestOptions.auth,
			})
		: await invokeAxios(axiosRequest, requestOptions.auth);

	if (requestOptions.returnFullResponse) {
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			body: result.data,
			headers: result.headers,
			statusCode: result.status,
			statusMessage: result.statusText,
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return result.data;
}
