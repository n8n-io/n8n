/* eslint-disable no-lonely-if */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
import {
	GenericValue,
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IBinaryData,
	IContextObject,
	ICredentialDataDecryptedObject,
	ICredentialsExpressionResolveValues,
	IDataObject,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IExecuteSingleFunctions,
	IExecuteWorkflowInfo,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	IOAuth2Options,
	IPollFunctions,
	IRunExecutionData,
	ITaskDataConnections,
	ITriggerFunctions,
	IWebhookData,
	IWebhookDescription,
	IWebhookFunctions,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	IWorkflowMetadata,
	NodeApiError,
	NodeHelpers,
	NodeOperationError,
	NodeParameterValue,
	Workflow,
	WorkflowActivateMode,
	WorkflowDataProxy,
	WorkflowExecuteMode,
	LoggerProxy as Logger,
	IExecuteData,
	OAuth2GrantType,
} from 'n8n-workflow';

import { Agent } from 'https';
import { stringify } from 'qs';
import clientOAuth1, { Token } from 'oauth-1.0a';
import clientOAuth2 from 'client-oauth2';
import crypto, { createHmac } from 'crypto';
// eslint-disable-next-line import/no-extraneous-dependencies
import { get } from 'lodash';
// eslint-disable-next-line import/no-extraneous-dependencies
import express from 'express';
import FormData from 'form-data';
import path from 'path';
import { OptionsWithUri, OptionsWithUrl } from 'request';
import requestPromise from 'request-promise-native';
import { fromBuffer } from 'file-type';
import { lookup } from 'mime-types';

import axios, {
	AxiosError,
	AxiosPromise,
	AxiosProxyConfig,
	AxiosRequestConfig,
	AxiosResponse,
	Method,
} from 'axios';
import url, { URL, URLSearchParams } from 'url';
import { BinaryDataManager } from './BinaryDataManager';
// eslint-disable-next-line import/no-cycle
import {
	ICredentialTestFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IResponseError,
	IWorkflowSettings,
	PLACEHOLDER_EMPTY_EXECUTION_ID,
} from '.';

axios.defaults.timeout = 300000;
// Prevent axios from adding x-form-www-urlencoded headers by default
axios.defaults.headers.post = {};
axios.defaults.headers.put = {};
axios.defaults.headers.patch = {};
axios.defaults.paramsSerializer = (params) => {
	if (params instanceof URLSearchParams) {
		return params.toString();
	}
	return stringify(params, { arrayFormat: 'indices' });
};

const requestPromiseWithDefaults = requestPromise.defaults({
	timeout: 300000, // 5 minutes
});

const pushFormDataValue = (form: FormData, key: string, value: any) => {
	if (value?.hasOwnProperty('value') && value.hasOwnProperty('options')) {
		// @ts-ignore
		form.append(key, value.value, value.options);
	} else {
		form.append(key, value);
	}
};

const createFormDataObject = (data: object) => {
	const formData = new FormData();
	const keys = Object.keys(data);
	keys.forEach((key) => {
		// @ts-ignore
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

function searchForHeader(headers: IDataObject, headerName: string) {
	if (headers === undefined) {
		return undefined;
	}

	const headerNames = Object.keys(headers);
	headerName = headerName.toLowerCase();
	return headerNames.find((thisHeader) => thisHeader.toLowerCase() === headerName);
}

async function generateContentLengthHeader(formData: FormData, headers: IDataObject) {
	if (!formData || !formData.getLength) {
		return;
	}
	try {
		const length = await new Promise((res, rej) => {
			formData.getLength((error: Error | null, length: number) => {
				if (error) {
					rej(error);
					return;
				}
				res(length);
			});
		});
		headers = Object.assign(headers, {
			'content-length': length,
		});
	} catch (error) {
		Logger.error('Unable to calculate form data length', { error });
	}
}

async function parseRequestObject(requestObject: IDataObject) {
	// This function is a temporary implementation
	// That translates all http requests done via
	// the request library to axios directly
	// We are not using n8n's interface as it would
	// an unnecessary step, considering the `request`
	// helper can be deprecated and removed.
	const axiosConfig: AxiosRequestConfig = {};

	if (requestObject.headers !== undefined) {
		axiosConfig.headers = requestObject.headers as string;
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
		(axiosConfig.headers[contentTypeHeaderKeyName] as string | undefined);
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
	} else if (contentType && contentType.includes('multipart/form-data') !== false) {
		if (requestObject.formData !== undefined && requestObject.formData instanceof FormData) {
			axiosConfig.data = requestObject.formData;
		} else {
			const allData = {
				...(requestObject.body as object | undefined),
				...(requestObject.formData as object | undefined),
			};

			axiosConfig.data = createFormDataObject(allData);
		}
		// replace the existing header with a new one that
		// contains the boundary property.
		// @ts-ignore
		delete axiosConfig.headers[contentTypeHeaderKeyName];
		const headers = axiosConfig.data.getHeaders();
		axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
		await generateContentLengthHeader(axiosConfig.data, axiosConfig.headers);
	} else {
		// When using the `form` property it means the content should be x-www-form-urlencoded.
		if (requestObject.form !== undefined && requestObject.body === undefined) {
			// If we have only form
			axiosConfig.data =
				typeof requestObject.form === 'string'
					? stringify(requestObject.form, { format: 'RFC3986' })
					: stringify(requestObject.form).toString();
			if (axiosConfig.headers !== undefined) {
				const headerName = searchForHeader(axiosConfig.headers, 'content-type');
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
				headers.forEach((header) =>
					header.toLowerCase() === 'content-type' ? delete axiosConfig.headers[header] : null,
				);
			}

			if (requestObject.formData instanceof FormData) {
				axiosConfig.data = requestObject.formData;
			} else {
				axiosConfig.data = createFormDataObject(requestObject.formData as object);
			}
			// Mix in headers as FormData creates the boundary.
			const headers = axiosConfig.data.getHeaders();
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, headers);
			await generateContentLengthHeader(axiosConfig.data, axiosConfig.headers);
		} else if (requestObject.body !== undefined) {
			// If we have body and possibly form
			if (requestObject.form !== undefined) {
				// merge both objects when exist.
				// @ts-ignore
				requestObject.body = Object.assign(requestObject.body, requestObject.form);
			}
			axiosConfig.data = requestObject.body as FormData | GenericValue | GenericValue[];
		}
	}

	if (requestObject.uri !== undefined) {
		axiosConfig.url = requestObject.uri?.toString() as string;
	}

	if (requestObject.url !== undefined) {
		axiosConfig.url = requestObject.url?.toString() as string;
	}

	if (requestObject.baseURL !== undefined) {
		axiosConfig.baseURL = requestObject.baseURL?.toString() as string;
	}

	if (requestObject.method !== undefined) {
		axiosConfig.method = requestObject.method as Method;
	}

	if (requestObject.qs !== undefined && Object.keys(requestObject.qs as object).length > 0) {
		axiosConfig.params = requestObject.qs as IDataObject;
	}

	if (
		requestObject.useQuerystring === true ||
		// @ts-ignore
		requestObject.qsStringifyOptions?.arrayFormat === 'repeat'
	) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'repeat' });
		};
	} else if (requestObject.useQuerystring === false) {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'indices' });
		};
	}

	// @ts-ignore
	if (requestObject.qsStringifyOptions?.arrayFormat === 'brackets') {
		axiosConfig.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: 'brackets' });
		};
	}

	if (requestObject.auth !== undefined) {
		// Check support for sendImmediately
		if ((requestObject.auth as IDataObject).bearer !== undefined) {
			axiosConfig.headers = Object.assign(axiosConfig.headers || {}, {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				Authorization: `Bearer ${(requestObject.auth as IDataObject).bearer}`,
			});
		} else {
			const authObj = requestObject.auth as IDataObject;
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
	if (
		requestObject.followRedirect === false &&
		((requestObject.method as string | undefined) || 'get').toLowerCase() === 'get'
	) {
		axiosConfig.maxRedirects = 0;
	}
	if (
		requestObject.followAllRedirects === false &&
		((requestObject.method as string | undefined) || 'get').toLowerCase() !== 'get'
	) {
		axiosConfig.maxRedirects = 0;
	}

	if (requestObject.rejectUnauthorized === false) {
		axiosConfig.httpsAgent = new Agent({
			rejectUnauthorized: false,
		});
	}

	if (requestObject.timeout !== undefined) {
		axiosConfig.timeout = requestObject.timeout as number;
	}

	if (requestObject.proxy !== undefined) {
		// try our best to parse the url provided.
		if (typeof requestObject.proxy === 'string') {
			try {
				const url = new URL(requestObject.proxy);
				axiosConfig.proxy = {
					host: url.hostname,
					port: parseInt(url.port, 10),
					protocol: url.protocol,
				};
				if (!url.port) {
					// Sets port to a default if not informed
					if (url.protocol === 'http') {
						axiosConfig.proxy.port = 80;
					} else if (url.protocol === 'https') {
						axiosConfig.proxy.port = 443;
					}
				}
				if (url.username || url.password) {
					axiosConfig.proxy.auth = {
						username: url.username,
						password: url.password,
					};
				}
			} catch (error) {
				// Not a valid URL. We will try to simply parse stuff
				// such as user:pass@host:port without protocol (we'll assume http)
				if (requestObject.proxy.includes('@')) {
					const [userpass, hostport] = requestObject.proxy.split('@');
					const [username, password] = userpass.split(':');
					const [hostname, port] = hostport.split(':');
					axiosConfig.proxy = {
						host: hostname,
						port: parseInt(port, 10),
						protocol: 'http',
						auth: {
							username,
							password,
						},
					};
				} else if (requestObject.proxy.includes(':')) {
					const [hostname, port] = requestObject.proxy.split(':');
					axiosConfig.proxy = {
						host: hostname,
						port: parseInt(port, 10),
						protocol: 'http',
					};
				} else {
					axiosConfig.proxy = {
						host: requestObject.proxy,
						port: 80,
						protocol: 'http',
					};
				}
			}
		} else {
			axiosConfig.proxy = requestObject.proxy as AxiosProxyConfig;
		}
	}

	if (requestObject.encoding === null) {
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

	/**
	 * Missing properties:
	 * encoding (need testing)
	 * gzip (ignored - default already works)
	 * resolveWithFullResponse (implemented elsewhere)
	 * simple (???)
	 */

	return axiosConfig;
}

function digestAuthAxiosConfig(
	axiosConfig: AxiosRequestConfig,
	response: AxiosResponse,
	auth: AxiosRequestConfig['auth'],
): AxiosRequestConfig {
	const authDetails = response.headers['www-authenticate']
		.split(',')
		.map((v: string) => v.split('='));
	if (authDetails) {
		const nonceCount = `000000001`;
		const cnonce = crypto.randomBytes(24).toString('hex');
		const realm: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('realm') > -1)[1]
			.replace(/"/g, '');
		const opaque: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('opaque') > -1)[1]
			.replace(/"/g, '');
		const nonce: string = authDetails
			.find((el: any) => el[0].toLowerCase().indexOf('nonce') > -1)[1]
			.replace(/"/g, '');
		const ha1 = crypto
			.createHash('md5')
			.update(`${auth?.username as string}:${realm}:${auth?.password as string}`)
			.digest('hex');
		const path = new url.URL(axiosConfig.url!).pathname;
		const ha2 = crypto
			.createHash('md5')
			.update(`${axiosConfig.method ?? 'GET'}:${path}`)
			.digest('hex');
		const response = crypto
			.createHash('md5')
			.update(`${ha1}:${nonce}:${nonceCount}:${cnonce}:auth:${ha2}`)
			.digest('hex');
		const authorization =
			`Digest username="${auth?.username as string}",realm="${realm}",` +
			`nonce="${nonce}",uri="${path}",qop="auth",algorithm="MD5",` +
			`response="${response}",nc="${nonceCount}",cnonce="${cnonce}",opaque="${opaque}"`;
		if (axiosConfig.headers) {
			axiosConfig.headers.authorization = authorization;
		} else {
			axiosConfig.headers = { authorization };
		}
	}
	return axiosConfig;
}

async function proxyRequestToAxios(
	uriOrObject: string | IDataObject,
	options?: IDataObject,
): Promise<any> {
	// tslint:disable-line:no-any

	// Check if there's a better way of getting this config here
	if (process.env.N8N_USE_DEPRECATED_REQUEST_LIB) {
		// @ts-ignore
		return requestPromiseWithDefaults.call(null, uriOrObject, options);
	}

	let axiosConfig: AxiosRequestConfig = {
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	};
	let axiosPromise: AxiosPromise;
	type ConfigObject = {
		auth?: { sendImmediately: boolean };
		resolveWithFullResponse?: boolean;
		simple?: boolean;
	};
	let configObject: ConfigObject;
	if (uriOrObject !== undefined && typeof uriOrObject === 'string') {
		axiosConfig.url = uriOrObject;
	}
	if (uriOrObject !== undefined && typeof uriOrObject === 'object') {
		configObject = uriOrObject;
	} else {
		configObject = options || {};
	}

	axiosConfig = Object.assign(axiosConfig, await parseRequestObject(configObject));

	Logger.debug(
		'Proxying request to axios',
		// {
		// 	originalConfig: configObject,
		// 	parsedConfig: axiosConfig,
		// }
	);

	if (configObject.auth?.sendImmediately === false) {
		// for digest-auth
		const { auth } = axiosConfig;
		delete axiosConfig.auth;
		// eslint-disable-next-line no-async-promise-executor
		axiosPromise = new Promise(async (resolve, reject) => {
			try {
				const result = await axios(axiosConfig);
				resolve(result);
			} catch (resp: any) {
				if (
					resp.response === undefined ||
					resp.response.status !== 401 ||
					!resp.response.headers['www-authenticate']?.includes('nonce')
				) {
					reject(resp);
				}
				axiosConfig = digestAuthAxiosConfig(axiosConfig, resp.response, auth);
				resolve(axios(axiosConfig));
			}
		});
	} else {
		axiosPromise = axios(axiosConfig);
	}

	return new Promise((resolve, reject) => {
		axiosPromise
			.then((response) => {
				if (configObject.resolveWithFullResponse === true) {
					let body = response.data;
					if (response.data === '') {
						if (axiosConfig.responseType === 'arraybuffer') {
							body = Buffer.alloc(0);
						} else {
							body = undefined;
						}
					}
					resolve({
						body,
						headers: response.headers,
						statusCode: response.status,
						statusMessage: response.statusText,
						request: response.request,
					});
				} else {
					let body = response.data;
					if (response.data === '') {
						if (axiosConfig.responseType === 'arraybuffer') {
							body = Buffer.alloc(0);
						} else {
							body = undefined;
						}
					}
					resolve(body);
				}
			})
			.catch((error) => {
				if (configObject.simple === false && error.response) {
					if (configObject.resolveWithFullResponse) {
						resolve({
							body: error.response.data,
							headers: error.response.headers,
							statusCode: error.response.status,
							statusMessage: error.response.statusText,
						});
					} else {
						resolve(error.response.data);
					}
					return;
				}

				Logger.debug('Request proxied to Axios failed', { error });

				// Axios hydrates the original error with more data. We extract them.
				// https://github.com/axios/axios/blob/master/lib/core/enhanceError.js
				// Note: `code` is ignored as it's an expected part of the errorData.
				const { request, response, isAxiosError, toJSON, config, ...errorData } = error;
				if (response) {
					error.message = `${response.status as number} - ${JSON.stringify(response.data)}`;
				}

				error.cause = errorData;
				error.error = error.response?.data || errorData;
				error.statusCode = error.response?.status;
				error.options = config || {};

				// Remove not needed data and so also remove circular references
				error.request = undefined;
				error.config = undefined;
				error.options.adapter = undefined;
				error.options.httpsAgent = undefined;
				error.options.paramsSerializer = undefined;
				error.options.transformRequest = undefined;
				error.options.transformResponse = undefined;
				error.options.validateStatus = undefined;

				reject(error);
			});
	});
}

function convertN8nRequestToAxios(n8nRequest: IHttpRequestOptions): AxiosRequestConfig {
	// Destructure properties with the same name first.
	const { headers, method, timeout, auth, proxy, url } = n8nRequest;

	const axiosRequest = {
		headers: headers ?? {},
		method,
		timeout,
		auth,
		proxy,
		url,
	} as AxiosRequestConfig;

	axiosRequest.params = n8nRequest.qs;

	if (n8nRequest.baseURL !== undefined) {
		axiosRequest.baseURL = n8nRequest.baseURL;
	}

	if (n8nRequest.disableFollowRedirect === true) {
		axiosRequest.maxRedirects = 0;
	}

	if (n8nRequest.encoding !== undefined) {
		axiosRequest.responseType = n8nRequest.encoding;
	}

	if (n8nRequest.skipSslCertificateValidation === true) {
		axiosRequest.httpsAgent = new Agent({
			rejectUnauthorized: false,
		});
	}

	if (n8nRequest.arrayFormat !== undefined) {
		axiosRequest.paramsSerializer = (params) => {
			return stringify(params, { arrayFormat: n8nRequest.arrayFormat });
		};
	}

	// if there is a body and it's empty (does not have properties),
	// make sure not to send anything in it as some services fail when
	// sending GET request with empty body.
	if (n8nRequest.body && Object.keys(n8nRequest.body).length) {
		axiosRequest.data = n8nRequest.body;
		// Let's add some useful header standards here.
		const existingContentTypeHeaderKey = searchForHeader(axiosRequest.headers, 'content-type');
		if (existingContentTypeHeaderKey === undefined) {
			// We are only setting content type headers if the user did
			// not set it already manually. We're not overriding, even if it's wrong.
			if (axiosRequest.data instanceof FormData) {
				axiosRequest.headers = axiosRequest.headers || {};
				axiosRequest.headers['Content-Type'] = 'multipart/form-data';
			} else if (axiosRequest.data instanceof URLSearchParams) {
				axiosRequest.headers = axiosRequest.headers || {};
				axiosRequest.headers['Content-Type'] = 'application/x-www-form-urlencoded';
			}
		} else if (
			axiosRequest.headers[existingContentTypeHeaderKey] === 'application/x-www-form-urlencoded'
		) {
			axiosRequest.data = new URLSearchParams(n8nRequest.body as Record<string, string>);
		}
	}

	if (n8nRequest.json) {
		const key = searchForHeader(axiosRequest.headers, 'accept');
		// If key exists, then the user has set both accept
		// header and the json flag. Header should take precedence.
		if (!key) {
			axiosRequest.headers.Accept = 'application/json';
		}
	}

	const userAgentHeader = searchForHeader(axiosRequest.headers, 'user-agent');
	// If key exists, then the user has set both accept
	// header and the json flag. Header should take precedence.
	if (!userAgentHeader) {
		axiosRequest.headers['User-Agent'] = 'n8n';
	}

	if (n8nRequest.ignoreHttpStatusErrors) {
		axiosRequest.validateStatus = () => true;
	}

	return axiosRequest;
}

async function httpRequest(
	requestOptions: IHttpRequestOptions,
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
	const axiosRequest = convertN8nRequestToAxios(requestOptions);
	if (
		axiosRequest.data === undefined ||
		(axiosRequest.method !== undefined && axiosRequest.method.toUpperCase() === 'GET')
	) {
		delete axiosRequest.data;
	}
	const result = await axios(axiosRequest);
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

/**
 * Returns binary data buffer for given item index and property name.
 *
 * @export
 * @param {ITaskDataConnections} inputData
 * @param {number} itemIndex
 * @param {string} propertyName
 * @param {number} inputIndex
 * @returns {Promise<Buffer>}
 */
export async function getBinaryDataBuffer(
	inputData: ITaskDataConnections,
	itemIndex: number,
	propertyName: string,
	inputIndex: number,
): Promise<Buffer> {
	const binaryData = inputData.main![inputIndex]![itemIndex]!.binary![propertyName]!;
	return BinaryDataManager.getInstance().retrieveBinaryData(binaryData);
}

/**
 * Takes a buffer and converts it into the format n8n uses. It encodes the binary data as
 * base64 and adds metadata.
 *
 * @export
 * @param {Buffer} binaryData
 * @param {string} [filePath]
 * @param {string} [mimeType]
 * @returns {Promise<IBinaryData>}
 */
export async function prepareBinaryData(
	binaryData: Buffer,
	executionId: string,
	filePath?: string,
	mimeType?: string,
): Promise<IBinaryData> {
	let fileExtension: string | undefined;
	if (!mimeType) {
		// If no mime type is given figure it out

		if (filePath) {
			// Use file path to guess mime type
			const mimeTypeLookup = lookup(filePath);
			if (mimeTypeLookup) {
				mimeType = mimeTypeLookup;
			}
		}

		if (!mimeType) {
			// Use buffer to guess mime type
			const fileTypeData = await fromBuffer(binaryData);
			if (fileTypeData) {
				mimeType = fileTypeData.mime;
				fileExtension = fileTypeData.ext;
			}
		}

		if (!mimeType) {
			// Fall back to text
			mimeType = 'text/plain';
		}
	}

	const returnData: IBinaryData = {
		mimeType,
		fileExtension,
		data: '',
	};

	if (filePath) {
		if (filePath.includes('?')) {
			// Remove maybe present query parameters
			filePath = filePath.split('?').shift();
		}

		const filePathParts = path.parse(filePath as string);

		if (filePathParts.dir !== '') {
			returnData.directory = filePathParts.dir;
		}
		returnData.fileName = filePathParts.base;

		// Remove the dot
		const fileExtension = filePathParts.ext.slice(1);
		if (fileExtension) {
			returnData.fileExtension = fileExtension;
		}
	}

	return BinaryDataManager.getInstance().storeBinaryData(returnData, binaryData, executionId);
}

/**
 * Makes a request using OAuth data for authentication
 *
 * @export
 * @param {IAllExecuteFunctions} this
 * @param {string} credentialsType
 * @param {(OptionsWithUri | requestPromise.RequestPromiseOptions)} requestOptions
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 *
 * @returns
 */
export async function requestOAuth2(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions | IHttpRequestOptions,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
	isN8nRequest = false,
) {
	const credentials = await this.getCredentials(credentialsType);

	// Only the OAuth2 with authorization code grant needs connection
	if (
		credentials.grantType === OAuth2GrantType.authorizationCode &&
		credentials.oauthTokenData === undefined
	) {
		throw new Error('OAuth credentials not connected!');
	}

	const oAuthClient = new clientOAuth2({
		clientId: credentials.clientId as string,
		clientSecret: credentials.clientSecret as string,
		accessTokenUri: credentials.accessTokenUrl as string,
		scopes: (credentials.scope as string).split(' '),
	});

	let oauthTokenData = credentials.oauthTokenData as clientOAuth2.Data;
	// if it's the first time using the credentials, get the access token and save it into the DB.
	if (credentials.grantType === OAuth2GrantType.clientCredentials && oauthTokenData === undefined) {
		const { data } = await oAuthClient.credentials.getToken();

		// Find the credentials
		if (!node.credentials || !node.credentials[credentialsType]) {
			throw new Error(
				`The node "${node.name}" does not have credentials of type "${credentialsType}"!`,
			);
		}

		const nodeCredentials = node.credentials[credentialsType];

		// Save the refreshed token
		await additionalData.credentialsHelper.updateCredentials(
			nodeCredentials,
			credentialsType,
			credentials as unknown as ICredentialDataDecryptedObject,
		);

		oauthTokenData = data;
	}

	const token = oAuthClient.createToken(
		get(oauthTokenData, oAuth2Options?.property as string) || oauthTokenData.accessToken,
		oauthTokenData.refreshToken,
		oAuth2Options?.tokenType || oauthTokenData.tokenType,
		oauthTokenData,
	);
	// Signs the request by adding authorization headers or query parameters depending
	// on the token-type used.
	const newRequestOptions = token.sign(requestOptions as clientOAuth2.RequestObject);
	// If keep bearer is false remove the it from the authorization header
	if (oAuth2Options?.keepBearer === false) {
		// @ts-ignore
		newRequestOptions?.headers?.Authorization =
			// @ts-ignore
			newRequestOptions?.headers?.Authorization.split(' ')[1];
	}

	if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
		Object.assign(newRequestOptions.headers, {
			[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
		});
	}

	if (isN8nRequest) {
		return this.helpers.httpRequest(newRequestOptions).catch(async (error: AxiosError) => {
			if (error.response?.status === 401) {
				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" expired. Should revalidate.`,
				);
				const tokenRefreshOptions: IDataObject = {};
				if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
					const body: IDataObject = {
						client_id: credentials.clientId as string,
						client_secret: credentials.clientSecret as string,
					};
					tokenRefreshOptions.body = body;
					tokenRefreshOptions.headers = {
						Authorization: '',
					};
				}

				let newToken;

				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
				);
				// if it's OAuth2 with client credentials grant type, get a new token
				// instead of refreshing it.
				if (OAuth2GrantType.clientCredentials === credentials.grantType) {
					newToken = await token.client.credentials.getToken();
				} else {
					newToken = await token.refresh(tokenRefreshOptions);
				}

				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
				);

				credentials.oauthTokenData = newToken.data;
				// Find the credentials
				if (!node.credentials || !node.credentials[credentialsType]) {
					throw new Error(
						`The node "${node.name}" does not have credentials of type "${credentialsType}"!`,
					);
				}
				const nodeCredentials = node.credentials[credentialsType];
				await additionalData.credentialsHelper.updateCredentials(
					nodeCredentials,
					credentialsType,
					credentials,
				);
				const refreshedRequestOption = newToken.sign(requestOptions as clientOAuth2.RequestObject);

				if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
					Object.assign(newRequestOptions.headers, {
						[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
					});
				}

				return this.helpers.httpRequest(refreshedRequestOption);
			}
			throw error;
		});
	}

	return this.helpers.request!(newRequestOptions).catch(async (error: IResponseError) => {
		const statusCodeReturned =
			oAuth2Options?.tokenExpiredStatusCode === undefined
				? 401
				: oAuth2Options?.tokenExpiredStatusCode;

		if (error.statusCode === statusCodeReturned) {
			// Token is probably not valid anymore. So try refresh it.

			const tokenRefreshOptions: IDataObject = {};

			if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
				const body: IDataObject = {
					client_id: credentials.clientId,
					client_secret: credentials.clientSecret,
				};
				tokenRefreshOptions.body = body;
				// Override authorization property so the credentails are not included in it
				tokenRefreshOptions.headers = {
					Authorization: '',
				};
			}

			Logger.debug(
				`OAuth2 token for "${credentialsType}" used by node "${node.name}" expired. Should revalidate.`,
			);

			let newToken;

			// if it's OAuth2 with client credentials grant type, get a new token
			// instead of refreshing it.
			if (OAuth2GrantType.clientCredentials === credentials.grantType) {
				newToken = await token.client.credentials.getToken();
			} else {
				newToken = await token.refresh(tokenRefreshOptions);
			}

			Logger.debug(
				`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
			);

			credentials.oauthTokenData = newToken.data;

			// Find the credentials
			if (!node.credentials || !node.credentials[credentialsType]) {
				throw new Error(
					`The node "${node.name}" does not have credentials of type "${credentialsType}"!`,
				);
			}
			const nodeCredentials = node.credentials[credentialsType];

			// Save the refreshed token
			await additionalData.credentialsHelper.updateCredentials(
				nodeCredentials,
				credentialsType,
				credentials as unknown as ICredentialDataDecryptedObject,
			);

			Logger.debug(
				`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been saved to database successfully.`,
			);

			// Make the request again with the new token
			const newRequestOptions = newToken.sign(requestOptions as clientOAuth2.RequestObject);

			if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
				Object.assign(newRequestOptions.headers, {
					[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
				});
			}

			return this.helpers.request!(newRequestOptions);
		}

		// Unknown error so simply throw it
		throw error;
	});
}

/* Makes a request using OAuth1 data for authentication
 *
 * @export
 * @param {IAllExecuteFunctions} this
 * @param {string} credentialsType
 * @param {(OptionsWithUrl | requestPromise.RequestPromiseOptions)} requestOptionså
 * @returns
 */
export async function requestOAuth1(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions:
		| OptionsWithUrl
		| OptionsWithUri
		| requestPromise.RequestPromiseOptions
		| IHttpRequestOptions,
	isN8nRequest = false,
) {
	const credentials = await this.getCredentials(credentialsType);

	if (credentials === undefined) {
		throw new Error('No credentials were returned!');
	}

	if (credentials.oauthTokenData === undefined) {
		throw new Error('OAuth credentials not connected!');
	}

	const oauth = new clientOAuth1({
		consumer: {
			key: credentials.consumerKey as string,
			secret: credentials.consumerSecret as string,
		},
		signature_method: credentials.signatureMethod as string,
		hash_function(base, key) {
			const algorithm = credentials.signatureMethod === 'HMAC-SHA1' ? 'sha1' : 'sha256';
			return createHmac(algorithm, key).update(base).digest('base64');
		},
	});

	const oauthTokenData = credentials.oauthTokenData as IDataObject;

	const token: Token = {
		key: oauthTokenData.oauth_token as string,
		secret: oauthTokenData.oauth_token_secret as string,
	};

	// @ts-ignore
	requestOptions.data = { ...requestOptions.qs, ...requestOptions.form };

	// Fixes issue that OAuth1 library only works with "url" property and not with "uri"
	// @ts-ignore
	if (requestOptions.uri && !requestOptions.url) {
		// @ts-ignore
		requestOptions.url = requestOptions.uri;
		// @ts-ignore
		delete requestOptions.uri;
	}

	// @ts-ignore
	requestOptions.headers = oauth.toHeader(oauth.authorize(requestOptions, token));
	if (isN8nRequest) {
		return this.helpers.httpRequest(requestOptions as IHttpRequestOptions);
	}

	return this.helpers.request!(requestOptions).catch(async (error: IResponseError) => {
		// Unknown error so simply throw it
		throw error;
	});
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

		let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted = await this.getCredentials(credentialsType);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set!`,
			);
		}

		requestOptions = await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions,
			workflow,
			node,
			additionalData.timezone,
		);
		return await httpRequest(requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Takes generic input data and brings it into the json format n8n uses.
 *
 * @export
 * @param {(IDataObject | IDataObject[])} jsonData
 * @returns {INodeExecutionData[]}
 */
export function returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] {
	const returnData: INodeExecutionData[] = [];

	if (!Array.isArray(jsonData)) {
		jsonData = [jsonData];
	}

	jsonData.forEach((data) => {
		returnData.push({ json: data });
	});

	return returnData;
}

/**
 * Automatically put the objects under a 'json' key and don't error,
 * if some objects contain json/binary keys and others don't, throws error 'Inconsistent item format'
 *
 * @export
 * @param {INodeExecutionData | INodeExecutionData[]} executionData
 * @returns {INodeExecutionData[]}
 */
export function normalizeItems(
	executionData: INodeExecutionData | INodeExecutionData[],
): INodeExecutionData[] {
	if (typeof executionData === 'object' && !Array.isArray(executionData))
		executionData = [{ json: executionData as IDataObject }];
	if (executionData.every((item) => typeof item === 'object' && 'json' in item))
		return executionData;

	if (executionData.some((item) => typeof item === 'object' && 'json' in item)) {
		throw new Error('Inconsistent item format');
	}

	if (executionData.every((item) => typeof item === 'object' && 'binary' in item)) {
		const normalizedItems: INodeExecutionData[] = [];
		executionData.forEach((item) => {
			const json = Object.keys(item).reduce((acc, key) => {
				if (key === 'binary') return acc;
				return { ...acc, [key]: item[key] };
			}, {});

			normalizedItems.push({
				json,
				binary: item.binary,
			});
		});
		return normalizedItems;
	}

	if (executionData.some((item) => typeof item === 'object' && 'binary' in item)) {
		throw new Error('Inconsistent item format');
	}

	return executionData.map((item) => {
		return { json: item };
	});
}

// TODO: Move up later
export async function requestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
) {
	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (parentTypes.includes('oAuth1Api')) {
			return await requestOAuth1.call(this, credentialsType, requestOptions, false);
		}
		if (parentTypes.includes('oAuth2Api')) {
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

		let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted = await this.getCredentials(credentialsType);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set!`,
			);
		}

		requestOptions = await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions as IHttpRequestOptions,
			workflow,
			node,
			additionalData.timezone,
		);

		return await proxyRequestToAxios(requestOptions as IDataObject);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Returns the additional keys for Expressions and Function-Nodes
 *
 * @export
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {(IWorkflowDataProxyAdditionalKeys)}
 */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId || PLACEHOLDER_EMPTY_EXECUTION_ID;
	return {
		$executionId: executionId,
		$resumeWebhookUrl: `${additionalData.webhookWaitingBaseUrl}/${executionId}`,
	};
}

/**
 * Returns the requested decrypted credentials if the node has access to them.
 *
 * @export
 * @param {Workflow} workflow Workflow which requests the data
 * @param {INode} node Node which request the data
 * @param {string} type The credential type to return
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {(ICredentialDataDecryptedObject | undefined)}
 */
export async function getCredentials(
	workflow: Workflow,
	node: INode,
	type: string,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData?: IRunExecutionData | null,
	runIndex?: number,
	connectionInputData?: INodeExecutionData[],
	itemIndex?: number,
): Promise<ICredentialDataDecryptedObject> {
	// Get the NodeType as it has the information if the credentials are required
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (nodeType === undefined) {
		throw new NodeOperationError(
			node,
			`Node type "${node.type}" is not known so can not get credentials!`,
		);
	}

	// Hardcode for now for security reasons that only a single node can access
	// all credentials
	const fullAccess = ['n8n-nodes-base.httpRequest'].includes(node.type);

	let nodeCredentialDescription: INodeCredentialDescription | undefined;
	if (!fullAccess) {
		if (nodeType.description.credentials === undefined) {
			throw new NodeOperationError(
				node,
				`Node type "${node.type}" does not have any credentials defined!`,
			);
		}

		nodeCredentialDescription = nodeType.description.credentials.find(
			(credentialTypeDescription) => credentialTypeDescription.name === type,
		);
		if (nodeCredentialDescription === undefined) {
			throw new NodeOperationError(
				node,
				`Node type "${node.type}" does not have any credentials of type "${type}" defined!`,
			);
		}

		if (
			!NodeHelpers.displayParameter(
				additionalData.currentNodeParameters || node.parameters,
				nodeCredentialDescription,
				node,
				node.parameters,
			)
		) {
			// Credentials should not be displayed even if they would be defined
			throw new NodeOperationError(node, 'Credentials not found');
		}
	}

	// Check if node has any credentials defined
	if (!fullAccess && (!node.credentials || !node.credentials[type])) {
		// If none are defined check if the credentials are required or not

		if (nodeCredentialDescription?.required === true) {
			// Credentials are required so error
			if (!node.credentials) {
				throw new NodeOperationError(node, 'Node does not have any credentials set!');
			}
			if (!node.credentials[type]) {
				throw new NodeOperationError(node, `Node does not have any credentials set for "${type}"!`);
			}
		} else {
			// Credentials are not required
			throw new NodeOperationError(node, 'Node does not require credentials');
		}
	}

	if (fullAccess && (!node.credentials || !node.credentials[type])) {
		// Make sure that fullAccess nodes still behave like before that if they
		// request access to credentials that are currently not set it returns undefined
		throw new NodeOperationError(node, 'Credentials not found');
	}

	let expressionResolveValues: ICredentialsExpressionResolveValues | undefined;
	if (connectionInputData && runExecutionData && runIndex !== undefined) {
		expressionResolveValues = {
			connectionInputData,
			itemIndex: itemIndex || 0,
			node,
			runExecutionData,
			runIndex,
			workflow,
		} as ICredentialsExpressionResolveValues;
	}

	const nodeCredentials = node.credentials
		? node.credentials[type]
		: ({} as INodeCredentialsDetails);

	// TODO: solve using credentials via expression
	// if (name.charAt(0) === '=') {
	// 	// If the credential name is an expression resolve it
	// 	const additionalKeys = getAdditionalKeys(additionalData);
	// 	name = workflow.expression.getParameterValue(
	// 		name,
	// 		runExecutionData || null,
	// 		runIndex || 0,
	// 		itemIndex || 0,
	// 		node.name,
	// 		connectionInputData || [],
	// 		mode,
	// 		additionalKeys,
	// 	) as string;
	// }

	const decryptedDataObject = await additionalData.credentialsHelper.getDecrypted(
		nodeCredentials,
		type,
		mode,
		additionalData.timezone,
		false,
		expressionResolveValues,
	);

	return decryptedDataObject;
}

/**
 * Returns a copy of the node
 *
 * @export
 * @param {INode} node
 * @returns {INode}
 */
export function getNode(node: INode): INode {
	return JSON.parse(JSON.stringify(node));
}

/**
 * Clean up parameter data to make sure that only valid data gets returned
 * INFO: Currently only converts Luxon Dates as we know for sure it will not be breaking
 */
function cleanupParameterData(
	inputData: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
	if (inputData === null || inputData === undefined) {
		return inputData;
	}

	if (Array.isArray(inputData)) {
		inputData.forEach((value) => cleanupParameterData(value));
		return inputData;
	}

	if (inputData.constructor.name === 'DateTime') {
		// Is a special luxon date so convert to string
		return inputData.toString();
	}

	if (typeof inputData === 'object') {
		Object.keys(inputData).forEach((key) => {
			inputData[key] = cleanupParameterData(inputData[key]);
		});
	}

	return inputData;
}

/**
 * Returns the requested resolved (all expressions replaced) node parameters.
 *
 * @export
 * @param {Workflow} workflow
 * @param {(IRunExecutionData | null)} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {INode} node
 * @param {string} parameterName
 * @param {number} itemIndex
 * @param {*} [fallbackValue]
 * @returns {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object)}
 */
export function getNodeParameter(
	workflow: Workflow,
	runExecutionData: IRunExecutionData | null,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	node: INode,
	parameterName: string,
	itemIndex: number,
	mode: WorkflowExecuteMode,
	timezone: string,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	executeData?: IExecuteData,
	fallbackValue?: any,
): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | object {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (nodeType === undefined) {
		throw new Error(`Node type "${node.type}" is not known so can not return paramter value!`);
	}

	const value = get(node.parameters, parameterName, fallbackValue);

	if (value === undefined) {
		throw new Error(`Could not get parameter "${parameterName}"!`);
	}

	let returnData;
	try {
		returnData = workflow.expression.getParameterValue(
			value,
			runExecutionData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			timezone,
			additionalKeys,
			executeData,
		);

		returnData = cleanupParameterData(returnData);
	} catch (e) {
		if (e.context) e.context.parameter = parameterName;
		e.cause = value;
		throw e;
	}

	return returnData;
}

/**
 * Returns if execution should be continued even if there was an error.
 *
 * @export
 * @param {INode} node
 * @returns {boolean}
 */
export function continueOnFail(node: INode): boolean {
	return get(node, 'continueOnFail', false);
}

/**
 * Returns the webhook URL of the webhook with the given name
 *
 * @export
 * @param {string} name
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {boolean} [isTest]
 * @returns {(string | undefined)}
 */
export function getNodeWebhookUrl(
	name: string,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	timezone: string,
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	isTest?: boolean,
): string | undefined {
	let baseUrl = additionalData.webhookBaseUrl;
	if (isTest === true) {
		baseUrl = additionalData.webhookTestBaseUrl;
	}

	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	const webhookDescription = getWebhookDescription(name, workflow, node);
	if (webhookDescription === undefined) {
		return undefined;
	}

	const path = workflow.expression.getSimpleParameterValue(
		node,
		webhookDescription.path,
		mode,
		timezone,
		additionalKeys,
	);
	if (path === undefined) {
		return undefined;
	}

	const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
		node,
		webhookDescription.isFullPath,
		mode,
		timezone,
		additionalKeys,
		undefined,
		false,
	) as boolean;
	return NodeHelpers.getNodeWebhookUrl(baseUrl, workflow.id!, node, path.toString(), isFullPath);
}

/**
 * Returns the timezone for the workflow
 *
 * @export
 * @param {Workflow} workflow
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {string}
 */
export function getTimezone(
	workflow: Workflow,
	additionalData: IWorkflowExecuteAdditionalData,
): string {
	// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
	if (workflow.settings !== undefined && workflow.settings.timezone !== undefined) {
		return (workflow.settings as IWorkflowSettings).timezone as string;
	}
	return additionalData.timezone;
}

/**
 * Returns the full webhook description of the webhook with the given name
 *
 * @export
 * @param {string} name
 * @param {Workflow} workflow
 * @param {INode} node
 * @returns {(IWebhookDescription | undefined)}
 */
export function getWebhookDescription(
	name: string,
	workflow: Workflow,
	node: INode,
): IWebhookDescription | undefined {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion) as INodeType;

	if (nodeType.description.webhooks === undefined) {
		// Node does not have any webhooks so return
		return undefined;
	}

	// eslint-disable-next-line no-restricted-syntax
	for (const webhookDescription of nodeType.description.webhooks) {
		if (webhookDescription.name === name) {
			return webhookDescription;
		}
	}

	return undefined;
}

/**
 * Returns the workflow metadata
 *
 * @export
 * @param {Workflow} workflow
 * @returns {IWorkflowMetadata}
 */
export function getWorkflowMetadata(workflow: Workflow): IWorkflowMetadata {
	return {
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
	};
}

/**
 * Returns the execute functions the poll nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {ITriggerFunctions}
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowRunner.add
export function getExecutePollFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
): IPollFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			__emit: (data: INodeExecutionData[][]): void => {
				throw new Error('Overwrite NodeExecuteFunctions.getExecutePullFunctions.__emit function!');
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(workflow, node, type, additionalData, mode);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					undefined,
					fallbackValue,
				);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				httpRequest,
				async prepareBinaryData(
					binaryData: Buffer,
					filePath?: string,
					mimeType?: string,
				): Promise<IBinaryData> {
					return prepareBinaryData.call(
						this,
						binaryData,
						additionalData.executionId!,
						filePath,
						mimeType,
					);
				},
				request: proxyRequestToAxios,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				returnJsonArray,
			},
		};
	})(workflow, node);
}

/**
 * Returns the execute functions the trigger nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {ITriggerFunctions}
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowRunner.add
export function getExecuteTriggerFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
): ITriggerFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			emit: (data: INodeExecutionData[][]): void => {
				throw new Error('Overwrite NodeExecuteFunctions.getExecuteTriggerFunctions.emit function!');
			},
			emitError: (error: Error): void => {
				throw new Error('Overwrite NodeExecuteFunctions.getExecuteTriggerFunctions.emit function!');
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(workflow, node, type, additionalData, mode);
			},
			getNode: () => {
				return getNode(node);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					undefined,
					fallbackValue,
				);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				async prepareBinaryData(
					binaryData: Buffer,
					filePath?: string,
					mimeType?: string,
				): Promise<IBinaryData> {
					return prepareBinaryData.call(
						this,
						binaryData,
						additionalData.executionId!,
						filePath,
						mimeType,
					);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				returnJsonArray,
			},
		};
	})(workflow, node);
}

/**
 * Returns the execute functions regular nodes have access to.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {ITaskDataConnections} inputData
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IExecuteFunctions}
 */
export function getExecuteFunctions(
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	inputData: ITaskDataConnections,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
): IExecuteFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node) => {
		return {
			continueOnFail: () => {
				return continueOnFail(node);
			},
			evaluateExpression: (expression: string, itemIndex: number) => {
				return workflow.expression.resolveSimpleParameterValue(
					`=${expression}`,
					{},
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
				);
			},
			async executeWorkflow(
				workflowInfo: IExecuteWorkflowInfo,
				inputData?: INodeExecutionData[],
			): Promise<any> {
				return additionalData
					.executeWorkflow(workflowInfo, additionalData, inputData)
					.then(async (result) =>
						BinaryDataManager.getInstance().duplicateBinaryData(
							result,
							additionalData.executionId!,
						),
					);
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(
				type: string,
				itemIndex?: number,
			): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(
					workflow,
					node,
					type,
					additionalData,
					mode,
					runExecutionData,
					runIndex,
					connectionInputData,
					itemIndex,
				);
			},
			getExecutionId: (): string => {
				return additionalData.executionId!;
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return [];
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}

				if (inputData[inputName][inputIndex] === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
				}

				return inputData[inputName][inputIndex] as INodeExecutionData[];
			},
			getNodeParameter: (
				parameterName: string,
				itemIndex: number,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
					fallbackValue,
				);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getExecuteData: (): IExecuteData => {
				return executeData;
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowDataProxy: (itemIndex: number): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(
					workflow,
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					{},
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			prepareOutputData: NodeHelpers.prepareOutputData,
			async putExecutionToWait(waitTill: Date): Promise<void> {
				runExecutionData.waitTill = waitTill;
			},
			sendMessageToUI(...args: any[]): void {
				if (mode !== 'manual') {
					return;
				}
				try {
					if (additionalData.sendMessageToUI) {
						additionalData.sendMessageToUI(node.name, args);
					}
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					Logger.warn(`There was a problem sending messsage to UI: ${error.message}`);
				}
			},
			async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
				await additionalData.hooks?.executeHookFunctions('sendResponse', [response]);
			},
			helpers: {
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				async prepareBinaryData(
					binaryData: Buffer,
					filePath?: string,
					mimeType?: string,
				): Promise<IBinaryData> {
					return prepareBinaryData.call(
						this,
						binaryData,
						additionalData.executionId!,
						filePath,
						mimeType,
					);
				},
				async getBinaryDataBuffer(
					itemIndex: number,
					propertyName: string,
					inputIndex = 0,
				): Promise<Buffer> {
					return getBinaryDataBuffer.call(this, inputData, itemIndex, propertyName, inputIndex);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				returnJsonArray,
				normalizeItems,
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node);
}

/**
 * Returns the execute functions regular nodes have access to when single-function is defined.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {number} runIndex
 * @param {INodeExecutionData[]} connectionInputData
 * @param {ITaskDataConnections} inputData
 * @param {INode} node
 * @param {number} itemIndex
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IExecuteSingleFunctions}
 */
export function getExecuteSingleFunctions(
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	inputData: ITaskDataConnections,
	node: INode,
	itemIndex: number,
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData,
	mode: WorkflowExecuteMode,
): IExecuteSingleFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node, itemIndex) => {
		return {
			continueOnFail: () => {
				return continueOnFail(node);
			},
			evaluateExpression: (expression: string, evaluateItemIndex: number | undefined) => {
				evaluateItemIndex = evaluateItemIndex === undefined ? itemIndex : evaluateItemIndex;
				return workflow.expression.resolveSimpleParameterValue(
					`=${expression}`,
					{},
					runExecutionData,
					runIndex,
					evaluateItemIndex,
					node.name,
					connectionInputData,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
				);
			},
			getContext(type: string): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(
					workflow,
					node,
					type,
					additionalData,
					mode,
					runExecutionData,
					runIndex,
					connectionInputData,
					itemIndex,
				);
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return { json: {} };
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new Error(`Could not get input index "${inputIndex}" of input "${inputName}"!`);
				}

				const allItems = inputData[inputName][inputIndex];

				if (allItems === null) {
					// return [];
					throw new Error(`Value "${inputIndex}" of input "${inputName}" did not get set!`);
				}

				if (allItems[itemIndex] === null) {
					// return [];
					throw new Error(
						`Value "${inputIndex}" of input "${inputName}" with itemIndex "${itemIndex}" did not get set!`,
					);
				}

				return allItems[itemIndex];
			},
			getItemIndex() {
				return itemIndex;
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getExecuteData: (): IExecuteData => {
				return executeData;
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
					fallbackValue,
				);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowDataProxy: (): IWorkflowDataProxyData => {
				const dataProxy = new WorkflowDataProxy(
					workflow,
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					{},
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				async getBinaryDataBuffer(propertyName: string, inputIndex = 0): Promise<Buffer> {
					return getBinaryDataBuffer.call(this, inputData, itemIndex, propertyName, inputIndex);
				},
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				async prepareBinaryData(
					binaryData: Buffer,
					filePath?: string,
					mimeType?: string,
				): Promise<IBinaryData> {
					return prepareBinaryData.call(
						this,
						binaryData,
						additionalData.executionId!,
						filePath,
						mimeType,
					);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node, itemIndex);
}

export function getCredentialTestFunctions(): ICredentialTestFunctions {
	return {
		helpers: {
			request: requestPromiseWithDefaults,
		},
	};
}

/**
 * Returns the execute functions regular nodes have access to in load-options-function.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @returns {ILoadOptionsFunctions}
 */
export function getLoadOptionsFunctions(
	workflow: Workflow,
	node: INode,
	path: string,
	additionalData: IWorkflowExecuteAdditionalData,
): ILoadOptionsFunctions {
	return ((workflow: Workflow, node: INode, path: string) => {
		const that = {
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(workflow, node, type, additionalData, 'internal');
			},
			getCurrentNodeParameter: (
				parameterPath: string,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object
				| undefined => {
				const nodeParameters = additionalData.currentNodeParameters;

				if (parameterPath.charAt(0) === '&') {
					parameterPath = `${path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
				}

				return get(nodeParameters, parameterPath);
			},
			getCurrentNodeParameters: (): INodeParameters | undefined => {
				return additionalData.currentNodeParameters;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					'internal' as WorkflowExecuteMode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					undefined,
					fallbackValue,
				);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getRestApiUrl: (): string => {
				return additionalData.restApiUrl;
			},
			helpers: {
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
			},
		};
		return that;
	})(workflow, node, path);
}

/**
 * Returns the execute functions regular nodes have access to in hook-function.
 *
 * @export
 * @param {Workflow} workflow
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IHookFunctions}
 */
export function getExecuteHookFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
	isTest?: boolean,
	webhookData?: IWebhookData,
): IHookFunctions {
	return ((workflow: Workflow, node: INode) => {
		const that = {
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(workflow, node, type, additionalData, mode);
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getActivationMode: (): WorkflowActivateMode => {
				return activation;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					undefined,
					fallbackValue,
				);
			},
			getNodeWebhookUrl: (name: string): string | undefined => {
				return getNodeWebhookUrl(
					name,
					workflow,
					node,
					additionalData,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					isTest,
				);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWebhookName(): string {
				if (webhookData === undefined) {
					throw new Error('Is only supported in webhook functions!');
				}
				return webhookData.webhookDescription.name;
			},
			getWebhookDescription(name: string): IWebhookDescription | undefined {
				return getWebhookDescription(name, workflow, node);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			helpers: {
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
			},
		};
		return that;
	})(workflow, node);
}

/**
 * Returns the execute functions regular nodes have access to when webhook-function is defined.
 *
 * @export
 * @param {Workflow} workflow
 * @param {IRunExecutionData} runExecutionData
 * @param {INode} node
 * @param {IWorkflowExecuteAdditionalData} additionalData
 * @param {WorkflowExecuteMode} mode
 * @returns {IWebhookFunctions}
 */
export function getExecuteWebhookFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	webhookData: IWebhookData,
): IWebhookFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			getBodyData(): IDataObject {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.body;
			},
			async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
				return getCredentials(workflow, node, type, additionalData, mode);
			},
			getHeaderData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.headers;
			},
			getMode: (): WorkflowExecuteMode => {
				return mode;
			},
			getNode: () => {
				return getNode(node);
			},
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
			):
				| NodeParameterValue
				| INodeParameters
				| NodeParameterValue[]
				| INodeParameters[]
				| object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const connectionInputData: INodeExecutionData[] = [];

				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
					undefined,
					fallbackValue,
				);
			},
			getParamsData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.params;
			},
			getQueryData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest.query;
			},
			getRequestObject(): express.Request {
				if (additionalData.httpRequest === undefined) {
					throw new Error('Request is missing!');
				}
				return additionalData.httpRequest;
			},
			getResponseObject(): express.Response {
				if (additionalData.httpResponse === undefined) {
					throw new Error('Response is missing!');
				}
				return additionalData.httpResponse;
			},
			getNodeWebhookUrl: (name: string): string | undefined => {
				return getNodeWebhookUrl(
					name,
					workflow,
					node,
					additionalData,
					mode,
					additionalData.timezone,
					getAdditionalKeys(additionalData),
				);
			},
			getTimezone: (): string => {
				return getTimezone(workflow, additionalData);
			},
			getWorkflow: () => {
				return getWorkflowMetadata(workflow);
			},
			getWorkflowStaticData(type: string): IDataObject {
				return workflow.getStaticData(type, node);
			},
			getWebhookName(): string {
				return webhookData.webhookDescription.name;
			},
			prepareOutputData: NodeHelpers.prepareOutputData,
			helpers: {
				httpRequest,
				async requestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return requestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				async prepareBinaryData(
					binaryData: Buffer,
					filePath?: string,
					mimeType?: string,
				): Promise<IBinaryData> {
					return prepareBinaryData.call(
						this,
						binaryData,
						additionalData.executionId!,
						filePath,
						mimeType,
					);
				},
				request: proxyRequestToAxios,
				async requestOAuth2(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUri | requestPromise.RequestPromiseOptions,
					oAuth2Options?: IOAuth2Options,
				): Promise<any> {
					return requestOAuth2.call(
						this,
						credentialsType,
						requestOptions,
						node,
						additionalData,
						oAuth2Options,
					);
				},
				async requestOAuth1(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: OptionsWithUrl | requestPromise.RequestPromiseOptions,
				): Promise<any> {
					return requestOAuth1.call(this, credentialsType, requestOptions);
				},
				async httpRequestWithAuthentication(
					this: IAllExecuteFunctions,
					credentialsType: string,
					requestOptions: IHttpRequestOptions,
					additionalCredentialOptions?: IAdditionalCredentialOptions,
				): Promise<any> {
					return httpRequestWithAuthentication.call(
						this,
						credentialsType,
						requestOptions,
						workflow,
						node,
						additionalData,
						additionalCredentialOptions,
					);
				},
				returnJsonArray,
			},
		};
	})(workflow, node);
}
