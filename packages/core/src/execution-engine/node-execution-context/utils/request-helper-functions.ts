/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { AxiosHeaders, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import crypto from 'crypto';
import type FormData from 'form-data';
import { IncomingMessage } from 'http';
import { type AgentOptions } from 'https';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import {
	NodeApiError,
	NodeOperationError,
	NodeSslError,
	isObjectEmpty,
	ExecutionBaseError,
} from 'n8n-workflow';
import type {
	GenericValue,
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	ICredentialDataDecryptedObject,
	IExecuteData,
	IExecuteFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeExecutionData,
	IOAuth2Options,
	IRequestOptions,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	RequestHelperFunctions,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { stringify } from 'qs';
import { Readable } from 'stream';

import type { SsrfBridge } from '@/execution-engine';
import { callEvalMockHandler, normalizeLegacyRequest } from '@/execution-engine/eval-mock-helpers';

import { binaryToString } from './binary-helper-functions';
import { applyDefaultOutboundUserAgent } from './outbound-user-agent';
import { parseIncomingMessage } from './parse-incoming-message';
// Imported for side effects: sets axios defaults and registers the request interceptor
import './request-helpers/axios-config';
import {
	buildTargetUrl,
	createFormDataObject,
	digestAuthAxiosConfig,
	generateContentLengthHeader,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	isFormDataInstance,
	isIgnoreStatusErrorConfig,
	searchForHeader,
	setAxiosAgents,
	tryParseUrl,
} from './request-helpers';
import { throwIfDomainNotAllowed } from './request-helpers/axios-utils';
import { refreshOAuth2Token, requestOAuth1, requestOAuth2 } from './request-helpers/oauth';
import { requestWithAuthenticationPaginated } from './request-helpers/pagination';

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

/**
 * This function is a temporary implementation that translates all http requests
 * done via the request library to axios directly.
 * We are not using n8n's interface as it would an unnecessary step,
 * considering the `request` helper has been be deprecated and should be removed.
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
// eslint-disable-next-line complexity
export async function parseRequestObject(requestObject: IRequestOptions, ssrfBridge?: SsrfBridge) {
	const axiosConfig: AxiosRequestConfig = {};

	if (requestObject.headers !== undefined) {
		axiosConfig.headers = requestObject.headers as AxiosHeaders;
	}

	// Let's start parsing the hardest part, which is the request body.
	// The process here is as following?
	// - Check if we have a `content-type` header. If this was set,
	//   we will follow
	// - Check if the `form` property was set. If yes, then it's x-www-form-urlencoded
	// - Check if the `formData` property exists. If yes, then it's multipart/form-data
	// - Lastly, we should have a regular `body` that is probably a JSON.

	const contentTypeHeaderKeyName =
		axiosConfig.headers &&
		Object.keys(axiosConfig.headers).find(
			(headerName) => headerName.toLowerCase() === 'content-type',
		);
	const contentType =
		contentTypeHeaderKeyName &&
		(axiosConfig.headers?.[contentTypeHeaderKeyName] as string | undefined);
	if (contentType === 'application/x-www-form-urlencoded' && requestObject.formData === undefined) {
		// there are nodes incorrectly created, informing the content type header
		// and also using formData. Request lib takes precedence for the formData.
		// We will do the same.
		// Merge body and form properties.
		if (typeof requestObject.body === 'string') {
			axiosConfig.data = requestObject.body;
		} else {
			const allData = Object.assign(requestObject.body || {}, requestObject.form || {}) as Record<
				string,
				string
			>;
			if (requestObject.useQuerystring === true) {
				axiosConfig.data = stringify(allData, { arrayFormat: 'repeat' });
			} else {
				axiosConfig.data = stringify(allData);
			}
		}
	} else if (contentType?.includes('multipart/form-data')) {
		if (requestObject.formData !== undefined && isFormDataInstance(requestObject.formData)) {
			axiosConfig.data = requestObject.formData;
		} else {
			const allData: Partial<FormData> = {
				...(requestObject.body as object | undefined),
				...(requestObject.formData as object | undefined),
			};

			axiosConfig.data = createFormDataObject(allData);
		}
		// replace the existing header with a new one that
		// contains the boundary property.
		delete axiosConfig.headers?.[contentTypeHeaderKeyName!];

		const headers = axiosConfig.data.getHeaders();

		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
		await generateContentLengthHeader(axiosConfig);
	} else {
		// When using the `form` property it means the content should be x-www-form-urlencoded.
		if (requestObject.form !== undefined && requestObject.body === undefined) {
			// If we have only form
			axiosConfig.data =
				typeof requestObject.form === 'string'
					? stringify(requestObject.form, { format: 'RFC3986' })
					: stringify(requestObject.form).toString();
			if (axiosConfig.headers !== undefined) {
				const headerName = searchForHeader(axiosConfig, 'content-type');
				if (headerName) {
					delete axiosConfig.headers[headerName];
				}
				axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			} else {
				axiosConfig.headers = {
					'Content-Type': 'application/x-www-form-urlencoded',
				};
			}
		} else if (requestObject.formData !== undefined) {
			// remove any "content-type" that might exist.
			if (axiosConfig.headers !== undefined) {
				const headers = Object.keys(axiosConfig.headers);
				headers.forEach((header) => {
					if (header.toLowerCase() === 'content-type') {
						delete axiosConfig.headers?.[header];
					}
				});
			}

			if (isFormDataInstance(requestObject.formData)) {
				axiosConfig.data = requestObject.formData;
			} else {
				axiosConfig.data = createFormDataObject(requestObject.formData as Record<string, unknown>);
			}
			// Mix in headers as FormData creates the boundary.

			const headers = axiosConfig.data.getHeaders();

			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
			await generateContentLengthHeader(axiosConfig);
		} else if (requestObject.body !== undefined) {
			// If we have body and possibly form
			if (requestObject.form !== undefined && requestObject.body) {
				// merge both objects when exist.

				requestObject.body = Object.assign(requestObject.body, requestObject.form);
			}
			axiosConfig.data = requestObject.body as FormData | GenericValue | GenericValue[];
		}
	}

	if (requestObject.uri !== undefined) {
		axiosConfig.url = requestObject.uri?.toString();
	}

	if (requestObject.url !== undefined) {
		axiosConfig.url = requestObject.url?.toString();
	}

	if (requestObject.baseURL !== undefined) {
		axiosConfig.baseURL = requestObject.baseURL?.toString();
	}

	if (requestObject.method !== undefined) {
		axiosConfig.method = requestObject.method;
	}

	if (requestObject.qs !== undefined && Object.keys(requestObject.qs as object).length > 0) {
		axiosConfig.params = requestObject.qs;
	}

	function hasArrayFormatOptions(
		arg: IRequestOptions,
	): arg is Required<Pick<IRequestOptions, 'qsStringifyOptions'>> {
		if (
			typeof arg.qsStringifyOptions === 'object' &&
			arg.qsStringifyOptions !== null &&
			!Array.isArray(arg.qsStringifyOptions) &&
			'arrayFormat' in arg.qsStringifyOptions
		) {
			return true;
		}

		return false;
	}

	if (
		requestObject.useQuerystring === true ||
		(hasArrayFormatOptions(requestObject) &&
			requestObject.qsStringifyOptions.arrayFormat === 'repeat')
	) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'repeat' });
		};
	} else if (requestObject.useQuerystring === false) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'indices' });
		};
	}

	if (
		hasArrayFormatOptions(requestObject) &&
		requestObject.qsStringifyOptions.arrayFormat === 'brackets'
	) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'brackets' });
		};
	}

	if (requestObject.auth !== undefined) {
		// Check support for sendImmediately
		if (requestObject.auth.bearer !== undefined) {
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
				Authorization: `Bearer ${requestObject.auth.bearer}`,
			});
		} else {
			const authObj = requestObject.auth;
			// Request accepts both user/username and pass/password
			axiosConfig.auth = {
				username: (authObj.user || authObj.username) as string,

				password: (authObj.password || authObj.pass) as string,
			};
		}
	}

	// Only set header if we have a body, otherwise it may fail
	if (requestObject.json === true) {
		// Add application/json headers - do not set charset as it breaks a lot of stuff
		// only add if no other accept headers was sent.
		const acceptHeaderExists =
			axiosConfig.headers === undefined
				? false
				: Object.keys(axiosConfig.headers)
						.map((headerKey) => headerKey.toLowerCase())
						.includes('accept');
		if (!acceptHeaderExists) {
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
				Accept: 'application/json',
			});
		}
	}
	if (requestObject.json === false || requestObject.json === undefined) {
		// Prevent json parsing

		axiosConfig.transformResponse = (res) => res;
	}

	// Axios will follow redirects by default, so we simply tell it otherwise if needed.
	const { method } = requestObject;
	if (
		(requestObject.followRedirect !== false &&
			(!method || method === 'GET' || method === 'HEAD')) ||
		requestObject.followAllRedirects
	) {
		axiosConfig.maxRedirects = requestObject.maxRedirects;
	} else {
		axiosConfig.maxRedirects = 0;
	}

	const host = getHostFromRequestObject(requestObject);
	const agentOptions: AgentOptions = { ...requestObject.agentOptions };
	if (host) {
		agentOptions.servername = host;
	}
	if (requestObject.rejectUnauthorized === false) {
		agentOptions.rejectUnauthorized = false;
		agentOptions.secureOptions = crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT;
	}

	if (requestObject.timeout !== undefined) {
		axiosConfig.timeout = requestObject.timeout;
	}

	const secureLookup = ssrfBridge?.createSecureLookup();
	setAxiosAgents(axiosConfig, agentOptions, requestObject.proxy, secureLookup);

	axiosConfig.beforeRedirect = getBeforeRedirectFn(
		agentOptions,
		axiosConfig,
		requestObject.proxy,
		requestObject.sendCredentialsOnCrossOriginRedirect ?? true,
		requestObject.allowedDomains,
		ssrfBridge,
	);

	if (requestObject.useStream) {
		axiosConfig.responseType = 'stream';
	} else if (requestObject.encoding === null) {
		// When downloading files, return an arrayBuffer.
		axiosConfig.responseType = 'arraybuffer';
	}

	// If we don't set an accept header
	// Axios forces "application/json, text/plan, */*"
	// Which causes some nodes like NextCloud to break
	// as the service returns XML unless requested otherwise.
	const allHeaders = axiosConfig.headers ? Object.keys(axiosConfig.headers) : [];
	if (!allHeaders.some((headerKey) => headerKey.toLowerCase() === 'accept')) {
		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, { accept: '*/*' });
	}
	if (
		requestObject.json !== false &&
		axiosConfig.data !== undefined &&
		axiosConfig.data !== '' &&
		!(axiosConfig.data instanceof Buffer) &&
		!allHeaders.some((headerKey) => headerKey.toLowerCase() === 'content-type')
	) {
		// Use default header for application/json
		// If we don't specify this here, axios will add
		// application/json; charset=utf-8
		// and this breaks a lot of stuff

		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
			'content-type': 'application/json',
		});
	}

	if (requestObject.simple === false) {
		axiosConfig.validateStatus = () => true;
	}

	applyDefaultOutboundUserAgent(axiosConfig);

	/**
	 * Missing properties:
	 * encoding (need testing)
	 * gzip (ignored - default already works)
	 * resolveWithFullResponse (implemented elsewhere)
	 */
	return axiosConfig;
}

/**
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
export async function proxyRequestToAxios(
	workflow: Workflow | undefined,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	uriOrObject: string | IRequestOptions,
	options?: IRequestOptions,
): Promise<any> {
	let axiosConfig: AxiosRequestConfig = {
		maxBodyLength: Infinity,
		// -1 is the Axios sentinel for "no limit". Infinity also means no limit but
		// Axios 1.15.1+ treats any value > -1 as a finite cap, wrapping stream responses
		// in Readable.from() even when the limit is Infinity. That breaks the downstream
		// `instanceof IncomingMessage` checks in parseIncomingMessage / prepareBinaryData.
		maxContentLength: -1,
	};
	let configObject: IRequestOptions;
	if (typeof uriOrObject === 'string') {
		configObject = { uri: uriOrObject, ...options };
	} else {
		configObject = uriOrObject ?? {};
	}

	const ssrfBridge = additionalData?.ssrfBridge;
	const url = resolveLegacyRequestUrl(configObject);
	await validateUrlSsrf(url, ssrfBridge);

	axiosConfig = Object.assign(axiosConfig, await parseRequestObject(configObject, ssrfBridge));
	throwIfDomainNotAllowed(axiosConfig, configObject.allowedDomains);

	try {
		const response = await invokeAxios(axiosConfig, configObject.auth);
		let body = response.data;
		if (body instanceof IncomingMessage && axiosConfig.responseType === 'stream') {
			parseIncomingMessage(body);
		} else if (body === '') {
			body = axiosConfig.responseType === 'arraybuffer' ? Buffer.alloc(0) : undefined;
		}
		await additionalData?.hooks?.runHook('nodeFetchedData', [workflow?.id, node]);
		return configObject.resolveWithFullResponse
			? {
					body,
					headers: { ...response.headers },
					statusCode: response.status,
					statusMessage: response.statusText,
					request: response.request,
				}
			: body;
	} catch (error) {
		const { config, response } = error;

		// Axios hydrates the original error with more data. We extract them.
		// https://github.com/axios/axios/blob/master/lib/core/enhanceError.js
		// Note: `code` is ignored as it's an expected part of the errorData.
		if (error.isAxiosError) {
			error.config = error.request = undefined;
			error.options = pick(config ?? {}, ['url', 'method', 'data', 'headers']);
			if (response) {
				Container.get(Logger).debug('Request proxied to Axios failed', { status: response.status });
				let responseData = response.data;

				if (Buffer.isBuffer(responseData) || responseData instanceof Readable) {
					responseData = await binaryToString(responseData);
				}

				if (configObject.simple === false) {
					if (configObject.resolveWithFullResponse) {
						return {
							body: responseData,
							headers: response.headers,
							statusCode: response.status,
							statusMessage: response.statusText,
						};
					} else {
						return responseData;
					}
				}

				error.message = `${response.status as number} - ${JSON.stringify(responseData)}`;
				throw Object.assign(error, {
					statusCode: response.status,
					/**
					 * Axios adds `status` when serializing, causing `status` to be available only to the client.
					 * Hence we add it explicitly to allow the backend to use it when resolving expressions.
					 */
					status: response.status,
					error: responseData,
					response: pick(response, ['headers', 'status', 'statusText']),
				});
			} else if ('rejectUnauthorized' in configObject && error.code?.includes('CERT')) {
				throw new NodeSslError(error);
			}
		}

		throw error;
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

/** Validates a URL against SSRF protection rules. Throws UserError if blocked. */
async function validateUrlSsrf(url: string | undefined, ssrfBridge?: SsrfBridge): Promise<void> {
	if (!ssrfBridge || !url) return;

	const parsed = tryParseUrl(url);
	if (!parsed) return;

	const result = await ssrfBridge.validateUrl(parsed);
	if (!result.ok) {
		throw result.error;
	}
}

function resolveLegacyRequestUrl(requestObject: IRequestOptions): string | undefined {
	const rawUrl = requestObject.uri?.toString() ?? requestObject.url?.toString();
	const baseURL = requestObject.baseURL?.toString();
	return buildTargetUrl(rawUrl, baseURL) ?? rawUrl;
}

const NoBodyHttpMethods = ['GET', 'HEAD', 'OPTIONS'];

/** Remove empty request body on GET, HEAD, and OPTIONS requests */
export const removeEmptyBody = (requestOptions: IHttpRequestOptions | IRequestOptions) => {
	const method = requestOptions.method || 'GET';
	if (NoBodyHttpMethods.includes(method) && isEmpty(requestOptions.body)) {
		delete requestOptions.body;
	}
};

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
			body: result.data,
			headers: result.headers,
			statusCode: result.status,
			statusMessage: result.statusText,
		};
	}

	return result.data;
}

export async function httpRequestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
) {
	removeEmptyBody(requestOptions);

	// Cancel this request on execution cancellation
	if ('getExecutionCancelSignal' in this) {
		requestOptions.abortSignal = this.getExecutionCancelSignal();
	}

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;

	// Eval LLM mock: intercept before credential auth and OAuth signing
	if (additionalData.evalLlmMockHandler) {
		const evalMockResponse = await callEvalMockHandler(
			additionalData.evalLlmMockHandler,
			requestOptions,
			node,
			requestOptions.returnFullResponse,
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (parentTypes.includes('oAuth1Api')) {
			return await requestOAuth1.call(this, credentialsType, requestOptions, true);
		}
		if (parentTypes.includes('oAuth2Api')) {
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				additionalCredentialOptions?.oauth2,
				true,
			);
		}

		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted =
				await this.getCredentials<ICredentialDataDecryptedObject>(credentialsType);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set`,
				{ level: 'warning' },
			);
		}

		const data = await additionalData.credentialsHelper.preAuthentication(
			{ helpers: this.helpers },
			credentialsDecrypted,
			credentialsType,
			node,
			false,
		);

		if (data) {
			// make the updated property in the credentials
			// available to the authenticate method
			Object.assign(credentialsDecrypted, data);
		}

		requestOptions = await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions,
			workflow,
			node,
		);
		return await httpRequest(requestOptions, additionalData.ssrfBridge);
	} catch (error) {
		// if there is a pre authorization method defined and
		// the method failed due to unauthorized request
		if (
			error.response?.status === 401 &&
			additionalData.credentialsHelper.preAuthentication !== undefined
		) {
			try {
				if (credentialsDecrypted !== undefined) {
					// try to refresh the credentials
					const data = await additionalData.credentialsHelper.preAuthentication(
						{ helpers: this.helpers },
						credentialsDecrypted,
						credentialsType,
						node,
						true,
					);

					if (data) {
						// make the updated property in the credentials
						// available to the authenticate method
						Object.assign(credentialsDecrypted, data);
					}

					requestOptions = await additionalData.credentialsHelper.authenticate(
						credentialsDecrypted,
						credentialsType,
						requestOptions,
						workflow,
						node,
					);
				}
				return await httpRequest(requestOptions, additionalData.ssrfBridge);
			} catch (error) {
				throw new NodeApiError(this.getNode(), error);
			}
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

/** @deprecated use httpRequestWithAuthentication */
export async function requestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
	itemIndex?: number,
) {
	removeEmptyBody(requestOptions);

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;

	// Eval LLM mock: intercept before credential auth and OAuth signing (legacy path)
	if (additionalData.evalLlmMockHandler) {
		const evalMockResponse = await callEvalMockHandler(
			additionalData.evalLlmMockHandler,
			normalizeLegacyRequest(requestOptions),
			node,
			requestOptions.resolveWithFullResponse,
			'legacy',
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (credentialsType === 'oAuth1Api' || parentTypes.includes('oAuth1Api')) {
			return await requestOAuth1.call(this, credentialsType, requestOptions, false);
		}
		if (credentialsType === 'oAuth2Api' || parentTypes.includes('oAuth2Api')) {
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				additionalCredentialOptions?.oauth2,
				false,
			);
		}

		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted = await this.getCredentials<ICredentialDataDecryptedObject>(
				credentialsType,
				itemIndex,
			);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set`,
				{ level: 'warning' },
			);
		}

		const data = await additionalData.credentialsHelper.preAuthentication(
			{ helpers: this.helpers },
			credentialsDecrypted,
			credentialsType,
			node,
			false,
		);

		if (data) {
			// make the updated property in the credentials
			// available to the authenticate method
			Object.assign(credentialsDecrypted, data);
		}

		requestOptions = (await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions as IHttpRequestOptions,
			workflow,
			node,
		)) as IRequestOptions;
		return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
	} catch (error) {
		try {
			if (credentialsDecrypted !== undefined) {
				// try to refresh the credentials
				const data = await additionalData.credentialsHelper.preAuthentication(
					{ helpers: this.helpers },
					credentialsDecrypted,
					credentialsType,
					node,
					true,
				);

				if (data) {
					// make the updated property in the credentials
					// available to the authenticate method
					Object.assign(credentialsDecrypted, data);
					requestOptions = (await additionalData.credentialsHelper.authenticate(
						credentialsDecrypted,
						credentialsType,
						requestOptions as IHttpRequestOptions,
						workflow,
						node,
					)) as IRequestOptions;
					return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
				}
			}
			throw error;
		} catch (error) {
			if (error instanceof ExecutionBaseError) throw error;

			throw new NodeApiError(this.getNode(), error);
		}
	}
}

export const getRequestHelperFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData: IRunExecutionData | null = null,
	connectionInputData: INodeExecutionData[] = [],
): RequestHelperFunctions => {
	const getResolvedValue = (
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType => {
		const mode: WorkflowExecuteMode = 'internal';

		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			return workflow.expression.getParameterValue(
				parameterValue,
				runExecutionData,
				runIndex,
				itemIndex,
				node.name,
				connectionInputData,
				mode,
				additionalKeys ?? {},
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	};

	// Eval LLM mock handler: extract once for use in direct helpers below
	const evalLlmMock = additionalData.evalLlmMockHandler;

	return {
		httpRequest: async (requestOptions: IHttpRequestOptions) => {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					requestOptions,
					node,
					requestOptions.returnFullResponse,
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			if (additionalData.otel?.injectTraceHeaders) {
				requestOptions.headers ??= {};
				additionalData.otel.injectTraceHeaders(
					additionalData.executionId!,
					node.name,
					requestOptions.headers as Record<string, string>,
				);
			}
			return await httpRequest(requestOptions, additionalData.ssrfBridge);
		},
		async requestWithAuthenticationPaginated(
			this: IExecuteFunctions,
			requestOptions,
			itemIndex,
			paginationOptions,
			credentialsType,
			additionalCredentialOptions,
		): Promise<any[]> {
			return await requestWithAuthenticationPaginated.call(
				this,
				requestOptions,
				itemIndex,
				paginationOptions,
				getResolvedValue,
				node,
				credentialsType,
				additionalCredentialOptions,
			);
		},
		async httpRequestWithAuthentication(
			this,
			credentialsType,
			requestOptions,
			additionalCredentialOptions,
		): Promise<any> {
			return await httpRequestWithAuthentication.call(
				this,
				credentialsType,
				requestOptions,
				workflow,
				node,
				additionalData,
				additionalCredentialOptions,
			);
		},

		async refreshOAuth2Token(
			this: IAllExecuteFunctions,
			credentialsType: string,
			oAuth2Options?: IOAuth2Options,
		) {
			return await refreshOAuth2Token.call(
				this,
				credentialsType,
				node,
				additionalData,
				oAuth2Options,
			);
		},

		request: async (uriOrObject, options) => {
			if (evalLlmMock) {
				const wantsFull = typeof uriOrObject !== 'string' && uriOrObject.resolveWithFullResponse;
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(uriOrObject, options),
					node,
					wantsFull,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			if (additionalData.otel?.injectTraceHeaders) {
				const target = typeof uriOrObject === 'string' ? (options ??= {}) : uriOrObject;
				target.headers ??= {};
				additionalData.otel.injectTraceHeaders(
					additionalData.executionId!,
					node.name,
					target.headers as Record<string, string>,
				);
			}
			return await proxyRequestToAxios(workflow, additionalData, node, uriOrObject, options);
		},

		async requestWithAuthentication(
			this,
			credentialsType,
			requestOptions,
			additionalCredentialOptions,
			itemIndex,
		): Promise<any> {
			return await requestWithAuthentication.call(
				this,
				credentialsType,
				requestOptions,
				workflow,
				node,
				additionalData,
				additionalCredentialOptions,
				itemIndex,
			);
		},

		async requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IRequestOptions,
		): Promise<any> {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(requestOptions),
					node,
					requestOptions.resolveWithFullResponse,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			return await requestOAuth1.call(this, credentialsType, requestOptions);
		},

		async requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IRequestOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any> {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(requestOptions),
					node,
					requestOptions.resolveWithFullResponse,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				oAuth2Options,
			);
		},
	};
};
