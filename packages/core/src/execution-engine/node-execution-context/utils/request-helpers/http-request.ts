/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { AgentOptions } from 'https';
import isEmpty from 'lodash/isEmpty';
import type {
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IRequestOptions,
} from 'n8n-workflow';
import { isObjectEmpty } from 'n8n-workflow';
import { stringify } from 'qs';

import type { SsrfBridge } from '@/ssrf';

import {
	buildTargetUrl,
	digestAuthAxiosConfig,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	isFormDataInstance,
	isIgnoreStatusErrorConfig,
	searchForHeader,
	setAxiosAgents,
	throwIfDomainNotAllowed,
	validateUrlSsrf,
} from './axios-utils';
import { applyDefaultOutboundUserAgent } from './outbound-user-agent';

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
	}

	if (n8nRequest.encoding !== undefined) {
		axiosRequest.responseType = n8nRequest.encoding;
	}

	const host = getHostFromRequestObject(n8nRequest);
	const agentOptions: AgentOptions = { ...n8nRequest.agentOptions };
	if (host) {
		agentOptions.servername = host;
	}
	if (n8nRequest.skipSslCertificateValidation === true) {
		agentOptions.rejectUnauthorized = false;
	}
	const secureLookup = ssrfBridge?.createSecureLookup();
	setAxiosAgents(axiosRequest, agentOptions, proxy, secureLookup);

	axiosRequest.beforeRedirect = getBeforeRedirectFn(
		agentOptions,
		axiosRequest,
		n8nRequest.proxy,
		n8nRequest.sendCredentialsOnCrossOriginRedirect ?? true,
		n8nRequest.allowedDomains,
		ssrfBridge,
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

/** Remove empty request body on GET, HEAD, and OPTIONS requests */
export function removeEmptyBody(requestOptions: IHttpRequestOptions | IRequestOptions) {
	const method = requestOptions.method || 'GET';
	if (NoBodyHttpMethods.includes(method) && isEmpty(requestOptions.body)) {
		delete requestOptions.body;
	}
}

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

	const result = await invokeAxios(axiosRequest, requestOptions.auth);

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
