/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-shadow */
import type {
	ClientOAuth2Options,
	ClientOAuth2RequestObject,
	ClientOAuth2TokenData,
	OAuth2CredentialData,
} from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type {
	AxiosError,
	AxiosHeaders,
	AxiosPromise,
	AxiosRequestConfig,
	AxiosResponse,
} from 'axios';
import axios from 'axios';
import crypto, { createHmac } from 'crypto';
import type { Request, Response } from 'express';
import FileType from 'file-type';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { access as fsAccess, writeFile as fsWriteFile } from 'fs/promises';
import { IncomingMessage, type IncomingHttpHeaders } from 'http';
import { Agent, type AgentOptions } from 'https';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { DateTime } from 'luxon';
import { extension, lookup } from 'mime-types';
import type {
	BinaryHelperFunctions,
	CloseFunction,
	ConnectionTypes,
	ContextType,
	EventNamesAiNodesType,
	FieldType,
	FileSystemHelperFunctions,
	FunctionsBase,
	GenericValue,
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	IBinaryData,
	IContextObject,
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	ICredentialsExpressionResolveValues,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IExecuteResponsePromiseData,
	IExecuteSingleFunctions,
	IExecuteWorkflowInfo,
	IGetNodeParameterOptions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	IOAuth2Options,
	IPairedItemData,
	IPollFunctions,
	IRequestOptions,
	IRunExecutionData,
	ISourceData,
	ITaskData,
	ITaskDataConnections,
	ITriggerFunctions,
	IWebhookData,
	IWebhookDescription,
	IWebhookFunctions,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
	NodeExecutionWithMetadata,
	NodeHelperFunctions,
	NodeParameterValueType,
	NodeTypeAndVersion,
	PaginationOptions,
	RequestHelperFunctions,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	CallbackManager,
} from 'n8n-workflow';
import {
	ExpressionError,
	LoggerProxy as Logger,
	NodeApiError,
	NodeHelpers,
	NodeOperationError,
	NodeSslError,
	WorkflowDataProxy,
	createDeferredPromise,
	deepCopy,
	fileTypeFromMimeType,
	getGlobalState,
	isObjectEmpty,
	isResourceMapperValue,
	validateFieldType,
	ExecutionBaseError,
	jsonParse,
	ApplicationError,
	sleep,
} from 'n8n-workflow';
import type { Token } from 'oauth-1.0a';
import clientOAuth1 from 'oauth-1.0a';
import path from 'path';
import { stringify } from 'qs';
import { Readable } from 'stream';
import url, { URL, URLSearchParams } from 'url';

import { BinaryDataService } from './BinaryData/BinaryData.service';
import {
	BINARY_DATA_STORAGE_PATH,
	BLOCK_FILE_ACCESS_TO_N8N_FILES,
	CONFIG_FILES,
	CUSTOM_EXTENSION_ENV,
	HTTP_REQUEST_NODE_TYPE,
	PLACEHOLDER_EMPTY_EXECUTION_ID,
	RESTRICT_FILE_ACCESS_TO,
	UM_EMAIL_TEMPLATES_INVITE,
	UM_EMAIL_TEMPLATES_PWRESET,
} from './Constants';
import { extractValue } from './ExtractValue';
import type { ExtendedValidationResult, IResponseError } from './Interfaces';
import {
	getAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	setWorkflowExecutionMetadata,
} from './ExecutionMetadata';
import { getSecretsProxy } from './Secrets';
import Container from 'typedi';
import type { BinaryData } from './BinaryData/types';
import merge from 'lodash/merge';
import { InstanceSettings } from './InstanceSettings';

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
axios.interceptors.request.use((config) => {
	// If no content-type is set by us, prevent axios from force-setting the content-type to `application/x-www-form-urlencoded`
	if (config.data === undefined) {
		config.headers.setContentType(false, false);
	}
	return config;
});

const pushFormDataValue = (form: FormData, key: string, value: any) => {
	if (value?.hasOwnProperty('value') && value.hasOwnProperty('options')) {
		form.append(key, value.value, value.options);
	} else {
		form.append(key, value);
	}
};

const createFormDataObject = (data: Record<string, unknown>) => {
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

const validateUrl = (url?: string): boolean => {
	if (!url) return false;

	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
};

function searchForHeader(config: AxiosRequestConfig, headerName: string) {
	if (config.headers === undefined) {
		return undefined;
	}

	const headerNames = Object.keys(config.headers);
	headerName = headerName.toLowerCase();
	return headerNames.find((thisHeader) => thisHeader.toLowerCase() === headerName);
}

async function generateContentLengthHeader(config: AxiosRequestConfig) {
	if (!(config.data instanceof FormData)) {
		return;
	}
	try {
		const length = await new Promise<number>((res, rej) => {
			config.data.getLength((error: Error | null, length: number) => {
				if (error) {
					rej(error);
					return;
				}
				res(length);
			});
		});
		config.headers = {
			...config.headers,
			'content-length': length,
		};
	} catch (error) {
		Logger.error('Unable to calculate form data length', { error });
	}
}

const getHostFromRequestObject = (
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

const getBeforeRedirectFn =
	(agentOptions: AgentOptions, axiosConfig: AxiosRequestConfig) =>
	(redirectedRequest: Record<string, any>) => {
		const redirectAgent = new Agent({
			...agentOptions,
			servername: redirectedRequest.hostname,
		});
		redirectedRequest.agent = redirectAgent;
		redirectedRequest.agents.https = redirectAgent;

		if (axiosConfig.headers?.Authorization) {
			redirectedRequest.headers.Authorization = axiosConfig.headers.Authorization;
		}
		if (axiosConfig.auth) {
			redirectedRequest.auth = `${axiosConfig.auth.username}:${axiosConfig.auth.password}`;
		}
	};

// eslint-disable-next-line complexity
export async function parseRequestObject(requestObject: IRequestOptions) {
	// This function is a temporary implementation
	// That translates all http requests done via
	// the request library to axios directly
	// We are not using n8n's interface as it would
	// an unnecessary step, considering the `request`
	// helper can be deprecated and removed.
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
		if (requestObject.formData !== undefined && requestObject.formData instanceof FormData) {
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

			if (requestObject.formData instanceof FormData) {
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
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

	axiosConfig.httpsAgent = new Agent(agentOptions);

	axiosConfig.beforeRedirect = getBeforeRedirectFn(agentOptions, axiosConfig);

	if (requestObject.timeout !== undefined) {
		axiosConfig.timeout = requestObject.timeout;
	}

	if (requestObject.proxy !== undefined) {
		// try our best to parse the url provided.
		if (typeof requestObject.proxy === 'string') {
			try {
				const url = new URL(requestObject.proxy);
				const host = url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname;
				axiosConfig.proxy = {
					host,
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
					const host = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;
					axiosConfig.proxy = {
						host,
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
			axiosConfig.proxy = requestObject.proxy;
		}
	}

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

	/**
	 * Missing properties:
	 * encoding (need testing)
	 * gzip (ignored - default already works)
	 * resolveWithFullResponse (implemented elsewhere)
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
		const urlURL = new url.URL(axios.getUri(axiosConfig));
		const path = urlURL.pathname + urlURL.search;
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

interface IContentType {
	type: string;
	parameters: {
		charset: string;
		[key: string]: string;
	};
}

interface IContentDisposition {
	type: string;
	filename?: string;
}

function parseHeaderParameters(parameters: string[]): Record<string, string> {
	return parameters.reduce(
		(acc, param) => {
			const [key, value] = param.split('=');
			acc[key.toLowerCase().trim()] = decodeURIComponent(value);
			return acc;
		},
		{} as Record<string, string>,
	);
}

function parseContentType(contentType?: string): IContentType | null {
	if (!contentType) {
		return null;
	}

	const [type, ...parameters] = contentType.split(';');

	return {
		type: type.toLowerCase(),
		parameters: { charset: 'utf-8', ...parseHeaderParameters(parameters) },
	};
}

function parseFileName(filename?: string): string | undefined {
	if (filename?.startsWith('"') && filename?.endsWith('"')) {
		return filename.slice(1, -1);
	}

	return filename;
}

// https://datatracker.ietf.org/doc/html/rfc5987
function parseFileNameStar(filename?: string): string | undefined {
	const [_encoding, _locale, content] = parseFileName(filename)?.split("'") ?? [];

	return content;
}

function parseContentDisposition(contentDisposition?: string): IContentDisposition | null {
	if (!contentDisposition) {
		return null;
	}

	// This is invalid syntax, but common
	// Example 'filename="example.png"' (instead of 'attachment; filename="example.png"')
	if (!contentDisposition.startsWith('attachment') && !contentDisposition.startsWith('inline')) {
		contentDisposition = `attachment; ${contentDisposition}`;
	}

	const [type, ...parameters] = contentDisposition.split(';');

	const parsedParameters = parseHeaderParameters(parameters);

	return {
		type,
		filename:
			parseFileNameStar(parsedParameters['filename*']) ?? parseFileName(parsedParameters.filename),
	};
}

export function parseIncomingMessage(message: IncomingMessage) {
	const contentType = parseContentType(message.headers['content-type']);
	if (contentType) {
		const { type, parameters } = contentType;
		message.contentType = type;
		message.encoding = parameters.charset.toLowerCase() as BufferEncoding;
	}

	const contentDisposition = parseContentDisposition(message.headers['content-disposition']);
	if (contentDisposition) {
		message.contentDisposition = contentDisposition;
	}
}

export async function proxyRequestToAxios(
	workflow: Workflow | undefined,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	uriOrObject: string | IRequestOptions,
	options?: IRequestOptions,
): Promise<any> {
	let axiosConfig: AxiosRequestConfig = {
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
	};
	let configObject: IRequestOptions;
	if (typeof uriOrObject === 'string') {
		configObject = { uri: uriOrObject, ...options };
	} else {
		configObject = uriOrObject ?? {};
	}

	axiosConfig = Object.assign(axiosConfig, await parseRequestObject(configObject));

	let requestFn: () => AxiosPromise;
	if (configObject.auth?.sendImmediately === false) {
		// for digest-auth
		requestFn = async () => {
			try {
				return await axios(axiosConfig);
			} catch (error) {
				const { response } = error;
				if (response?.status !== 401 || !response.headers['www-authenticate']?.includes('nonce')) {
					throw error;
				}
				const { auth } = axiosConfig;
				delete axiosConfig.auth;
				axiosConfig = digestAuthAxiosConfig(axiosConfig, response, auth);
				return await axios(axiosConfig);
			}
		};
	} else {
		requestFn = async () => await axios(axiosConfig);
	}

	try {
		const response = await requestFn();
		let body = response.data;
		if (body instanceof IncomingMessage && axiosConfig.responseType === 'stream') {
			parseIncomingMessage(body);
		} else if (body === '') {
			body = axiosConfig.responseType === 'arraybuffer' ? Buffer.alloc(0) : undefined;
		}
		await additionalData?.hooks?.executeHookFunctions('nodeFetchedData', [workflow?.id, node]);
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
				Logger.debug('Request proxied to Axios failed', { status: response.status });
				let responseData = response.data;

				if (Buffer.isBuffer(responseData) || responseData instanceof Readable) {
					responseData = await Container.get(BinaryDataService)
						.toBuffer(responseData)
						.then((buffer) => buffer.toString('utf-8'));
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

// eslint-disable-next-line complexity
function convertN8nRequestToAxios(n8nRequest: IHttpRequestOptions): AxiosRequestConfig {
	// Destructure properties with the same name first.
	const { headers, method, timeout, auth, proxy, url } = n8nRequest;

	const axiosRequest: AxiosRequestConfig = {
		headers: headers ?? {},
		method,
		timeout,
		auth,
		proxy,
		url,
		maxBodyLength: Infinity,
		maxContentLength: Infinity,
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

	const host = getHostFromRequestObject(n8nRequest);
	const agentOptions: AgentOptions = {};
	if (host) {
		agentOptions.servername = host;
	}
	if (n8nRequest.skipSslCertificateValidation === true) {
		agentOptions.rejectUnauthorized = false;
	}
	axiosRequest.httpsAgent = new Agent(agentOptions);

	axiosRequest.beforeRedirect = getBeforeRedirectFn(agentOptions, axiosRequest);

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
			if (body instanceof FormData) {
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

	const userAgentHeader = searchForHeader(axiosRequest, 'user-agent');
	// If key exists, then the user has set both accept
	// header and the json flag. Header should take precedence.
	if (!userAgentHeader) {
		axiosRequest.headers = {
			...axiosRequest.headers,
			'User-Agent': 'n8n',
		};
	}

	if (n8nRequest.ignoreHttpStatusErrors) {
		axiosRequest.validateStatus = () => true;
	}

	return axiosRequest;
}

const NoBodyHttpMethods = ['GET', 'HEAD', 'OPTIONS'];

/** Remove empty request body on GET, HEAD, and OPTIONS requests */
export const removeEmptyBody = (requestOptions: IHttpRequestOptions | IRequestOptions) => {
	const method = requestOptions.method || 'GET';
	if (NoBodyHttpMethods.includes(method) && isEmpty(requestOptions.body)) {
		delete requestOptions.body;
	}
};

async function httpRequest(
	requestOptions: IHttpRequestOptions,
): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
	removeEmptyBody(requestOptions);

	let axiosRequest = convertN8nRequestToAxios(requestOptions);
	if (
		axiosRequest.data === undefined ||
		(axiosRequest.method !== undefined && axiosRequest.method.toUpperCase() === 'GET')
	) {
		delete axiosRequest.data;
	}

	let result: AxiosResponse<any>;
	try {
		result = await axios(axiosRequest);
	} catch (error) {
		if (requestOptions.auth?.sendImmediately === false) {
			const { response } = error;
			if (response?.status !== 401 || !response.headers['www-authenticate']?.includes('nonce')) {
				throw error;
			}

			const { auth } = axiosRequest;
			delete axiosRequest.auth;
			axiosRequest = digestAuthAxiosConfig(axiosRequest, response, auth);
			result = await axios(axiosRequest);
		}
		throw error;
	}

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

export function getBinaryPath(binaryDataId: string): string {
	return Container.get(BinaryDataService).getPath(binaryDataId);
}

/**
 * Returns binary file metadata
 */
export async function getBinaryMetadata(binaryDataId: string): Promise<BinaryData.Metadata> {
	return await Container.get(BinaryDataService).getMetadata(binaryDataId);
}

/**
 * Returns binary file stream for piping
 */
export async function getBinaryStream(binaryDataId: string, chunkSize?: number): Promise<Readable> {
	return await Container.get(BinaryDataService).getAsStream(binaryDataId, chunkSize);
}

export function assertBinaryData(
	inputData: ITaskDataConnections,
	node: INode,
	itemIndex: number,
	propertyName: string,
	inputIndex: number,
): IBinaryData {
	const binaryKeyData = inputData.main[inputIndex]![itemIndex].binary;
	if (binaryKeyData === undefined) {
		throw new NodeOperationError(
			node,
			`This operation expects the node's input data to contain a binary file '${propertyName}', but none was found [item ${itemIndex}]`,
			{
				itemIndex,
				description: 'Make sure that the previous node outputs a binary file',
			},
		);
	}

	const binaryPropertyData = binaryKeyData[propertyName];
	if (binaryPropertyData === undefined) {
		throw new NodeOperationError(
			node,
			`The item has no binary field '${propertyName}' [item ${itemIndex}]`,
			{
				itemIndex,
				description:
					'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input',
			},
		);
	}

	return binaryPropertyData;
}

/**
 * Returns binary data buffer for given item index and property name.
 */
export async function getBinaryDataBuffer(
	inputData: ITaskDataConnections,
	itemIndex: number,
	propertyName: string,
	inputIndex: number,
): Promise<Buffer> {
	const binaryData = inputData.main[inputIndex]![itemIndex].binary![propertyName];
	return await Container.get(BinaryDataService).getAsBuffer(binaryData);
}

/**
 * Store an incoming IBinaryData & related buffer using the configured binary data manager.
 *
 * @export
 * @param {IBinaryData} binaryData
 * @param {Buffer | Readable} bufferOrStream
 * @returns {Promise<IBinaryData>}
 */
export async function setBinaryDataBuffer(
	binaryData: IBinaryData,
	bufferOrStream: Buffer | Readable,
	workflowId: string,
	executionId: string,
): Promise<IBinaryData> {
	return await Container.get(BinaryDataService).store(
		workflowId,
		executionId,
		bufferOrStream,
		binaryData,
	);
}

export async function copyBinaryFile(
	workflowId: string,
	executionId: string,
	filePath: string,
	fileName: string,
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
			// read the first bytes of the file to guess mime type
			const fileTypeData = await FileType.fromFile(filePath);
			if (fileTypeData) {
				mimeType = fileTypeData.mime;
				fileExtension = fileTypeData.ext;
			}
		}
	}

	if (!fileExtension && mimeType) {
		fileExtension = extension(mimeType) || undefined;
	}

	if (!mimeType) {
		// Fall back to text
		mimeType = 'text/plain';
	}

	const returnData: IBinaryData = {
		mimeType,
		fileType: fileTypeFromMimeType(mimeType),
		fileExtension,
		data: '',
	};

	if (fileName) {
		returnData.fileName = fileName;
	} else if (filePath) {
		returnData.fileName = path.parse(filePath).base;
	}

	return await Container.get(BinaryDataService).copyBinaryFile(
		workflowId,
		executionId,
		returnData,
		filePath,
	);
}

/**
 * Takes a buffer and converts it into the format n8n uses. It encodes the binary data as
 * base64 and adds metadata.
 */
// eslint-disable-next-line complexity
async function prepareBinaryData(
	binaryData: Buffer | Readable,
	executionId: string,
	workflowId: string,
	filePath?: string,
	mimeType?: string,
): Promise<IBinaryData> {
	let fileExtension: string | undefined;
	if (binaryData instanceof IncomingMessage) {
		if (!filePath) {
			try {
				const { responseUrl } = binaryData;
				filePath =
					binaryData.contentDisposition?.filename ??
					((responseUrl && new URL(responseUrl).pathname) ?? binaryData.req?.path)?.slice(1);
			} catch {}
		}
		if (!mimeType) {
			mimeType = binaryData.contentType;
		}
	}

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
			if (Buffer.isBuffer(binaryData)) {
				// Use buffer to guess mime type
				const fileTypeData = await FileType.fromBuffer(binaryData);
				if (fileTypeData) {
					mimeType = fileTypeData.mime;
					fileExtension = fileTypeData.ext;
				}
			} else if (binaryData instanceof IncomingMessage) {
				mimeType = binaryData.headers['content-type'];
			} else {
				// TODO: detect filetype from other kind of streams
			}
		}
	}

	if (!fileExtension && mimeType) {
		fileExtension = extension(mimeType) || undefined;
	}

	if (!mimeType) {
		// Fall back to text
		mimeType = 'text/plain';
	}

	const returnData: IBinaryData = {
		mimeType,
		fileType: fileTypeFromMimeType(mimeType),
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

	return await setBinaryDataBuffer(returnData, binaryData, workflowId, executionId);
}

function applyPaginationRequestData(
	requestData: IRequestOptions,
	paginationRequestData: PaginationOptions['request'],
): IRequestOptions {
	const preparedPaginationData: Partial<IRequestOptions> = {
		...paginationRequestData,
		uri: paginationRequestData.url,
	};

	if ('formData' in requestData) {
		preparedPaginationData.formData = paginationRequestData.body;
		delete preparedPaginationData.body;
	} else if ('form' in requestData) {
		preparedPaginationData.form = paginationRequestData.body;
		delete preparedPaginationData.body;
	}

	return merge({}, requestData, preparedPaginationData);
}

/**
 * Makes a request using OAuth data for authentication
 *
 * @param {(IHttpRequestOptions | IRequestOptions)} requestOptions
 *
 */
export async function requestOAuth2(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	oAuth2Options?: IOAuth2Options,
	isN8nRequest = false,
) {
	removeEmptyBody(requestOptions);

	const credentials = (await this.getCredentials(
		credentialsType,
	)) as unknown as OAuth2CredentialData;

	// Only the OAuth2 with authorization code grant needs connection
	if (credentials.grantType === 'authorizationCode' && credentials.oauthTokenData === undefined) {
		throw new ApplicationError('OAuth credentials not connected');
	}

	const oAuthClient = new ClientOAuth2({
		clientId: credentials.clientId,
		clientSecret: credentials.clientSecret,
		accessTokenUri: credentials.accessTokenUrl,
		scopes: (credentials.scope as string).split(' '),
		ignoreSSLIssues: credentials.ignoreSSLIssues,
		authentication: credentials.authentication ?? 'header',
	});

	let oauthTokenData = credentials.oauthTokenData as ClientOAuth2TokenData;
	// if it's the first time using the credentials, get the access token and save it into the DB.
	if (
		credentials.grantType === 'clientCredentials' &&
		(oauthTokenData === undefined || Object.keys(oauthTokenData).length === 0)
	) {
		const { data } = await oAuthClient.credentials.getToken();
		// Find the credentials
		if (!node.credentials?.[credentialsType]) {
			throw new ApplicationError('Node does not have credential type', {
				extra: { nodeName: node.name },
				tags: { credentialType: credentialsType },
			});
		}

		const nodeCredentials = node.credentials[credentialsType];
		credentials.oauthTokenData = data;

		// Save the refreshed token
		await additionalData.credentialsHelper.updateCredentials(
			nodeCredentials,
			credentialsType,
			credentials as unknown as ICredentialDataDecryptedObject,
		);

		oauthTokenData = data;
	}

	const accessToken =
		get(oauthTokenData, oAuth2Options?.property as string) || oauthTokenData.accessToken;
	const refreshToken = oauthTokenData.refreshToken;
	const token = oAuthClient.createToken(
		{
			...oauthTokenData,
			...(accessToken ? { access_token: accessToken } : {}),
			...(refreshToken ? { refresh_token: refreshToken } : {}),
		},
		oAuth2Options?.tokenType || oauthTokenData.tokenType,
	);

	(requestOptions as IRequestOptions).rejectUnauthorized = !credentials.ignoreSSLIssues;

	// Signs the request by adding authorization headers or query parameters depending
	// on the token-type used.
	const newRequestOptions = token.sign(requestOptions as ClientOAuth2RequestObject);
	const newRequestHeaders = (newRequestOptions.headers = newRequestOptions.headers ?? {});
	// If keep bearer is false remove the it from the authorization header
	if (oAuth2Options?.keepBearer === false && typeof newRequestHeaders.Authorization === 'string') {
		newRequestHeaders.Authorization = newRequestHeaders.Authorization.split(' ')[1];
	}
	if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
		Object.assign(newRequestHeaders, {
			[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
		});
	}
	if (isN8nRequest) {
		return await this.helpers.httpRequest(newRequestOptions).catch(async (error: AxiosError) => {
			if (error.response?.status === 401) {
				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" expired. Should revalidate.`,
				);
				const tokenRefreshOptions: IDataObject = {};
				if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
					const body: IDataObject = {
						client_id: credentials.clientId,
						...(credentials.grantType === 'authorizationCode' && {
							client_secret: credentials.clientSecret as string,
						}),
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
				if (credentials.grantType === 'clientCredentials') {
					newToken = await token.client.credentials.getToken();
				} else {
					newToken = await token.refresh(tokenRefreshOptions as unknown as ClientOAuth2Options);
				}

				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
				);

				credentials.oauthTokenData = newToken.data;
				// Find the credentials
				if (!node.credentials?.[credentialsType]) {
					throw new ApplicationError('Node does not have credential type', {
						extra: { nodeName: node.name, credentialType: credentialsType },
					});
				}
				const nodeCredentials = node.credentials[credentialsType];
				await additionalData.credentialsHelper.updateCredentials(
					nodeCredentials,
					credentialsType,
					credentials as unknown as ICredentialDataDecryptedObject,
				);
				const refreshedRequestOption = newToken.sign(requestOptions as ClientOAuth2RequestObject);

				if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
					Object.assign(newRequestHeaders, {
						[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
					});
				}

				return await this.helpers.httpRequest(refreshedRequestOption);
			}
			throw error;
		});
	}
	const tokenExpiredStatusCode =
		oAuth2Options?.tokenExpiredStatusCode === undefined
			? 401
			: oAuth2Options?.tokenExpiredStatusCode;

	return await this.helpers
		.request(newRequestOptions as IRequestOptions)
		.then((response) => {
			const requestOptions = newRequestOptions as any;
			if (
				requestOptions.resolveWithFullResponse === true &&
				requestOptions.simple === false &&
				response.statusCode === tokenExpiredStatusCode
			) {
				throw response;
			}
			return response;
		})
		.catch(async (error: IResponseError) => {
			if (error.statusCode === tokenExpiredStatusCode) {
				// Token is probably not valid anymore. So try refresh it.
				const tokenRefreshOptions: IDataObject = {};
				if (oAuth2Options?.includeCredentialsOnRefreshOnBody) {
					const body: IDataObject = {
						client_id: credentials.clientId,
						client_secret: credentials.clientSecret,
					};
					tokenRefreshOptions.body = body;
					// Override authorization property so the credentials are not included in it
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
				if (credentials.grantType === 'clientCredentials') {
					newToken = await token.client.credentials.getToken();
				} else {
					newToken = await token.refresh(tokenRefreshOptions as unknown as ClientOAuth2Options);
				}
				Logger.debug(
					`OAuth2 token for "${credentialsType}" used by node "${node.name}" has been renewed.`,
				);

				credentials.oauthTokenData = newToken.data;

				// Find the credentials
				if (!node.credentials?.[credentialsType]) {
					throw new ApplicationError('Node does not have credential type', {
						tags: { credentialType: credentialsType },
						extra: { nodeName: node.name },
					});
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
				const newRequestOptions = newToken.sign(requestOptions as ClientOAuth2RequestObject);
				newRequestOptions.headers = newRequestOptions.headers ?? {};

				if (oAuth2Options?.keyToIncludeInAccessTokenHeader) {
					Object.assign(newRequestOptions.headers, {
						[oAuth2Options.keyToIncludeInAccessTokenHeader]: token.accessToken,
					});
				}

				return await this.helpers.request(newRequestOptions as IRequestOptions);
			}

			// Unknown error so simply throw it
			throw error;
		});
}

/**
 * Makes a request using OAuth1 data for authentication
 */
export async function requestOAuth1(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | IRequestOptions,
	isN8nRequest = false,
) {
	removeEmptyBody(requestOptions);

	const credentials = await this.getCredentials(credentialsType);

	if (credentials === undefined) {
		throw new ApplicationError('No credentials were returned!');
	}

	if (credentials.oauthTokenData === undefined) {
		throw new ApplicationError('OAuth credentials not connected!');
	}

	const oauth = new clientOAuth1({
		consumer: {
			key: credentials.consumerKey as string,
			secret: credentials.consumerSecret as string,
		},
		signature_method: credentials.signatureMethod as string,
		hash_function(base, key) {
			let algorithm: string;
			switch (credentials.signatureMethod) {
				case 'HMAC-SHA256':
					algorithm = 'sha256';
					break;
				case 'HMAC-SHA512':
					algorithm = 'sha512';
					break;
				default:
					algorithm = 'sha1';
					break;
			}
			return createHmac(algorithm, key).update(base).digest('base64');
		},
	});

	const oauthTokenData = credentials.oauthTokenData as IDataObject;

	const token: Token = {
		key: oauthTokenData.oauth_token as string,
		secret: oauthTokenData.oauth_token_secret as string,
	};

	// @ts-expect-error @TECH_DEBT: Remove request library
	requestOptions.data = { ...requestOptions.qs, ...requestOptions.form };

	// Fixes issue that OAuth1 library only works with "url" property and not with "uri"
	if ('uri' in requestOptions && !requestOptions.url) {
		requestOptions.url = requestOptions.uri;
		delete requestOptions.uri;
	}

	requestOptions.headers = oauth.toHeader(
		oauth.authorize(requestOptions as unknown as clientOAuth1.RequestOptions, token),
	) as unknown as Record<string, string>;
	if (isN8nRequest) {
		return await this.helpers.httpRequest(requestOptions as IHttpRequestOptions);
	}

	return await this.helpers
		.request(requestOptions as IRequestOptions)
		.catch(async (error: IResponseError) => {
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
	removeEmptyBody(requestOptions);

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
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
			credentialsDecrypted = await this.getCredentials(credentialsType);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set!`,
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
		return await httpRequest(requestOptions);
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
				// retry the request
				return await httpRequest(requestOptions);
			} catch (error) {
				throw new NodeApiError(this.getNode(), error);
			}
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Takes generic input data and brings it into the json format n8n uses.
 *
 * @param {(IDataObject | IDataObject[])} jsonData
 */
export function returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[] {
	const returnData: INodeExecutionData[] = [];

	if (!Array.isArray(jsonData)) {
		jsonData = [jsonData];
	}

	jsonData.forEach((data: IDataObject & { json?: IDataObject }) => {
		if (data?.json) {
			// We already have the JSON key so avoid double wrapping
			returnData.push({ ...data, json: data.json });
		} else {
			returnData.push({ json: data });
		}
	});

	return returnData;
}

/**
 * Takes generic input data and brings it into the new json, pairedItem format n8n uses.
 * @param {(IPairedItemData)} itemData
 * @param {(INodeExecutionData[])} inputData
 */
export function constructExecutionMetaData(
	inputData: INodeExecutionData[],
	options: { itemData: IPairedItemData | IPairedItemData[] },
): NodeExecutionWithMetadata[] {
	const { itemData } = options;
	return inputData.map((data: INodeExecutionData) => {
		const { json, ...rest } = data;
		return { json, pairedItem: itemData, ...rest } as NodeExecutionWithMetadata;
	});
}

/**
 * Automatically put the objects under a 'json' key and don't error,
 * if some objects contain json/binary keys and others don't, throws error 'Inconsistent item format'
 *
 * @param {INodeExecutionData | INodeExecutionData[]} executionData
 */
export function normalizeItems(
	executionData: INodeExecutionData | INodeExecutionData[],
): INodeExecutionData[] {
	if (typeof executionData === 'object' && !Array.isArray(executionData)) {
		executionData = executionData.json ? [executionData] : [{ json: executionData as IDataObject }];
	}

	if (executionData.every((item) => typeof item === 'object' && 'json' in item))
		return executionData;

	if (executionData.some((item) => typeof item === 'object' && 'json' in item)) {
		throw new ApplicationError('Inconsistent item format');
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
		throw new ApplicationError('Inconsistent item format');
	}

	return executionData.map((item) => {
		return { json: item };
	});
}

// TODO: Move up later
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
			credentialsDecrypted = await this.getCredentials(credentialsType, itemIndex);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set!`,
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
					// retry the request
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

/**
 * Returns the additional keys for Expressions and Function-Nodes
 *
 */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
	options?: { secretsEnabled?: boolean },
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId || PLACEHOLDER_EMPTY_EXECUTION_ID;
	const resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	const resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	return {
		$execution: {
			id: executionId,
			mode: mode === 'manual' ? 'test' : 'production',
			resumeUrl,
			resumeFormUrl,
			customData: runExecutionData
				? {
						set(key: string, value: string): void {
							try {
								setWorkflowExecutionMetadata(runExecutionData, key, value);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								Logger.verbose(e.message);
							}
						},
						setAll(obj: Record<string, string>): void {
							try {
								setAllWorkflowExecutionMetadata(runExecutionData, obj);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								Logger.verbose(e.message);
							}
						},
						get(key: string): string {
							return getWorkflowExecutionMetadata(runExecutionData, key);
						},
						getAll(): Record<string, string> {
							return getAllWorkflowExecutionMetadata(runExecutionData);
						},
					}
				: undefined,
		},
		$vars: additionalData.variables,
		$secrets: options?.secretsEnabled ? getSecretsProxy(additionalData) : undefined,

		// deprecated
		$executionId: executionId,
		$resumeWebhookUrl: resumeUrl,
	};
}

/**
 * Returns the requested decrypted credentials if the node has access to them.
 *
 * @param {Workflow} workflow Workflow which requests the data
 * @param {INode} node Node which request the data
 * @param {string} type The credential type to return
 */
export async function getCredentials(
	workflow: Workflow,
	node: INode,
	type: string,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	executeData?: IExecuteData,
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
	const fullAccess = [HTTP_REQUEST_NODE_TYPE].includes(node.type);

	let nodeCredentialDescription: INodeCredentialDescription | undefined;
	if (!fullAccess) {
		if (nodeType.description.credentials === undefined) {
			throw new NodeOperationError(
				node,
				`Node type "${node.type}" does not have any credentials defined!`,
				{ level: 'warning' },
			);
		}

		nodeCredentialDescription = nodeType.description.credentials.find(
			(credentialTypeDescription) => credentialTypeDescription.name === type,
		);
		if (nodeCredentialDescription === undefined) {
			throw new NodeOperationError(
				node,
				`Node type "${node.type}" does not have any credentials of type "${type}" defined!`,
				{ level: 'warning' },
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
	if (!fullAccess && !node.credentials?.[type]) {
		// If none are defined check if the credentials are required or not

		if (nodeCredentialDescription?.required === true) {
			// Credentials are required so error
			if (!node.credentials) {
				throw new NodeOperationError(node, 'Node does not have any credentials set!', {
					level: 'warning',
				});
			}
			if (!node.credentials[type]) {
				throw new NodeOperationError(
					node,
					`Node does not have any credentials set for "${type}"!`,
					{ level: 'warning' },
				);
			}
		} else {
			// Credentials are not required
			throw new NodeOperationError(node, 'Node does not require credentials');
		}
	}

	if (fullAccess && !node.credentials?.[type]) {
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
	// 	const additionalKeys = getAdditionalKeys(additionalData, mode);
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
		additionalData,
		nodeCredentials,
		type,
		mode,
		executeData,
		false,
		expressionResolveValues,
	);

	return decryptedDataObject;
}

/**
 * Clean up parameter data to make sure that only valid data gets returned
 * INFO: Currently only converts Luxon Dates as we know for sure it will not be breaking
 */
export function cleanupParameterData(inputData: NodeParameterValueType): void {
	if (typeof inputData !== 'object' || inputData === null) {
		return;
	}

	if (Array.isArray(inputData)) {
		inputData.forEach((value) => cleanupParameterData(value as NodeParameterValueType));
		return;
	}

	if (typeof inputData === 'object') {
		type Key = keyof typeof inputData;
		(Object.keys(inputData) as Key[]).forEach((key) => {
			const value = inputData[key];
			if (typeof value === 'object') {
				if (DateTime.isDateTime(value)) {
					// Is a special luxon date so convert to string
					inputData[key] = value.toString();
				} else {
					cleanupParameterData(value);
				}
			}
		});
	}
}

const validateResourceMapperValue = (
	parameterName: string,
	paramValues: { [key: string]: unknown },
	node: INode,
	skipRequiredCheck = false,
): ExtendedValidationResult => {
	const result: ExtendedValidationResult = { valid: true, newValue: paramValues };
	const paramNameParts = parameterName.split('.');
	if (paramNameParts.length !== 2) {
		return result;
	}
	const resourceMapperParamName = paramNameParts[0];
	const resourceMapperField = node.parameters[resourceMapperParamName];
	if (!resourceMapperField || !isResourceMapperValue(resourceMapperField)) {
		return result;
	}
	const schema = resourceMapperField.schema;
	const paramValueNames = Object.keys(paramValues);
	for (let i = 0; i < paramValueNames.length; i++) {
		const key = paramValueNames[i];
		const resolvedValue = paramValues[key];
		const schemaEntry = schema.find((s) => s.id === key);

		if (
			!skipRequiredCheck &&
			schemaEntry?.required === true &&
			schemaEntry.type !== 'boolean' &&
			!resolvedValue
		) {
			return {
				valid: false,
				errorMessage: `The value "${String(key)}" is required but not set`,
				fieldName: key,
			};
		}

		if (schemaEntry?.type) {
			const validationResult = validateFieldType(key, resolvedValue, schemaEntry.type, {
				valueOptions: schemaEntry.options,
			});
			if (!validationResult.valid) {
				return { ...validationResult, fieldName: key };
			} else {
				// If it's valid, set the casted value
				paramValues[key] = validationResult.newValue;
			}
		}
	}
	return result;
};

const validateCollection = (
	node: INode,
	runIndex: number,
	itemIndex: number,
	propertyDescription: INodeProperties,
	parameterPath: string[],
	validationResult: ExtendedValidationResult,
): ExtendedValidationResult => {
	let nestedDescriptions: INodeProperties[] | undefined;

	if (propertyDescription.type === 'fixedCollection') {
		nestedDescriptions = (propertyDescription.options as INodePropertyCollection[]).find(
			(entry) => entry.name === parameterPath[1],
		)?.values;
	}

	if (propertyDescription.type === 'collection') {
		nestedDescriptions = propertyDescription.options as INodeProperties[];
	}

	if (!nestedDescriptions) {
		return validationResult;
	}

	const validationMap: {
		[key: string]: { type: FieldType; displayName: string; options?: INodePropertyOptions[] };
	} = {};

	for (const prop of nestedDescriptions) {
		if (!prop.validateType || prop.ignoreValidationDuringExecution) continue;

		validationMap[prop.name] = {
			type: prop.validateType,
			displayName: prop.displayName,
			options:
				prop.validateType === 'options' ? (prop.options as INodePropertyOptions[]) : undefined,
		};
	}

	if (!Object.keys(validationMap).length) {
		return validationResult;
	}

	for (const value of Array.isArray(validationResult.newValue)
		? (validationResult.newValue as IDataObject[])
		: [validationResult.newValue as IDataObject]) {
		for (const key of Object.keys(value)) {
			if (!validationMap[key]) continue;

			const fieldValidationResult = validateFieldType(key, value[key], validationMap[key].type, {
				valueOptions: validationMap[key].options,
			});

			if (!fieldValidationResult.valid) {
				throw new ExpressionError(
					`Invalid input for field '${validationMap[key].displayName}' inside '${propertyDescription.displayName}' in [item ${itemIndex}]`,
					{
						description: fieldValidationResult.errorMessage,
						runIndex,
						itemIndex,
						nodeCause: node.name,
					},
				);
			}
			value[key] = fieldValidationResult.newValue;
		}
	}

	return validationResult;
};

export const validateValueAgainstSchema = (
	node: INode,
	nodeType: INodeType,
	parameterValue: string | number | boolean | object | null | undefined,
	parameterName: string,
	runIndex: number,
	itemIndex: number,
) => {
	const parameterPath = parameterName.split('.');

	const propertyDescription = nodeType.description.properties.find(
		(prop) =>
			parameterPath[0] === prop.name && NodeHelpers.displayParameter(node.parameters, prop, node),
	);

	if (!propertyDescription) {
		return parameterValue;
	}

	let validationResult: ExtendedValidationResult = { valid: true, newValue: parameterValue };

	if (
		parameterPath.length === 1 &&
		propertyDescription.validateType &&
		!propertyDescription.ignoreValidationDuringExecution
	) {
		validationResult = validateFieldType(
			parameterName,
			parameterValue,
			propertyDescription.validateType,
		);
	} else if (
		propertyDescription.type === 'resourceMapper' &&
		parameterPath[1] === 'value' &&
		typeof parameterValue === 'object'
	) {
		validationResult = validateResourceMapperValue(
			parameterName,
			parameterValue as { [key: string]: unknown },
			node,
			propertyDescription.typeOptions?.resourceMapper?.mode !== 'add',
		);
	} else if (['fixedCollection', 'collection'].includes(propertyDescription.type)) {
		validationResult = validateCollection(
			node,
			runIndex,
			itemIndex,
			propertyDescription,
			parameterPath,
			validationResult,
		);
	}

	if (!validationResult.valid) {
		throw new ExpressionError(
			`Invalid input for '${
				validationResult.fieldName
					? String(validationResult.fieldName)
					: propertyDescription.displayName
			}' [item ${itemIndex}]`,
			{
				description: validationResult.errorMessage,
				runIndex,
				itemIndex,
				nodeCause: node.name,
			},
		);
	}
	return validationResult.newValue;
};

/**
 * Returns the requested resolved (all expressions replaced) node parameters.
 *
 * @param {(IRunExecutionData | null)} runExecutionData
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
	additionalKeys: IWorkflowDataProxyAdditionalKeys,
	executeData?: IExecuteData,
	fallbackValue?: any,
	options?: IGetNodeParameterOptions,
): NodeParameterValueType | object {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (nodeType === undefined) {
		throw new ApplicationError('Node type is unknown so cannot return parameter value', {
			tags: { nodeType: node.type },
		});
	}

	const value = get(node.parameters, parameterName, fallbackValue);

	if (value === undefined) {
		throw new ApplicationError('Could not get parameter', { extra: { parameterName } });
	}

	if (options?.rawExpressions) {
		return value;
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
			additionalKeys,
			executeData,
			false,
			{},
			options?.contextNode?.name,
		);
		cleanupParameterData(returnData);
	} catch (e) {
		if (e instanceof ExpressionError && node.continueOnFail && node.type === 'n8n-nodes-base.set') {
			// https://linear.app/n8n/issue/PAY-684
			returnData = [{ name: undefined, value: undefined }];
		} else {
			if (e.context) e.context.parameter = parameterName;
			e.cause = value;
			throw e;
		}
	}

	// This is outside the try/catch because it throws errors with proper messages
	if (options?.extractValue) {
		returnData = extractValue(returnData, parameterName, node, nodeType, itemIndex);
	}

	// Validate parameter value if it has a schema defined(RMC) or validateType defined
	returnData = validateValueAgainstSchema(
		node,
		nodeType,
		returnData,
		parameterName,
		runIndex,
		itemIndex,
	);

	return returnData;
}

/**
 * Returns if execution should be continued even if there was an error.
 *
 */
export function continueOnFail(node: INode): boolean {
	const onError = get(node, 'onError', undefined);

	if (onError === undefined) {
		return get(node, 'continueOnFail', false);
	}

	return ['continueRegularOutput', 'continueErrorOutput'].includes(onError);
}

/**
 * Returns the webhook URL of the webhook with the given name
 *
 */
export function getNodeWebhookUrl(
	name: string,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
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
		additionalKeys,
	);
	if (path === undefined) {
		return undefined;
	}

	const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
		node,
		webhookDescription.isFullPath,
		mode,
		additionalKeys,
		undefined,
		false,
	) as boolean;
	return NodeHelpers.getNodeWebhookUrl(baseUrl, workflow.id, node, path.toString(), isFullPath);
}

/**
 * Returns the timezone for the workflow
 */
export function getTimezone(workflow: Workflow): string {
	return workflow.settings.timezone ?? getGlobalState().defaultTimezone;
}

/**
 * Returns the full webhook description of the webhook with the given name
 *
 */
export function getWebhookDescription(
	name: string,
	workflow: Workflow,
	node: INode,
): IWebhookDescription | undefined {
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	if (nodeType.description.webhooks === undefined) {
		// Node does not have any webhooks so return
		return undefined;
	}

	for (const webhookDescription of nodeType.description.webhooks) {
		if (webhookDescription.name === name) {
			return webhookDescription;
		}
	}

	return undefined;
}

// TODO: Change options to an object
const addExecutionDataFunctions = async (
	type: 'input' | 'output',
	nodeName: string,
	data: INodeExecutionData[][] | ExecutionBaseError,
	runExecutionData: IRunExecutionData,
	connectionType: ConnectionTypes,
	additionalData: IWorkflowExecuteAdditionalData,
	sourceNodeName: string,
	sourceNodeRunIndex: number,
	currentNodeRunIndex: number,
): Promise<void> => {
	if (connectionType === 'main') {
		throw new ApplicationError('Setting type is not supported for main connection', {
			extra: { type },
		});
	}

	let taskData: ITaskData | undefined;
	if (type === 'input') {
		taskData = {
			startTime: new Date().getTime(),
			executionTime: 0,
			executionStatus: 'running',
			source: [null],
		};
	} else {
		// At the moment we expect that there is always an input sent before the output
		taskData = get(
			runExecutionData,
			['resultData', 'runData', nodeName, currentNodeRunIndex],
			undefined,
		);
		if (taskData === undefined) {
			return;
		}
	}
	taskData = taskData!;

	if (data instanceof Error) {
		taskData.executionStatus = 'error';
		taskData.error = data;
	} else {
		if (type === 'output') {
			taskData.executionStatus = 'success';
		}
		taskData.data = {
			[connectionType]: data,
		} as ITaskDataConnections;
	}

	if (type === 'input') {
		if (!(data instanceof Error)) {
			taskData.inputOverride = {
				[connectionType]: data,
			} as ITaskDataConnections;
		}

		if (!runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
			runExecutionData.resultData.runData[nodeName] = [];
		}

		runExecutionData.resultData.runData[nodeName][currentNodeRunIndex] = taskData;
		if (additionalData.sendDataToUI) {
			additionalData.sendDataToUI('nodeExecuteBefore', {
				executionId: additionalData.executionId,
				nodeName,
			});
		}
	} else {
		// Outputs
		taskData.executionTime = new Date().getTime() - taskData.startTime;

		if (additionalData.sendDataToUI) {
			additionalData.sendDataToUI('nodeExecuteAfter', {
				executionId: additionalData.executionId,
				nodeName,
				data: taskData,
			});
		}

		if (get(runExecutionData, 'executionData.metadata', undefined) === undefined) {
			runExecutionData.executionData!.metadata = {};
		}

		let sourceTaskData = get(runExecutionData, ['executionData', 'metadata', sourceNodeName]);

		if (!sourceTaskData) {
			runExecutionData.executionData!.metadata[sourceNodeName] = [];
			sourceTaskData = runExecutionData.executionData!.metadata[sourceNodeName];
		}

		if (!sourceTaskData[sourceNodeRunIndex]) {
			sourceTaskData[sourceNodeRunIndex] = {
				subRun: [],
			};
		}

		sourceTaskData[sourceNodeRunIndex]!.subRun!.push({
			node: nodeName,
			runIndex: currentNodeRunIndex,
		});
	}
};

async function getInputConnectionData(
	this: IAllExecuteFunctions,
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	connectionInputData: INodeExecutionData[],
	additionalData: IWorkflowExecuteAdditionalData,
	executeData: IExecuteData | undefined,
	mode: WorkflowExecuteMode,
	closeFunctions: CloseFunction[],
	inputName: ConnectionTypes,
	itemIndex: number,
): Promise<unknown> {
	const node = this.getNode();
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

	const inputs = NodeHelpers.getNodeInputs(workflow, node, nodeType.description);

	let inputConfiguration = inputs.find((input) => {
		if (typeof input === 'string') {
			return input === inputName;
		}
		return input.type === inputName;
	});

	if (inputConfiguration === undefined) {
		throw new ApplicationError('Node does not have input of type', {
			extra: { nodeName: node.name, inputName },
		});
	}

	if (typeof inputConfiguration === 'string') {
		inputConfiguration = {
			type: inputConfiguration,
		} as INodeInputConfiguration;
	}

	const parentNodes = workflow.getParentNodes(node.name, inputName, 1);
	if (parentNodes.length === 0) {
		return inputConfiguration.maxConnections === 1 ? undefined : [];
	}

	const constParentNodes = parentNodes
		.map((nodeName) => {
			return workflow.getNode(nodeName) as INode;
		})
		.filter((connectedNode) => connectedNode.disabled !== true)
		.map(async (connectedNode) => {
			const nodeType = workflow.nodeTypes.getByNameAndVersion(
				connectedNode.type,
				connectedNode.typeVersion,
			);

			if (!nodeType.supplyData) {
				throw new ApplicationError('Node does not have a `supplyData` method defined', {
					extra: { nodeName: connectedNode.name },
				});
			}

			const context = Object.assign({}, this);

			context.getNodeParameter = (
				parameterName: string,
				itemIndex: number,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			) => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					connectedNode,
					parameterName,
					itemIndex,
					mode,
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
					fallbackValue,
					{ ...(options || {}), contextNode: node },
				) as any;
			};

			// TODO: Check what else should be overwritten
			context.getNode = () => {
				return deepCopy(connectedNode);
			};

			context.getCredentials = async (key: string) => {
				try {
					return await getCredentials(
						workflow,
						connectedNode,
						key,
						additionalData,
						mode,
						executeData,
						runExecutionData,
						runIndex,
						connectionInputData,
						itemIndex,
					);
				} catch (error) {
					// Display the error on the node which is causing it

					let currentNodeRunIndex = 0;
					if (runExecutionData.resultData.runData.hasOwnProperty(node.name)) {
						currentNodeRunIndex = runExecutionData.resultData.runData[node.name].length;
					}

					await addExecutionDataFunctions(
						'input',
						connectedNode.name,
						error,
						runExecutionData,
						inputName,
						additionalData,
						node.name,
						runIndex,
						currentNodeRunIndex,
					);

					throw error;
				}
			};

			try {
				const response = await nodeType.supplyData.call(context, itemIndex);
				if (response.closeFunction) {
					closeFunctions.push(response.closeFunction);
				}
				return response;
			} catch (error) {
				// Propagate errors from sub-nodes
				if (error.functionality === 'configuration-node') throw error;
				if (!(error instanceof ExecutionBaseError)) {
					error = new NodeOperationError(connectedNode, error, {
						itemIndex,
					});
				}

				let currentNodeRunIndex = 0;
				if (runExecutionData.resultData.runData.hasOwnProperty(node.name)) {
					currentNodeRunIndex = runExecutionData.resultData.runData[node.name].length;
				}

				// Display the error on the node which is causing it
				await addExecutionDataFunctions(
					'input',
					connectedNode.name,
					error,
					runExecutionData,
					inputName,
					additionalData,
					node.name,
					runIndex,
					currentNodeRunIndex,
				);

				// Display on the calling node which node has the error
				throw new NodeOperationError(connectedNode, `Error in sub-node ${connectedNode.name}`, {
					itemIndex,
					functionality: 'configuration-node',
					description: error.message,
				});
			}
		});

	// Validate the inputs
	const nodes = await Promise.all(constParentNodes);

	if (inputConfiguration.required && nodes.length === 0) {
		throw new NodeOperationError(node, `A ${inputName} processor node must be connected!`);
	}
	if (
		inputConfiguration.maxConnections !== undefined &&
		nodes.length > inputConfiguration.maxConnections
	) {
		throw new NodeOperationError(
			node,
			`Only ${inputConfiguration.maxConnections} ${inputName} processor nodes are/is allowed to be connected!`,
		);
	}

	return inputConfiguration.maxConnections === 1
		? (nodes || [])[0]?.response
		: nodes.map((node) => node.response);
}

const getCommonWorkflowFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
): Omit<FunctionsBase, 'getCredentials'> => ({
	logger: Logger,
	getExecutionId: () => additionalData.executionId!,
	getNode: () => deepCopy(node),
	getWorkflow: () => ({
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
	}),
	getWorkflowStaticData: (type) => workflow.getStaticData(type, node),
	getChildNodes: (nodeName: string) => {
		const output: NodeTypeAndVersion[] = [];
		const nodes = workflow.getChildNodes(nodeName);

		for (const nodeName of nodes) {
			const node = workflow.nodes[nodeName];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
			});
		}
		return output;
	},
	getParentNodes: (nodeName: string) => {
		const output: NodeTypeAndVersion[] = [];
		const nodes = workflow.getParentNodes(nodeName);

		for (const nodeName of nodes) {
			const node = workflow.nodes[nodeName];
			output.push({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
			});
		}
		return output;
	},
	getRestApiUrl: () => additionalData.restApiUrl,
	getInstanceBaseUrl: () => additionalData.instanceBaseUrl,
	getInstanceId: () => Container.get(InstanceSettings).instanceId,
	getTimezone: () => getTimezone(workflow),

	prepareOutputData: async (outputData) => [outputData],
});

const executionCancellationFunctions = (
	abortSignal?: AbortSignal,
): Pick<IExecuteFunctions, 'onExecutionCancellation' | 'getExecutionCancelSignal'> => ({
	getExecutionCancelSignal: () => abortSignal,
	onExecutionCancellation: (handler) => {
		const fn = () => {
			abortSignal?.removeEventListener('abort', fn);
			handler();
		};
		abortSignal?.addEventListener('abort', fn);
	},
});

const getRequestHelperFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
): RequestHelperFunctions => {
	const getResolvedValue = (
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType => {
		const runExecutionData: IRunExecutionData | null = null;
		const connectionInputData: INodeExecutionData[] = [];
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

	return {
		httpRequest,
		// eslint-disable-next-line complexity
		async requestWithAuthenticationPaginated(
			this: IExecuteFunctions,
			requestOptions: IRequestOptions,
			itemIndex: number,
			paginationOptions: PaginationOptions,
			credentialsType?: string,
			additionalCredentialOptions?: IAdditionalCredentialOptions,
		): Promise<any[]> {
			const responseData = [];
			if (!requestOptions.qs) {
				requestOptions.qs = {};
			}
			requestOptions.resolveWithFullResponse = true;
			requestOptions.simple = false;

			let tempResponseData: IN8nHttpFullResponse;
			let makeAdditionalRequest: boolean;
			let paginateRequestData: PaginationOptions['request'];

			const runIndex = 0;

			const additionalKeys = {
				$request: requestOptions,
				$response: {} as IN8nHttpFullResponse,
				$version: node.typeVersion,
				$pageCount: 0,
			};

			const executeData: IExecuteData = {
				data: {},
				node,
				source: null,
			};

			const hashData = {
				identicalCount: 0,
				previousLength: 0,
				previousHash: '',
			};
			do {
				paginateRequestData = getResolvedValue(
					paginationOptions.request as unknown as NodeParameterValueType,
					itemIndex,
					runIndex,
					executeData,
					additionalKeys,
					false,
				) as object as PaginationOptions['request'];

				const tempRequestOptions = applyPaginationRequestData(requestOptions, paginateRequestData);

				if (!validateUrl(tempRequestOptions.uri as string)) {
					throw new NodeOperationError(node, `'${paginateRequestData.url}' is not a valid URL.`, {
						itemIndex,
						runIndex,
						type: 'invalid_url',
					});
				}

				if (credentialsType) {
					tempResponseData = await this.helpers.requestWithAuthentication.call(
						this,
						credentialsType,
						tempRequestOptions,
						additionalCredentialOptions,
					);
				} else {
					tempResponseData = await this.helpers.request(tempRequestOptions);
				}

				const newResponse: IN8nHttpFullResponse = Object.assign(
					{
						body: {},
						headers: {},
						statusCode: 0,
					},
					pick(tempResponseData, ['body', 'headers', 'statusCode']),
				);

				let contentBody: Exclude<IN8nHttpResponse, Buffer>;

				if (newResponse.body instanceof Readable && paginationOptions.binaryResult !== true) {
					const data = await this.helpers
						.binaryToBuffer(newResponse.body as Buffer | Readable)
						.then((body) => body.toString());
					// Keep the original string version that we can use it to hash if needed
					contentBody = data;

					const responseContentType = newResponse.headers['content-type']?.toString() ?? '';
					if (responseContentType.includes('application/json')) {
						newResponse.body = jsonParse(data, { fallbackValue: {} });
					} else {
						newResponse.body = data;
					}
					tempResponseData.__bodyResolved = true;
					tempResponseData.body = newResponse.body;
				} else {
					contentBody = newResponse.body;
				}

				if (paginationOptions.binaryResult !== true || tempResponseData.headers.etag) {
					// If the data is not binary (and so not a stream), or an etag is present,
					// we check via etag or hash if identical data is received

					let contentLength = 0;
					if ('content-length' in tempResponseData.headers) {
						contentLength = parseInt(tempResponseData.headers['content-length'] as string) || 0;
					}

					if (hashData.previousLength === contentLength) {
						let hash: string;
						if (tempResponseData.headers.etag) {
							// If an etag is provided, we use it as "hash"
							hash = tempResponseData.headers.etag as string;
						} else {
							// If there is no etag, we calculate a hash from the data in the body
							if (typeof contentBody !== 'string') {
								contentBody = JSON.stringify(contentBody);
							}
							hash = crypto.createHash('md5').update(contentBody).digest('base64');
						}

						if (hashData.previousHash === hash) {
							hashData.identicalCount += 1;
							if (hashData.identicalCount > 2) {
								// Length was identical 5x and hash 3x
								throw new NodeOperationError(
									node,
									'The returned response was identical 5x, so requests got stopped',
									{
										itemIndex,
										description:
											'Check if "Pagination Completed When" has been configured correctly.',
									},
								);
							}
						} else {
							hashData.identicalCount = 0;
						}
						hashData.previousHash = hash;
					} else {
						hashData.identicalCount = 0;
					}
					hashData.previousLength = contentLength;
				}

				responseData.push(tempResponseData);

				additionalKeys.$response = newResponse;
				additionalKeys.$pageCount = additionalKeys.$pageCount + 1;

				if (
					paginationOptions.maxRequests &&
					additionalKeys.$pageCount >= paginationOptions.maxRequests
				) {
					break;
				}

				makeAdditionalRequest = getResolvedValue(
					paginationOptions.continue,
					itemIndex,
					runIndex,
					executeData,
					additionalKeys,
					false,
				) as boolean;

				if (makeAdditionalRequest) {
					if (paginationOptions.requestInterval) {
						await sleep(paginationOptions.requestInterval);
					}
					if (tempResponseData.statusCode < 200 || tempResponseData.statusCode >= 300) {
						// We have it configured to let all requests pass no matter the response code
						// via "requestOptions.simple = false" to not by default fail if it is for example
						// configured to stop on 404 response codes. For that reason we have to throw here
						// now an error manually if the response code is not a success one.
						let data = tempResponseData.body;
						if (data instanceof Readable && paginationOptions.binaryResult !== true) {
							data = await this.helpers
								.binaryToBuffer(tempResponseData.body as Buffer | Readable)
								.then((body) => body.toString());
						} else if (typeof data === 'object') {
							data = JSON.stringify(data);
						}

						throw Object.assign(
							new Error(`${tempResponseData.statusCode} - "${data?.toString()}"`),
							{
								statusCode: tempResponseData.statusCode,
								error: data,
								isAxiosError: true,
								response: {
									headers: tempResponseData.headers,
									status: tempResponseData.statusCode,
									statusText: tempResponseData.statusMessage,
								},
							},
						);
					}
				}
			} while (makeAdditionalRequest);

			return responseData;
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

		request: async (uriOrObject, options) =>
			await proxyRequestToAxios(workflow, additionalData, node, uriOrObject, options),

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
			return await requestOAuth1.call(this, credentialsType, requestOptions);
		},

		async requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptions: IRequestOptions,
			oAuth2Options?: IOAuth2Options,
		): Promise<any> {
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

const getAllowedPaths = () => {
	const restrictFileAccessTo = process.env[RESTRICT_FILE_ACCESS_TO];
	if (!restrictFileAccessTo) {
		return [];
	}
	const allowedPaths = restrictFileAccessTo
		.split(';')
		.map((path) => path.trim())
		.filter((path) => path);
	return allowedPaths;
};

function isFilePathBlocked(filePath: string): boolean {
	const allowedPaths = getAllowedPaths();
	const resolvedFilePath = path.resolve(filePath);
	const blockFileAccessToN8nFiles = process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] !== 'false';

	//if allowed paths are defined, allow access only to those paths
	if (allowedPaths.length) {
		for (const path of allowedPaths) {
			if (resolvedFilePath.startsWith(path)) {
				return false;
			}
		}

		return true;
	}

	//restrict access to .n8n folder and other .env config related paths
	if (blockFileAccessToN8nFiles) {
		const { n8nFolder } = Container.get(InstanceSettings);
		const restrictedPaths = [n8nFolder];

		if (process.env[CONFIG_FILES]) {
			restrictedPaths.push(...process.env[CONFIG_FILES].split(','));
		}

		if (process.env[CUSTOM_EXTENSION_ENV]) {
			const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV].split(';');
			restrictedPaths.push(...customExtensionFolders);
		}

		if (process.env[BINARY_DATA_STORAGE_PATH]) {
			restrictedPaths.push(process.env[BINARY_DATA_STORAGE_PATH]);
		}

		if (process.env[UM_EMAIL_TEMPLATES_INVITE]) {
			restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_INVITE]);
		}

		if (process.env[UM_EMAIL_TEMPLATES_PWRESET]) {
			restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_PWRESET]);
		}

		//check if the file path is restricted
		for (const path of restrictedPaths) {
			if (resolvedFilePath.startsWith(path)) {
				return true;
			}
		}
	}

	//path is not restricted
	return false;
}

const getFileSystemHelperFunctions = (node: INode): FileSystemHelperFunctions => ({
	async createReadStream(filePath) {
		try {
			await fsAccess(filePath);
		} catch (error) {
			throw error.code === 'ENOENT'
				? new NodeOperationError(node, error, {
						message: `The file "${String(filePath)}" could not be accessed.`,
						level: 'warning',
					})
				: error;
		}
		if (isFilePathBlocked(filePath as string)) {
			const allowedPaths = getAllowedPaths();
			const message = allowedPaths.length ? ` Allowed paths: ${allowedPaths.join(', ')}` : '';
			throw new NodeOperationError(node, `Access to the file is not allowed.${message}`, {
				level: 'warning',
			});
		}
		return createReadStream(filePath);
	},

	getStoragePath() {
		return path.join(Container.get(InstanceSettings).n8nFolder, `storage/${node.type}`);
	},

	async writeContentToFile(filePath, content, flag) {
		if (isFilePathBlocked(filePath as string)) {
			throw new NodeOperationError(node, `The file "${String(filePath)}" is not writable.`, {
				level: 'warning',
			});
		}
		return await fsWriteFile(filePath, content, { encoding: 'binary', flag });
	},
});

const getNodeHelperFunctions = (
	{ executionId }: IWorkflowExecuteAdditionalData,
	workflowId: string,
): NodeHelperFunctions => ({
	copyBinaryFile: async (filePath, fileName, mimeType) =>
		await copyBinaryFile(workflowId, executionId!, filePath, fileName, mimeType),
});

const getBinaryHelperFunctions = (
	{ executionId }: IWorkflowExecuteAdditionalData,
	workflowId: string,
): BinaryHelperFunctions => ({
	getBinaryPath,
	getBinaryStream,
	getBinaryMetadata,
	binaryToBuffer: async (body: Buffer | Readable) =>
		await Container.get(BinaryDataService).toBuffer(body),
	prepareBinaryData: async (binaryData, filePath, mimeType) =>
		await prepareBinaryData(binaryData, executionId!, workflowId, filePath, mimeType),
	setBinaryDataBuffer: async (data, binaryData) =>
		await setBinaryDataBuffer(data, binaryData, workflowId, executionId!),
	copyBinaryFile: async () => {
		throw new ApplicationError('`copyBinaryFile` has been removed. Please upgrade this node.');
	},
});

/**
 * Returns a copy of the items which only contains the json data and
 * of that only the defined properties
 */
export function copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	return items.map((item) => {
		const newItem: IDataObject = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = deepCopy(item.json[property]);
			}
		}
		return newItem;
	});
}

/**
 * Returns the execute functions the poll nodes have access to.
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
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			__emit: (): void => {
				throw new ApplicationError(
					'Overwrite NodeExecuteFunctions.getExecutePollFunctions.__emit function!',
				);
			},
			__emitError() {
				throw new ApplicationError(
					'Overwrite NodeExecuteFunctions.getExecutePollFunctions.__emitError function!',
				);
			},
			getMode: () => mode,
			getActivationMode: () => activation,
			getCredentials: async (type) =>
				await getCredentials(workflow, node, type, additionalData, mode),
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					undefined,
					fallbackValue,
					options,
				);
			},
			helpers: {
				createDeferredPromise,
				...getRequestHelperFunctions(workflow, node, additionalData),
				...getBinaryHelperFunctions(additionalData, workflow.id),
				returnJsonArray,
			},
		};
	})(workflow, node);
}

/**
 * Returns the execute functions the trigger nodes have access to.
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
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			emit: (): void => {
				throw new ApplicationError(
					'Overwrite NodeExecuteFunctions.getExecuteTriggerFunctions.emit function!',
				);
			},
			emitError: (): void => {
				throw new ApplicationError(
					'Overwrite NodeExecuteFunctions.getExecuteTriggerFunctions.emit function!',
				);
			},
			getMode: () => mode,
			getActivationMode: () => activation,
			getCredentials: async (type) =>
				await getCredentials(workflow, node, type, additionalData, mode),
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					undefined,
					fallbackValue,
					options,
				);
			},
			helpers: {
				createDeferredPromise,
				...getRequestHelperFunctions(workflow, node, additionalData),
				...getBinaryHelperFunctions(additionalData, workflow.id),
				returnJsonArray,
			},
		};
	})(workflow, node);
}

/**
 * Returns the execute functions regular nodes have access to.
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
	closeFunctions: CloseFunction[],
	abortSignal?: AbortSignal,
): IExecuteFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node) => {
		return {
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			...executionCancellationFunctions(abortSignal),
			getMode: () => mode,
			getCredentials: async (type, itemIndex) =>
				await getCredentials(
					workflow,
					node,
					type,
					additionalData,
					mode,
					executeData,
					runExecutionData,
					runIndex,
					connectionInputData,
					itemIndex,
				),
			getExecuteData: () => executeData,
			continueOnFail: () => continueOnFail(node),
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
				);
			},
			async executeWorkflow(
				workflowInfo: IExecuteWorkflowInfo,
				inputData?: INodeExecutionData[],
				parentCallbackManager?: CallbackManager,
			): Promise<any> {
				return await additionalData
					.executeWorkflow(workflowInfo, additionalData, {
						parentWorkflowId: workflow.id?.toString(),
						inputData,
						parentWorkflowSettings: workflow.settings,
						node,
						parentCallbackManager,
					})
					.then(
						async (result) =>
							await Container.get(BinaryDataService).duplicateBinaryData(
								workflow.id,
								additionalData.executionId!,
								result,
							),
					);
			},
			getContext(type: ContextType): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},

			async getInputConnectionData(
				inputName: ConnectionTypes,
				itemIndex: number,
			): Promise<unknown> {
				return await getInputConnectionData.call(
					this,
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					additionalData,
					executeData,
					mode,
					closeFunctions,
					inputName,
					itemIndex,
				);
			},

			getNodeOutputs(): INodeOutputConfiguration[] {
				const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				return NodeHelpers.getNodeOutputs(workflow, node, nodeType.description).map((output) => {
					if (typeof output === 'string') {
						return {
							type: output,
						};
					}
					return output;
				});
			},
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return [];
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new ApplicationError('Could not get input with given index', {
						extra: { inputIndex, inputName },
					});
				}

				if (inputData[inputName][inputIndex] === null) {
					throw new ApplicationError('Value of input was not set', {
						extra: { inputIndex, inputName },
					});
				}

				return inputData[inputName][inputIndex] as INodeExecutionData[];
			},
			getInputSourceData: (inputIndex = 0, inputName = 'main') => {
				if (executeData?.source === null) {
					// Should never happen as n8n sets it automatically
					throw new ApplicationError('Source data is missing');
				}
				return executeData.source[inputName][inputIndex];
			},
			getNodeParameter: (
				parameterName: string,
				itemIndex: number,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
					fallbackValue,
					options,
				);
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			binaryToBuffer: async (body: Buffer | Readable) =>
				await Container.get(BinaryDataService).toBuffer(body),
			async putExecutionToWait(waitTill: Date): Promise<void> {
				runExecutionData.waitTill = waitTill;
				if (additionalData.setExecutionStatus) {
					additionalData.setExecutionStatus('waiting');
				}
			},
			sendMessageToUI(...args: any[]): void {
				if (mode !== 'manual') {
					return;
				}
				try {
					if (additionalData.sendDataToUI) {
						args = args.map((arg) => {
							// prevent invalid dates from being logged as null
							if (arg.isLuxonDateTime && arg.invalidReason) return { ...arg };

							// log valid dates in human readable format, as in browser
							if (arg.isLuxonDateTime) return new Date(arg.ts).toString();
							if (arg instanceof Date) return arg.toString();

							return arg;
						});

						additionalData.sendDataToUI('sendConsoleMessage', {
							source: `[Node: "${node.name}"]`,
							messages: args,
						});
					}
				} catch (error) {
					Logger.warn(`There was a problem sending message to UI: ${error.message}`);
				}
			},
			async sendResponse(response: IExecuteResponsePromiseData): Promise<void> {
				await additionalData.hooks?.executeHookFunctions('sendResponse', [response]);
			},

			addInputData(
				connectionType: ConnectionTypes,
				data: INodeExecutionData[][] | ExecutionBaseError,
			): { index: number } {
				const nodeName = this.getNode().name;
				let currentNodeRunIndex = 0;
				if (runExecutionData.resultData.runData.hasOwnProperty(nodeName)) {
					currentNodeRunIndex = runExecutionData.resultData.runData[nodeName].length;
				}

				addExecutionDataFunctions(
					'input',
					this.getNode().name,
					data,
					runExecutionData,
					connectionType,
					additionalData,
					node.name,
					runIndex,
					currentNodeRunIndex,
				).catch((error) => {
					Logger.warn(
						`There was a problem logging input data of node "${this.getNode().name}": ${
							error.message
						}`,
					);
				});

				return { index: currentNodeRunIndex };
			},
			addOutputData(
				connectionType: ConnectionTypes,
				currentNodeRunIndex: number,
				data: INodeExecutionData[][] | ExecutionBaseError,
			): void {
				addExecutionDataFunctions(
					'output',
					this.getNode().name,
					data,
					runExecutionData,
					connectionType,
					additionalData,
					node.name,
					runIndex,
					currentNodeRunIndex,
				).catch((error) => {
					Logger.warn(
						`There was a problem logging output data of node "${this.getNode().name}": ${
							error.message
						}`,
					);
				});
			},
			helpers: {
				createDeferredPromise,
				copyInputItems,
				...getRequestHelperFunctions(workflow, node, additionalData),
				...getFileSystemHelperFunctions(node),
				...getBinaryHelperFunctions(additionalData, workflow.id),
				assertBinaryData: (itemIndex, propertyName) =>
					assertBinaryData(inputData, node, itemIndex, propertyName, 0),
				getBinaryDataBuffer: async (itemIndex, propertyName) =>
					await getBinaryDataBuffer(inputData, itemIndex, propertyName, 0),

				returnJsonArray,
				normalizeItems,
				constructExecutionMetaData,
			},
			nodeHelpers: getNodeHelperFunctions(additionalData, workflow.id),
			logAiEvent: async (eventName: EventNamesAiNodesType, msg: string) => {
				return await additionalData.logAiEvent(eventName, {
					executionId: additionalData.executionId ?? 'unsaved-execution',
					nodeName: node.name,
					workflowName: workflow.name ?? 'Unnamed workflow',
					nodeType: node.type,
					workflowId: workflow.id ?? 'unsaved-workflow',
					msg,
				});
			},
			getParentCallbackManager: () => additionalData.parentCallbackManager,
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node) as IExecuteFunctions;
}

/**
 * Returns the execute functions regular nodes have access to when single-function is defined.
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
	abortSignal?: AbortSignal,
): IExecuteSingleFunctions {
	return ((workflow, runExecutionData, connectionInputData, inputData, node, itemIndex) => {
		return {
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			...executionCancellationFunctions(abortSignal),
			continueOnFail: () => continueOnFail(node),
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
				);
			},
			getContext(type: ContextType): IContextObject {
				return NodeHelpers.getContext(runExecutionData, type, node);
			},
			getCredentials: async (type) =>
				await getCredentials(
					workflow,
					node,
					type,
					additionalData,
					mode,
					executeData,
					runExecutionData,
					runIndex,
					connectionInputData,
					itemIndex,
				),
			getInputData: (inputIndex = 0, inputName = 'main') => {
				if (!inputData.hasOwnProperty(inputName)) {
					// Return empty array because else it would throw error when nothing is connected to input
					return { json: {} };
				}

				// TODO: Check if nodeType has input with that index defined
				if (inputData[inputName].length < inputIndex) {
					throw new ApplicationError('Could not get input index', {
						extra: { inputIndex, inputName },
					});
				}

				const allItems = inputData[inputName][inputIndex];

				if (allItems === null) {
					throw new ApplicationError('Input index was not set', {
						extra: { inputIndex, inputName },
					});
				}

				if (allItems[itemIndex] === null) {
					throw new ApplicationError('Value of input with given index was not set', {
						extra: { inputIndex, inputName, itemIndex },
					});
				}

				return allItems[itemIndex];
			},
			getInputSourceData: (inputIndex = 0, inputName = 'main') => {
				if (executeData?.source === null) {
					// Should never happen as n8n sets it automatically
					throw new ApplicationError('Source data is missing');
				}
				return executeData.source[inputName][inputIndex] as ISourceData;
			},
			getItemIndex: () => itemIndex,
			getMode: () => mode,
			getExecuteData: () => executeData,
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
				return getNodeParameter(
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					node,
					parameterName,
					itemIndex,
					mode,
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
					fallbackValue,
					options,
				);
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					executeData,
				);
				return dataProxy.getDataProxy();
			},
			helpers: {
				createDeferredPromise,
				...getRequestHelperFunctions(workflow, node, additionalData),
				...getBinaryHelperFunctions(additionalData, workflow.id),

				assertBinaryData: (propertyName, inputIndex = 0) =>
					assertBinaryData(inputData, node, itemIndex, propertyName, inputIndex),
				getBinaryDataBuffer: async (propertyName, inputIndex = 0) =>
					await getBinaryDataBuffer(inputData, itemIndex, propertyName, inputIndex),
			},
			logAiEvent: async (eventName: EventNamesAiNodesType, msg: string) => {
				return await additionalData.logAiEvent(eventName, {
					executionId: additionalData.executionId ?? 'unsaved-execution',
					nodeName: node.name,
					workflowName: workflow.name ?? 'Unnamed workflow',
					nodeType: node.type,
					workflowId: workflow.id ?? 'unsaved-workflow',
					msg,
				});
			},
		};
	})(workflow, runExecutionData, connectionInputData, inputData, node, itemIndex);
}

export function getCredentialTestFunctions(): ICredentialTestFunctions {
	return {
		helpers: {
			request: async (uriOrObject: string | object, options?: object) => {
				return await proxyRequestToAxios(undefined, undefined, undefined, uriOrObject, options);
			},
		},
	};
}

/**
 * Returns the execute functions regular nodes have access to in load-options-function.
 */
export function getLoadOptionsFunctions(
	workflow: Workflow,
	node: INode,
	path: string,
	additionalData: IWorkflowExecuteAdditionalData,
): ILoadOptionsFunctions {
	return ((workflow: Workflow, node: INode, path: string) => {
		return {
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			getCredentials: async (type) =>
				await getCredentials(workflow, node, type, additionalData, 'internal'),
			getCurrentNodeParameter: (
				parameterPath: string,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object | undefined => {
				const nodeParameters = additionalData.currentNodeParameters;

				if (parameterPath.charAt(0) === '&') {
					parameterPath = `${path.split('.').slice(1, -1).join('.')}.${parameterPath.slice(1)}`;
				}

				let returnData = get(nodeParameters, parameterPath);

				// This is outside the try/catch because it throws errors with proper messages
				if (options?.extractValue) {
					const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
					if (nodeType === undefined) {
						throw new ApplicationError('Node type is not known so cannot return parameter value', {
							tags: { nodeType: node.type },
						});
					}
					returnData = extractValue(
						returnData,
						parameterPath,
						node,
						nodeType,
					) as NodeParameterValueType;
				}

				return returnData;
			},
			getCurrentNodeParameters: () => additionalData.currentNodeParameters,
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
				const runExecutionData: IRunExecutionData | null = null;
				const itemIndex = 0;
				const runIndex = 0;
				const mode = 'internal' as WorkflowExecuteMode;
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					undefined,
					fallbackValue,
					options,
				);
			},
			helpers: getRequestHelperFunctions(workflow, node, additionalData),
		};
	})(workflow, node, path);
}

/**
 * Returns the execute functions regular nodes have access to in hook-function.
 */
export function getExecuteHookFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
	webhookData?: IWebhookData,
): IHookFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			getCredentials: async (type) =>
				await getCredentials(workflow, node, type, additionalData, mode),
			getMode: () => mode,
			getActivationMode: () => activation,
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
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
					getAdditionalKeys(additionalData, mode, runExecutionData),
					undefined,
					fallbackValue,
					options,
				);
			},
			getNodeWebhookUrl: (name: string): string | undefined => {
				return getNodeWebhookUrl(
					name,
					workflow,
					node,
					additionalData,
					mode,
					getAdditionalKeys(additionalData, mode, null),
					webhookData?.isTest,
				);
			},
			getWebhookName(): string {
				if (webhookData === undefined) {
					throw new ApplicationError('Only supported in webhook functions');
				}
				return webhookData.webhookDescription.name;
			},
			getWebhookDescription: (name) => getWebhookDescription(name, workflow, node),
			helpers: getRequestHelperFunctions(workflow, node, additionalData),
		};
	})(workflow, node);
}

/**
 * Returns the execute functions regular nodes have access to when webhook-function is defined.
 */
// TODO: check where it is used and make sure close functions are called
export function getExecuteWebhookFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	webhookData: IWebhookData,
	closeFunctions: CloseFunction[],
): IWebhookFunctions {
	return ((workflow: Workflow, node: INode) => {
		return {
			...getCommonWorkflowFunctions(workflow, node, additionalData),
			getBodyData(): IDataObject {
				if (additionalData.httpRequest === undefined) {
					throw new ApplicationError('Request is missing');
				}
				return additionalData.httpRequest.body;
			},
			getCredentials: async (type) =>
				await getCredentials(workflow, node, type, additionalData, mode),
			getHeaderData(): IncomingHttpHeaders {
				if (additionalData.httpRequest === undefined) {
					throw new ApplicationError('Request is missing');
				}
				return additionalData.httpRequest.headers;
			},
			async getInputConnectionData(
				inputName: ConnectionTypes,
				itemIndex: number,
			): Promise<unknown> {
				// To be able to use expressions like "$json.sessionId" set the
				// body data the webhook received to what is normally used for
				// incoming node data.
				const connectionInputData: INodeExecutionData[] = [
					{ json: additionalData.httpRequest?.body || {} },
				];
				const runExecutionData: IRunExecutionData = {
					resultData: {
						runData: {},
					},
				};
				const executeData: IExecuteData = {
					data: {
						main: [connectionInputData],
					},
					node,
					source: null,
				};
				const runIndex = 0;

				return await getInputConnectionData.call(
					this,
					workflow,
					runExecutionData,
					runIndex,
					connectionInputData,
					additionalData,
					executeData,
					mode,
					closeFunctions,
					inputName,
					itemIndex,
				);
			},
			getMode: () => mode,
			getNodeParameter: (
				parameterName: string,
				fallbackValue?: any,
				options?: IGetNodeParameterOptions,
			): NodeParameterValueType | object => {
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
					getAdditionalKeys(additionalData, mode, null),
					undefined,
					fallbackValue,
					options,
				);
			},
			getParamsData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new ApplicationError('Request is missing');
				}
				return additionalData.httpRequest.params;
			},
			getQueryData(): object {
				if (additionalData.httpRequest === undefined) {
					throw new ApplicationError('Request is missing');
				}
				return additionalData.httpRequest.query;
			},
			getRequestObject(): Request {
				if (additionalData.httpRequest === undefined) {
					throw new ApplicationError('Request is missing');
				}
				return additionalData.httpRequest;
			},
			getResponseObject(): Response {
				if (additionalData.httpResponse === undefined) {
					throw new ApplicationError('Response is missing');
				}
				return additionalData.httpResponse;
			},
			getNodeWebhookUrl: (name: string): string | undefined =>
				getNodeWebhookUrl(
					name,
					workflow,
					node,
					additionalData,
					mode,
					getAdditionalKeys(additionalData, mode, null),
				),
			getWebhookName: () => webhookData.webhookDescription.name,
			helpers: {
				createDeferredPromise,
				...getRequestHelperFunctions(workflow, node, additionalData),
				...getBinaryHelperFunctions(additionalData, workflow.id),
				returnJsonArray,
			},
			nodeHelpers: getNodeHelperFunctions(additionalData, workflow.id),
		};
	})(workflow, node);
}
