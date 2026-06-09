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
import crypto from 'crypto';
import type FormData from 'form-data';
import { IncomingMessage } from 'http';
import { type AgentOptions } from 'https';
import pick from 'lodash/pick';
import type {
	GenericValue,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { NodeSslError } from 'n8n-workflow';
import { stringify } from 'qs';
import { Readable } from 'stream';

import type { SsrfBridge } from '@/ssrf';

import { binaryToString } from '../binary-helper-functions';
import { parseIncomingMessage } from '../parse-incoming-message';
import {
	createFormDataObject,
	generateContentLengthHeader,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	isFormDataInstance,
	resolveLegacyRequestUrl,
	searchForHeader,
	setAxiosAgents,
	throwIfDomainNotAllowed,
	validateUrlSsrf,
} from './axios-utils';
import { invokeAxios } from './http-request';
import { applyDefaultOutboundUserAgent } from './outbound-user-agent';

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
