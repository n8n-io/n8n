import type { MaybeRef } from 'vue';
import { unref } from 'vue';
import get from 'lodash/get';
import { toJsonObject as curlToJson, type JSONOutput } from 'curlconverter';

import { CURL_IMPORT_NODES_PROTOCOLS, CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { importCurlEventBus } from '@/event-bus';
import type { BaseTextKey } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import type { CurlToJSONResponse } from '@/Interface';

interface Parameter {
	parameterType?: string;
	name: string;
	value: string;
}

interface HttpNodeParameters extends Record<string, unknown> {
	url?: string;
	method: string;
	sendBody?: boolean;
	authentication: string;
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'raw' | 'binaryData';
	rawContentType?: string;
	specifyBody?: 'json' | 'keypair';
	bodyParameters?: {
		parameters: Parameter[];
	};
	jsonBody?: object;
	options: {
		allowUnauthorizedCerts?: boolean;
		proxy?: string;
		timeout?: number;
		redirect: {
			redirect: {
				followRedirects?: boolean;
				maxRedirects?: number;
			};
		};
		response: {
			response: {
				fullResponse?: boolean;
				responseFormat?: string;
				outputPropertyName?: string;
			};
		};
	};
	sendHeaders?: boolean;
	headerParameters?: {
		parameters: Parameter[];
	};
	sendQuery?: boolean;
	queryParameters?: {
		parameters: Parameter[];
	};
}

type HttpNodeHeaders = Pick<HttpNodeParameters, 'sendHeaders' | 'headerParameters'>;

type HttpNodeQueries = Pick<HttpNodeParameters, 'sendQuery' | 'queryParameters'>;

const SUPPORTED_CONTENT_TYPES = [
	'application/json',
	'application/x-www-form-urlencoded',
	'multipart/form-data',
] as const;
type ContentTypes = (typeof SUPPORTED_CONTENT_TYPES)[number];

const CONTENT_TYPE_KEY = 'content-type';

const getContentTypeHeader = (headers: JSONOutput['headers']): string | undefined => {
	return get(headers, CONTENT_TYPE_KEY) ?? undefined;
};

const isContentType = (headers: JSONOutput['headers'], contentType: ContentTypes): boolean => {
	return getContentTypeHeader(headers) === contentType;
};

const isJsonRequest = (curlJson: JSONOutput): boolean => {
	if (isContentType(curlJson.headers, 'application/json')) return true;

	if (curlJson.data && !getContentTypeHeader(curlJson.headers)) {
		const bodyKey = Object.keys(curlJson.data)[0];
		try {
			JSON.parse(bodyKey);
			return true;
		} catch {
			return false;
		}
	}
	return false;
};

const isFormUrlEncodedRequest = (curlJson: JSONOutput): boolean => {
	if (isContentType(curlJson.headers, 'application/x-www-form-urlencoded')) return true;
	if (!getContentTypeHeader(curlJson.headers) && curlJson.data && !curlJson.files) return true;
	return false;
};

const isMultipartRequest = (curlJson: JSONOutput): boolean => {
	if (isContentType(curlJson.headers, 'multipart/form-data')) return true;

	if (curlJson.files)
		// only multipart/form-data request include files
		return true;
	return false;
};

const isBinaryRequest = (curlJson: JSONOutput): boolean => {
	if (curlJson?.headers?.[CONTENT_TYPE_KEY]) {
		const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY];
		return ['image', 'video', 'audio'].some((d) => contentType.includes(d));
	}
	return false;
};

const toKeyValueArray = ([key, value]: [string, unknown]) => ({
	name: key,
	value: value?.toString() ?? '',
});

const extractHeaders = (headers: JSONOutput['headers'] = {}): HttpNodeHeaders => {
	const emptyHeaders = !Object.keys(headers).length;

	const onlyContentTypeHeaderDefined =
		Object.keys(headers).length === 1 && headers[CONTENT_TYPE_KEY] !== undefined;

	if (emptyHeaders || onlyContentTypeHeaderDefined) return { sendHeaders: false };

	return {
		sendHeaders: true,
		headerParameters: {
			parameters: Object.entries(headers)
				.map(toKeyValueArray)
				.filter((parameter) => parameter.name !== CONTENT_TYPE_KEY),
		},
	};
};

const extractQueries = (queries: JSONOutput['queries'] = {}): HttpNodeQueries => {
	const emptyQueries = !Object.keys(queries).length;

	if (emptyQueries) return { sendQuery: false };

	return {
		sendQuery: true,
		queryParameters: {
			parameters: Object.entries(queries).map(toKeyValueArray),
		},
	};
};

const keyValueBodyToNodeParameters = (body: JSONOutput['data'] = {}): Parameter[] | [] => {
	return Object.entries(body).map(toKeyValueArray);
};

const jsonBodyToNodeParameters = (body: JSONOutput['data'] = {}): Parameter[] | [] => {
	// curlconverter returns string if parameter includes special base64 characters like % or / or =
	if (typeof body === 'string') {
		// handles decoding percent-encoded characters like %3D to =
		const parameters = new URLSearchParams(body);

		return [...parameters.entries()].map((parameter) => {
			return toKeyValueArray(parameter);
		});
	}
	return keyValueBodyToNodeParameters(body);
};

const multipartToNodeParameters = (
	body: JSONOutput['data'] = {},
	files: JSONOutput['files'] = {},
): Parameter[] | [] => {
	return [
		...Object.entries(body)
			.map(toKeyValueArray)
			.map((e) => ({ parameterType: 'formData', ...e })),
		...Object.entries(files)
			.map(toKeyValueArray)
			.map((e) => ({ parameterType: 'formBinaryData', ...e })),
	];
};

const lowerCaseContentTypeKey = (obj: JSONOutput['headers']): void => {
	if (!obj) return;

	const regex = new RegExp(CONTENT_TYPE_KEY, 'gi');

	const contentTypeKey = Object.keys(obj).find((key) => !!Array.from(key.matchAll(regex)).length);

	if (!contentTypeKey) return;

	const value = obj[contentTypeKey];
	delete obj[contentTypeKey];
	obj[CONTENT_TYPE_KEY] = value;
};

const encodeBasicAuthentication = (username: string, password: string) =>
	btoa(`${username}:${password}`);
const jsonHasNestedObjects = (json: { [key: string]: string | number | object }) =>
	Object.values(json).some((e) => typeof e === 'object');

const mapCookies = (cookies: JSONOutput['cookies']): { cookie: string } | {} => {
	if (!cookies) return {};

	const cookiesValues = Object.entries(cookies).reduce(
		(accumulator: string, entry: [string, string]) => {
			accumulator += `${entry[0]}=${entry[1]};`;
			return accumulator;
		},
		'',
	);

	if (!cookiesValues) return {};

	return {
		cookie: cookiesValues,
	};
};

export const flattenObject = <T extends Record<string, unknown>>(obj: T, prefix = '') =>
	Object.keys(obj).reduce(
		(acc, k) => {
			const pre = prefix.length ? prefix + '.' : '';
			if (typeof obj[k] === 'object') Object.assign(acc, flattenObject(obj[k] as T, pre + k));
			else acc[pre + k] = obj[k];
			return acc;
		},
		{} as Record<string, unknown>,
	);

export const toHttpNodeParameters = (curlCommand: string): HttpNodeParameters => {
	const curlJson = curlToJson(curlCommand);
	const headers = curlJson.headers ?? {};

	lowerCaseContentTypeKey(headers);

	// set basic authentication
	if (curlJson.auth) {
		const { user, password: pass } = curlJson.auth;
		headers.authorization = `Basic ${encodeBasicAuthentication(user, pass)}`;
	}

	// curlconverter does not parse query parameters correctly if they contain commas or semicolons
	// so we need to parse it again
	const url = new URL(curlJson.url);
	const queries = curlJson.queries ?? {};
	for (const [key, value] of url.searchParams) {
		queries[key] = value;
	}

	url.search = '';
	// URL automatically adds a trailing slash if the path is empty
	const urlString = url.pathname === '/' ? url.href.slice(0, -1) : url.href;

	const httpNodeParameters: HttpNodeParameters = {
		url: urlString,
		authentication: 'none',
		method: curlJson.method.toUpperCase(),
		...extractHeaders({ ...headers, ...mapCookies(curlJson.cookies) }),
		...extractQueries(queries),
		options: {
			redirect: {
				redirect: {},
			},
			response: {
				response: {},
			},
		},
	};

	if (curlJson.follow_redirects) {
		httpNodeParameters.options.redirect.redirect.followRedirects = true;
		if (curlJson.max_redirects) {
			httpNodeParameters.options.redirect.redirect.maxRedirects = curlJson.max_redirects;
		}
	}

	if (curlJson.proxy) {
		httpNodeParameters.options.proxy = curlJson.proxy;
	}

	if (curlJson.connect_timeout !== undefined) {
		httpNodeParameters.options.timeout = Math.floor(curlJson.connect_timeout * 1000);
	}

	if (curlJson.output) {
		httpNodeParameters.options.response.response = {
			responseFormat: 'file',
			outputPropertyName: curlJson.output ?? 'data',
		};
	}

	if (curlJson.insecure !== undefined) {
		httpNodeParameters.options.allowUnauthorizedCerts = true;
	}

	if (curlJson.include) {
		httpNodeParameters.options.response.response.fullResponse = true;
		httpNodeParameters.options.response.response.responseFormat = 'autodetect';
	}

	const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY] as ContentTypes;

	if (isBinaryRequest(curlJson)) {
		return Object.assign(httpNodeParameters, {
			contentType: 'binaryData',
			sendBody: true,
		});
	}

	if (contentType && !SUPPORTED_CONTENT_TYPES.includes(contentType)) {
		return Object.assign(httpNodeParameters, {
			sendBody: true,
			contentType: 'raw',
			rawContentType: contentType,
			body: Object.keys(curlJson?.data ?? {})[0],
		});
	}

	if (isJsonRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: 'json',
			sendBody: true,
		});

		if (curlJson.data) {
			const json = curlJson.data;

			if (jsonHasNestedObjects(json)) {
				// json body
				Object.assign(httpNodeParameters, {
					specifyBody: 'json',
					jsonBody: JSON.stringify(json, null, 2),
				});
			} else {
				// key-value body
				Object.assign(httpNodeParameters, {
					specifyBody: 'keypair',
					bodyParameters: {
						parameters: jsonBodyToNodeParameters(curlJson.data),
					},
				});
			}
		}
	} else if (isFormUrlEncodedRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: 'form-urlencoded',
			sendBody: true,
			specifyBody: 'keypair',
			bodyParameters: {
				parameters: jsonBodyToNodeParameters(curlJson.data),
			},
		});
	} else if (isMultipartRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: 'multipart-form-data',
			sendBody: true,
			bodyParameters: {
				parameters: multipartToNodeParameters(curlJson.data, curlJson.files),
			},
		});
	} else {
		// could not figure the content type so do not set the body
		Object.assign(httpNodeParameters, {
			sendBody: false,
		});
	}

	if (!Object.keys(httpNodeParameters.options?.redirect.redirect).length) {
		// @ts-ignore
		delete httpNodeParameters.options.redirect;
	}

	if (!Object.keys(httpNodeParameters.options.response.response).length) {
		// @ts-ignore
		delete httpNodeParameters.options.response;
	}

	return httpNodeParameters;
};

export function useImportCurlCommand(options?: {
	onImportSuccess?: () => void;
	onImportFailure?: (data: { invalidProtocol: boolean; protocol?: string }) => void;
	onAfterImport?: () => void;
	i18n?: {
		invalidCurCommand: {
			title: string;
			message: string;
		};
	};
}) {
	const toast = useToast();
	const i18n = useI18n();

	const translationStrings = {
		invalidCurCommand: {
			title: 'importCurlParameter.showError.invalidCurlCommand.title',
			message: 'importCurlParameter.showError.invalidCurlCommand.message',
		},
		...options?.i18n,
	};

	function importCurlCommand(curlCommandRef: MaybeRef<string>): void {
		const curlCommand = unref(curlCommandRef);
		if (curlCommand === '') return;

		try {
			const parameters = flattenObject(toHttpNodeParameters(curlCommand), 'parameters');
			assert(typeof parameters['parameters.url'] === 'string', 'parameters.url has to be string');
			// Normalize placeholder values
			const url: string = parameters['parameters.url']
				.replaceAll('%7B', '{')
				.replaceAll('%7D', '}');

			const invalidProtocol = CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS.find((p) =>
				url.includes(`${p}://`),
			);

			if (!invalidProtocol) {
				parameters['parameters.url'] = url;
				importCurlEventBus.emit(
					'setHttpNodeParameters',
					parameters as unknown as CurlToJSONResponse,
				);

				options?.onImportSuccess?.();

				return;
				// if we have a node that supports the invalid protocol
				// suggest that one
			} else if (CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol]) {
				const useNode = CURL_IMPORT_NODES_PROTOCOLS[invalidProtocol];

				showProtocolErrorWithSupportedNode(invalidProtocol, useNode);
				// we do not have a node that supports the use protocol
			} else {
				showProtocolError(invalidProtocol);
			}

			options?.onImportFailure?.({
				invalidProtocol: true,
				protocol: invalidProtocol,
			});
		} catch (e) {
			showInvalidcURLCommandError();

			options?.onImportFailure?.({
				invalidProtocol: false,
			});
		} finally {
			options?.onAfterImport?.();
		}
	}

	function showProtocolErrorWithSupportedNode(protocol: string, node: string): void {
		toast.showToast({
			title: i18n.baseText('importCurlParameter.showError.invalidProtocol1.title', {
				interpolate: {
					node,
				},
			}),
			message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol: protocol.toUpperCase(),
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showProtocolError(protocol: string): void {
		toast.showToast({
			title: i18n.baseText('importCurlParameter.showError.invalidProtocol2.title'),
			message: i18n.baseText('importCurlParameter.showError.invalidProtocol.message', {
				interpolate: {
					protocol,
				},
			}),
			type: 'error',
			duration: 0,
		});
	}

	function showInvalidcURLCommandError(): void {
		toast.showToast({
			title: i18n.baseText(translationStrings.invalidCurCommand.title as BaseTextKey),
			message: i18n.baseText(translationStrings.invalidCurCommand.message as BaseTextKey),
			type: 'error',
			duration: 0,
		});
	}

	return {
		importCurlCommand,
	};
}
