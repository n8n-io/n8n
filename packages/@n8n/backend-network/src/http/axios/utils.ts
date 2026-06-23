import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import type { AgentOptions } from 'https';
import {
	assertUrlAllowed,
	type IHttpRequestOptions,
	type IRequestOptions,
	type IgnoreStatusErrorConfig,
} from 'n8n-workflow';

import type { SsrfBridge } from '../../ssrf';
import { hasProxyEnvironmentVariables } from '../http-proxy';
import { buildNodeAgents, isSupportedProxyUrl } from '../node-agents';
import type { ProxyOption, SsrfOption } from '../node-agents';

export function throwIfDomainNotAllowed(
	configOrUrl: AxiosRequestConfig | string,
	allowedDomains?: string,
): void {
	const url = typeof configOrUrl === 'string' ? configOrUrl : axios.getUri(configOrUrl);
	assertUrlAllowed({ url, allowedDomains });
}

/** Attempts to parse a string as a URL. Returns the parsed `URL` or `null` on failure. */
export function tryParseUrl(url: string): URL | null {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

/** Type guard for `IgnoreStatusErrorConfig` objects. */
export function isIgnoreStatusErrorConfig(
	ignoreHttpStatusErrors: unknown,
): ignoreHttpStatusErrors is IgnoreStatusErrorConfig {
	return (
		typeof ignoreHttpStatusErrors === 'object' &&
		ignoreHttpStatusErrors !== null &&
		'ignore' in ignoreHttpStatusErrors &&
		ignoreHttpStatusErrors.ignore === true
	);
}

/** Case-insensitive lookup of a header name in an axios config. */
export function searchForHeader(config: AxiosRequestConfig, headerName: string) {
	if (config.headers === undefined) {
		return undefined;
	}

	const headerNames = Object.keys(config.headers);
	headerName = headerName.toLowerCase();
	return headerNames.find((thisHeader) => thisHeader.toLowerCase() === headerName);
}

/** Extracts the hostname from a request object's URL or URI. */
export const getHostFromRequestObject = (
	requestObject: Partial<{
		url: string;
		uri: string;
		baseURL: string;
	}>,
): string | null => {
	try {
		const url = (requestObject.url ?? requestObject.uri) as string;
		return new URL(url, requestObject.baseURL).hostname;
	} catch (error) {
		return null;
	}
};

/**
 * Resolves a custom proxy URL (a runtime string) into a {@link ProxyOption}.
 * Falls back to `'env'` when no custom proxy is configured,
 * or when the configured value is not a supported proxy URL.
 */
export function resolveProxyOption(customProxyUrl: string | null): ProxyOption {
	if (!customProxyUrl) {
		return 'env';
	}

	if (isSupportedProxyUrl(customProxyUrl)) {
		return customProxyUrl;
	}

	Container.get(Logger).warn(
		`Ignoring unsupported proxy URL "${customProxyUrl}", falling back to environment proxy settings`,
	);
	return 'env';
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

/** Returns an axios `beforeRedirect` callback that re-applies agents and auth headers. */
export const getBeforeRedirectFn =
	(
		agentOptions: AgentOptions,
		axiosConfig: AxiosRequestConfig,
		proxyConfig: IHttpRequestOptions['proxy'] | string | undefined,
		sendCredentialsOnCrossOriginRedirect: boolean,
		allowedDomains?: string,
		ssrf: SsrfOption = 'disabled',
	) =>
	(redirectedRequest: Record<string, any>) => {
		throwIfDomainNotAllowed(redirectedRequest.href, allowedDomains);
		// SSRF: validate redirect target synchronously for direct-IP URIs.
		// Hostname-based redirect targets are caught by secureLookup on the agent.
		if (ssrf !== 'disabled') {
			ssrf.validateRedirectSync(redirectedRequest.href);
		}

		const redirectAgentOptions: AgentOptions = {
			...agentOptions,
			servername: redirectedRequest.hostname,
		};
		const customProxyUrl = proxyConfig ? getUrlFromProxyConfig(proxyConfig) : null;
		const proxy = resolveProxyOption(customProxyUrl);

		// SSRF lookup is applied to direct connections only; behind a proxy the
		// proxy validates the final target.
		const targetUrl = redirectedRequest.href;
		const { httpAgent, httpsAgent } = buildNodeAgents(proxy, ssrf, redirectAgentOptions);

		redirectedRequest.agent = redirectedRequest.href.startsWith('https://')
			? httpsAgent
			: httpAgent;
		redirectedRequest.agents = { http: httpAgent, https: httpsAgent };

		const originalUrl = axiosConfig.baseURL
			? new URL(axiosConfig.url ?? '', axiosConfig.baseURL)
			: new URL(axiosConfig.url ?? '');
		const originalOrigin = originalUrl.origin;
		const targetOrigin = new URL(targetUrl).origin;
		// Copy auth headers
		if (originalOrigin === targetOrigin || sendCredentialsOnCrossOriginRedirect) {
			if (axiosConfig.headers?.Authorization) {
				redirectedRequest.headers.Authorization = axiosConfig.headers.Authorization;
			}
			if (axiosConfig.auth) {
				redirectedRequest.auth = `${axiosConfig.auth.username}:${axiosConfig.auth.password}`;
			}
		}
	};

/** Builds a Digest-Auth `Authorization` header from a 401 challenge response. */
export function digestAuthAxiosConfig(
	axiosConfig: AxiosRequestConfig,
	response: AxiosResponse,
	auth: AxiosRequestConfig['auth'],
): AxiosRequestConfig {
	const authDetails = response.headers['www-authenticate']
		.split(',')
		.map((v: string) => v.split('='));
	if (authDetails) {
		const nonceCount = '000000001';
		const cnonce = crypto.randomBytes(24).toString('hex');
		const realm: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('realm') > -1)[1]
			.replace(/"/g, '');
		// If authDetails does not have opaque, we should not add it to authorization.
		const opaqueKV = authDetails.find((el: any) => el[0].toLowerCase().indexOf('opaque') > -1);
		const opaque: string = opaqueKV ? opaqueKV[1].replace(/"/g, '') : undefined;
		const nonce: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('nonce') > -1)[1]
			.replace(/"/g, '');
		const ha1 = crypto
			.createHash('md5')
			.update(`${auth?.username as string}:${realm}:${auth?.password as string}`)
			.digest('hex');
		const url = new URL(axios.getUri(axiosConfig));
		const path = url.pathname + url.search;
		const ha2 = crypto
			.createHash('md5')
			.update(`${axiosConfig.method ?? 'GET'}:${path}`)
			.digest('hex');
		const response = crypto
			.createHash('md5')
			.update(`${ha1}:${nonce}:${nonceCount}:${cnonce}:auth:${ha2}`)
			.digest('hex');
		let authorization =
			`Digest username="${auth?.username as string}",realm="${realm}",` +
			`nonce="${nonce}",uri="${path}",qop="auth",algorithm="MD5",` +
			`response="${response}",nc="${nonceCount}",cnonce="${cnonce}"`;
		// Only when opaque exists, add it to authorization.
		if (opaque) {
			authorization += `,opaque="${opaque}"`;
		}
		if (axiosConfig.headers) {
			axiosConfig.headers.authorization = authorization;
		} else {
			axiosConfig.headers = { authorization };
		}
	}
	return axiosConfig;
}

const pushFormDataValue = (form: FormData, key: string, value: any) => {
	if (value?.hasOwnProperty('value') && value.hasOwnProperty('options')) {
		form.append(key, value.value, value.options);
	} else {
		form.append(key, value);
	}
};
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

/** Converts a plain object into a `FormData` instance, handling arrays and option objects. */
export const createFormDataObject = (data: Record<string, unknown>) => {
	const formData = new FormData();
	const keys = Object.keys(data);
	keys.forEach((key) => {
		const formField = data[key];

		if (formField instanceof Array) {
			formField.forEach((item) => {
				pushFormDataValue(formData, key, item);
			});
		} else {
			pushFormDataValue(formData, key, formField);
		}
	});
	return formData;
};

/**
 * Duck-type check for FormData instances. Using `instanceof` fails when
 * multiple copies of the `form-data` package are installed
 * (e.g. one instance in one package, another in another package),
 * because each copy has its own constructor reference.
 */
export function isFormDataInstance(data: unknown): data is FormData {
	return (
		data instanceof FormData ||
		(typeof data === 'object' &&
			data !== null &&
			'getHeaders' in data &&
			typeof (data as { getHeaders: unknown }).getHeaders === 'function' &&
			'append' in data &&
			typeof (data as { append: unknown }).append === 'function')
	);
}

/**
 * Builds the per-request Node agent options (TLS `servername`, cert validation, ...) from an `IHttpRequestOptions`.
 * Shared by the axios config builder and the manual redirect follower so both derive agents the same way.
 */
export function buildAgentOptions(n8nRequest: IHttpRequestOptions): AgentOptions {
	const host = getHostFromRequestObject(n8nRequest);
	const agentOptions: AgentOptions = { ...n8nRequest.agentOptions };
	if (host) {
		agentOptions.servername = host;
	}
	if (n8nRequest.skipSslCertificateValidation === true) {
		agentOptions.rejectUnauthorized = false;
	}
	return agentOptions;
}

/**
 * @returns true when a status code is in the 3xx range.
 *
 * Mirrors `follow-redirects`, which follows any 3xx response carrying a `Location` header
 * (RFC 7231 §6.4) rather than an allow-list of specific codes. The `Location` is checked
 * separately at the follow site, so a 3xx without one (e.g. `304`) is not followed and falls
 * through to the caller's status policy.
 */
export function isRedirectStatus(status: number): boolean {
	return status >= 300 && status < 400;
}

/**
 * @returns the `Location` header from an axios response, if present and a string.
 */
export function getRedirectLocation(response: AxiosResponse): string | undefined {
	const headers = response.headers as Record<string, unknown> | undefined;
	const location = headers?.location;
	return typeof location === 'string' ? location : undefined;
}

/**
 * Whether a proxy may carry this request.
 * @returns true when an explicit proxy is set, or any proxy environment variable is configured
 */
export function isProxyPotentiallyActive(
	proxyConfig?: IHttpRequestOptions['proxy'] | string,
): boolean {
	const configSupported = isSupportedProxyUrl(getUrlFromProxyConfig(proxyConfig));
	return configSupported || hasProxyEnvironmentVariables();
}

/** Sets the `content-length` header by measuring the FormData stream length. */
export async function generateContentLengthHeader(config: AxiosRequestConfig) {
	if (!isFormDataInstance(config.data)) {
		return;
	}

	try {
		const length = await new Promise<number>((res, rej) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			config.data.getLength((error: Error | null, dataLength: number) => {
				if (error) rej(error);
				else res(dataLength);
			});
		});
		config.headers = {
			...config.headers,
			'content-length': length,
		};
	} catch (error) {
		Container.get(Logger).error('Unable to calculate form data length', { error });
	}
}

/** Converts an `IHttpRequestOptions['proxy']` (object or string) into a proxy URL string. */
export function getUrlFromProxyConfig(
	proxyConfig: IHttpRequestOptions['proxy'] | string | undefined | null,
): string | null {
	if (!proxyConfig) {
		return null;
	}

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
	ssrf: SsrfOption = 'disabled',
): void {
	if (config.httpAgent || config.httpsAgent) return;

	const targetUrl = buildTargetUrl(config.url, config.baseURL);

	if (!targetUrl) return;

	const customProxyUrl = proxyConfig ? getUrlFromProxyConfig(proxyConfig) : null;
	const proxy = resolveProxyOption(customProxyUrl);

	// SSRF lookup is applied to direct connections only; behind a proxy the
	// proxy validates the final target.
	const { httpAgent, httpsAgent } = buildNodeAgents(proxy, ssrf, agentOptions);
	config.httpAgent = httpAgent;
	config.httpsAgent = httpsAgent;
}

/** Validates a URL against SSRF protection rules. Throws UserError if blocked. */
export async function validateUrlSsrf(
	url: string | undefined,
	ssrfBridge?: SsrfBridge,
): Promise<void> {
	if (!ssrfBridge || !url) return;

	const parsed = tryParseUrl(url);
	if (!parsed) return;

	const result = await ssrfBridge.validateUrl(parsed);
	if (!result.ok) {
		throw result.error;
	}
}

export function resolveLegacyRequestUrl(requestObject: IRequestOptions): string | undefined {
	const rawUrl = requestObject.uri?.toString() ?? requestObject.url?.toString();
	const baseURL = requestObject.baseURL?.toString();
	return buildTargetUrl(rawUrl, baseURL) ?? rawUrl;
}
