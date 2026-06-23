import type { AxiosRequestConfig } from 'axios';
import type {
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IRequestOptions,
} from 'n8n-workflow';
import { isObjectEmpty } from 'n8n-workflow';
import { stringify } from 'qs';

import { invokeAxios } from './invoke';
import { followSsrfRedirects, shouldFollowRedirectsManually } from './redirect';
import { applyDefaultOutboundUserAgent } from './user-agent';
import {
	buildAgentOptions,
	buildTargetUrl,
	getBeforeRedirectFn,
	isFormDataInstance,
	isIgnoreStatusErrorConfig,
	searchForHeader,
	setAxiosAgents,
	throwIfDomainNotAllowed,
	validateUrlSsrf,
} from './utils';
import type { SsrfBridge } from '../../ssrf';

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
				authSendImmediately: requestOptions.auth?.sendImmediately,
			})
		: await invokeAxios(axiosRequest, requestOptions.auth?.sendImmediately);

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
