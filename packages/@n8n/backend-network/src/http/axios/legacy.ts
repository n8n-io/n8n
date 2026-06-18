/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { AxiosHeaders, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import type FormData from 'form-data';
import { type AgentOptions } from 'https';
import type { GenericValue, IRequestOptions } from 'n8n-workflow';
import { stringify } from 'qs';

import { applyDefaultOutboundUserAgent } from './user-agent';
import {
	createFormDataObject,
	generateContentLengthHeader,
	getBeforeRedirectFn,
	getHostFromRequestObject,
	isFormDataInstance,
	searchForHeader,
	setAxiosAgents,
} from './utils';
import type { SsrfBridge } from '../../ssrf';

/**
 * This function is a temporary implementation that translates all http requests
 * done via the request library to axios directly.
 * We are not using n8n's interface as it would an unnecessary step,
 * considering the `request` helper has been be deprecated and should be removed.
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
export async function buildAxiosConfigFromLegacyRequest(
	requestObject: IRequestOptions,
	ssrfBridge?: SsrfBridge,
): Promise<AxiosRequestConfig> {
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
					? requestObject.form
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

	setAxiosAgents(axiosConfig, agentOptions, requestObject.proxy, ssrfBridge ?? 'disabled');

	axiosConfig.beforeRedirect = getBeforeRedirectFn(
		agentOptions,
		axiosConfig,
		requestObject.proxy,
		requestObject.sendCredentialsOnCrossOriginRedirect ?? true,
		requestObject.allowedDomains,
		ssrfBridge ?? 'disabled',
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
