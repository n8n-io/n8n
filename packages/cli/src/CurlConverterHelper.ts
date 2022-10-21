/* eslint-disable @typescript-eslint/no-unused-vars */
import curlconverter from 'curlconverter';
import get from 'lodash.get';
import { jsonParse } from 'n8n-workflow';

interface CurlJson {
	url: string;
	raw_url?: string;
	method: string;
	contentType?: string;
	cookies?: {
		[key: string]: string;
	};
	auth?: {
		user: string;
		password: string;
	};
	headers?: {
		[key: string]: string;
	};
	files?: {
		[key: string]: string;
	};
	queries: {
		[key: string]: string;
	};
	data?: {
		[key: string]: string;
	};
}

interface Parameter {
	parameterType?: string;
	name: string;
	value: string;
}

export interface HttpNodeParameters {
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

enum ContentTypes {
	applicationJson = 'application/json',
	applicationFormUrlEncoded = 'application/x-www-form-urlencoded',
	applicationMultipart = 'multipart/form-data',
}

const SUPPORTED_CONTENT_TYPES = [
	ContentTypes.applicationJson,
	ContentTypes.applicationFormUrlEncoded,
	ContentTypes.applicationMultipart,
];

const CONTENT_TYPE_KEY = 'content-type';

const FOLLOW_REDIRECT_FLAGS = ['--location', '-L'];

const MAX_REDIRECT_FLAG = '--max-redirs';

const PROXY_FLAGS = ['-x', '--proxy'];

const INCLUDE_HEADERS_IN_OUTPUT_FLAGS = ['-i', '--include'];

const REQUEST_FLAGS = ['-X', '--request'];

const TIMEOUT_FLAGS = ['--connect-timeout'];

const DOWNLOAD_FILE_FLAGS = ['-O', '-o'];

const IGNORE_SSL_ISSUES_FLAGS = ['-k', '--insecure'];

const curlToJson = (curlCommand: string): CurlJson => {
	return jsonParse(curlconverter.toJsonString(curlCommand));
};

const isContentType = (headers: CurlJson['headers'], contentType: ContentTypes): boolean => {
	return get(headers, CONTENT_TYPE_KEY) === contentType;
};

const isJsonRequest = (curlJson: CurlJson): boolean => {
	if (isContentType(curlJson.headers, ContentTypes.applicationJson)) return true;

	if (curlJson.data) {
		const bodyKey = Object.keys(curlJson.data)[0];
		try {
			JSON.parse(bodyKey);
			return true;
		} catch (_) {
			return false;
		}
	}
	return false;
};

const isFormUrlEncodedRequest = (curlJson: CurlJson): boolean => {
	if (isContentType(curlJson.headers, ContentTypes.applicationFormUrlEncoded)) return true;
	if (curlJson.data && !curlJson.files) return true;
	return false;
};

const isMultipartRequest = (curlJson: CurlJson): boolean => {
	if (isContentType(curlJson.headers, ContentTypes.applicationMultipart)) return true;

	// only multipart/form-data request include files
	if (curlJson.files) return true;
	return false;
};

const isBinaryRequest = (curlJson: CurlJson): boolean => {
	if (curlJson?.headers?.[CONTENT_TYPE_KEY]) {
		const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY];
		return ['image', 'video', 'audio'].some((d) => contentType.includes(d));
	}
	return false;
};

const sanatizeCurlCommand = (curlCommand: string) =>
	curlCommand
		.replace(/\r\n/g, ' ')
		.replace(/\n/g, ' ')
		.replace(/\\/g, ' ')
		.replace(/[ ]{2,}/g, ' ');

const toKeyValueArray = ([key, value]: string[]) => ({ name: key, value });

const extractHeaders = (headers: CurlJson['headers'] = {}): HttpNodeHeaders => {
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

const extractQueries = (queries: CurlJson['queries'] = {}): HttpNodeQueries => {
	const emptyQueries = !Object.keys(queries).length;

	if (emptyQueries) return { sendQuery: false };

	return {
		sendQuery: true,
		queryParameters: {
			parameters: Object.entries(queries).map(toKeyValueArray),
		},
	};
};

const extractJson = (body: CurlJson['data']) =>
	//@ts-ignore
	jsonParse<{ [key: string]: string }>(Object.keys(body)[0]);

const jsonBodyToNodeParameters = (body: CurlJson['data'] = {}): Parameter[] | [] => {
	const data = extractJson(body);
	return Object.entries(data).map(toKeyValueArray);
};

const multipartToNodeParameters = (
	body: CurlJson['data'] = {},
	files: CurlJson['files'] = {},
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

const keyValueBodyToNodeParameters = (body: CurlJson['data'] = {}): Parameter[] | [] => {
	return Object.entries(body).map(toKeyValueArray);
};

const lowerCaseContentTypeKey = (obj: { [x: string]: string }): void => {
	const regex = new RegExp(CONTENT_TYPE_KEY, 'gi');

	const contentTypeKey = Object.keys(obj).find((key) => {
		const group = Array.from(key.matchAll(regex));
		if (group.length) return true;
		return false;
	});

	if (!contentTypeKey) return;

	const value = obj[contentTypeKey];
	delete obj[contentTypeKey];
	obj[CONTENT_TYPE_KEY] = value;
};

const encodeBasicAuthentication = (username: string, password: string) =>
	Buffer.from(`${username}:${password}`).toString('base64');

const jsonHasNestedObjects = (json: { [key: string]: string | number | object }) =>
	Object.values(json).some((e) => typeof e === 'object');

const extractGroup = (curlCommand: string, regex: RegExp) => curlCommand.matchAll(regex);

const mapCookies = (cookies: CurlJson['cookies']): { cookie: string } | {} => {
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

export const toHttpNodeParameters = (curlCommand: string): HttpNodeParameters => {
	const curlJson = curlToJson(curlCommand);

	if (!curlJson.headers) curlJson.headers = {};

	lowerCaseContentTypeKey(curlJson.headers);

	// set basic authentication
	if (curlJson.auth) {
		const { user, password: pass } = curlJson.auth;
		Object.assign(curlJson.headers, {
			authorization: `Basic ${encodeBasicAuthentication(user, pass)}`,
		});
	}

	const httpNodeParameters: HttpNodeParameters = {
		url: curlJson.url,
		authentication: 'none',
		method: curlJson.method.toUpperCase(),
		...extractHeaders({ ...curlJson.headers, ...mapCookies(curlJson.cookies) }),
		...extractQueries(curlJson.queries),
		options: {
			redirect: {
				redirect: {},
			},
			response: {
				response: {},
			},
		},
	};

	//attempt to get the curl flags not supported by the library
	const curl = sanatizeCurlCommand(curlCommand);

	//check for follow redirect flags
	if (FOLLOW_REDIRECT_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		Object.assign(httpNodeParameters.options.redirect?.redirect, { followRedirects: true });

		if (curl.includes(` ${MAX_REDIRECT_FLAG}`)) {
			const extractedValue = Array.from(
				extractGroup(curl, new RegExp(` ${MAX_REDIRECT_FLAG} (\\d+)`, 'g')),
			);
			if (extractedValue.length) {
				const [_, maxRedirects] = extractedValue[0];
				if (maxRedirects) {
					Object.assign(httpNodeParameters.options.redirect?.redirect, { maxRedirects });
				}
			}
		}
	}

	//check for proxy flags
	if (PROXY_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		const foundFlag = PROXY_FLAGS.find((flag) => curl.includes(` ${flag}`));
		if (foundFlag) {
			const extractedValue = Array.from(
				extractGroup(curl, new RegExp(` ${foundFlag} (\\S*)`, 'g')),
			);
			if (extractedValue.length) {
				const [_, proxy] = extractedValue[0];
				Object.assign(httpNodeParameters.options, { proxy });
			}
		}
	}

	// check for "include header in output" flag
	if (INCLUDE_HEADERS_IN_OUTPUT_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		Object.assign(httpNodeParameters.options?.response?.response, {
			fullResponse: true,
			responseFormat: 'autodetect',
		});
	}

	// check for request flag
	if (REQUEST_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		const foundFlag = REQUEST_FLAGS.find((flag) => curl.includes(` ${flag}`));
		if (foundFlag) {
			const extractedValue = Array.from(
				extractGroup(curl, new RegExp(` ${foundFlag} (\\w+)`, 'g')),
			);
			if (extractedValue.length) {
				const [_, request] = extractedValue[0];
				httpNodeParameters.method = request.toUpperCase();
			}
		}
	}

	// check for timeout flag
	if (TIMEOUT_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		const foundFlag = TIMEOUT_FLAGS.find((flag) => curl.includes(` ${flag}`));
		if (foundFlag) {
			const extractedValue = Array.from(
				extractGroup(curl, new RegExp(` ${foundFlag} (\\d+)`, 'g')),
			);
			if (extractedValue.length) {
				const [_, timeout] = extractedValue[0];
				Object.assign(httpNodeParameters.options, {
					timeout: parseInt(timeout, 10) * 1000,
				});
			}
		}
	}

	// check for download flag
	if (DOWNLOAD_FILE_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		const foundFlag = DOWNLOAD_FILE_FLAGS.find((flag) => curl.includes(` ${flag}`));
		if (foundFlag) {
			Object.assign(httpNodeParameters.options.response.response, {
				responseFormat: 'file',
				outputPropertyName: 'data',
			});
		}
	}

	if (IGNORE_SSL_ISSUES_FLAGS.some((flag) => curl.includes(` ${flag}`))) {
		const foundFlag = IGNORE_SSL_ISSUES_FLAGS.find((flag) => curl.includes(` ${flag}`));
		if (foundFlag) {
			Object.assign(httpNodeParameters.options, {
				allowUnauthorizedCerts: true,
			});
		}
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

		const json = extractJson(curlJson.data);

		if (jsonHasNestedObjects(json)) {
			// json body
			Object.assign(httpNodeParameters, {
				specifyBody: 'json',
				jsonBody: JSON.stringify(json),
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
	} else if (isFormUrlEncodedRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: 'form-urlencoded',
			sendBody: true,
			specifyBody: 'keypair',
			bodyParameters: {
				parameters: keyValueBodyToNodeParameters(curlJson.data),
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
