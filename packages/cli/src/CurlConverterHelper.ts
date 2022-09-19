import curlconverter from 'curlconverter';
import get from 'lodash.get';

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
	name: string;
	value: string;
}

export interface HttpNodeParameters {
	url?: string;
	method: string;
	sendBody?: boolean;
	authentication: string;
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'raw';
	rawContentType?: string;
	specifyBody?: 'json' | 'keypair';
	bodyParameters?: {
		parameters: Parameter[];
	};
	jsonBody?: object;
	options: {
		proxy?: string;
		redirect?: {
			redirect?: {
				followRedirects?: boolean;
			};
		};
		response?: {
			response?: {
				includeResponseMetadata?: boolean;
				responseFormat?: string;
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

const INCLUDE_HEADERS_IN_OUTPOUT_FLAGS = ['-i', '--include'];

const REQUEST_FLAGS = ['-X', '--request'];

const curlToJson = (curlCommand: string): CurlJson => {
	return JSON.parse(curlconverter.toJsonString(curlCommand)) as CurlJson;
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
	return false;
};

const isMultipartRequest = (curlJson: CurlJson): boolean => {
	if (isContentType(curlJson.headers, ContentTypes.applicationMultipart)) return true;

	// only multipart/form-data request include files
	if (curlJson.files) return true;
	return false;
};

const sanatizeCurlCommand = (curlCommand: string) =>
	curlCommand
		.replace(/\r\n/g, ' ')
		.replace(/\n/g, ' ')
		.replace(/\\/g, ' ')
		.replace(/[ ]{2,}/g, ' ');

// const isBinaryRequest = (curlJson: CurlJson): boolean => {
// 	if (isContentType(curlJson.headers, ContentTypes.applicationMultipart)) return true;

// 	// only multipart/form-data request include files
// 	if (curlJson.files) return true;
// 	return false;
// };

const toKeyValueArray = ([key, value]: string[]) => ({ name: key, value });

const extractHeaders = (headers: CurlJson['headers'] = {}): HttpNodeHeaders => {
	const emptyHeaders = !Object.keys(headers).length;

	const onlyContentTypeHeaderDefined =
		Object.keys(headers).length === 1 && headers[CONTENT_TYPE_KEY] !== undefined;

	if (emptyHeaders || onlyContentTypeHeaderDefined) return { sendHeaders: false };

	return {
		sendHeaders: true,
		headerParameters: {
			parameters: Object.entries(headers).map(toKeyValueArray),
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
	JSON.parse(Object.keys(body)[0]) as { [key: string]: string };

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

const toLowerKeys = (obj: { [x: string]: string }) => {
	return Object.keys(obj).reduce((accumulator: { [key: string]: string }, key) => {
		accumulator[key.toLowerCase()] = obj[key];
		return accumulator;
	}, {});
};

const encodeBasicAuthentication = (username: string, password: string) =>
	Buffer.from(`${username}:${password}`).toString('base64');

const jsonHasNestedObjects = (json: { [key: string]: string | number | object }) =>
	Object.values(json).some((e) => typeof e === 'object');

const extractGroup = (curlCommand: string, regex: RegExp) => curlCommand.matchAll(regex);

const mapCookies = (cookies: CurlJson['cookies']) => {
	if (!cookies) return { cookie: '' };

	return {
		cookie: Object.entries(cookies).reduce((accumulator: string, entry: [string, string]) => {
			accumulator += `${entry[0]}=${entry[1]};`;
			return accumulator;
		}, ''),
	};
};

export const toHttpNodeParameters = (curlCommand: string): HttpNodeParameters => {
	const curlJson = curlToJson(curlCommand);

	if (!curlJson.headers) curlJson.headers = {};

	curlJson.headers = toLowerKeys(curlJson.headers);

	// set basic authentication
	if (curlJson.auth) {
		const { user, password: pass } = curlJson.auth;
		Object.assign(curlJson.headers, {
			authorization: `Basic ${encodeBasicAuthentication(user, pass)}`,
		});
	}

	console.log(JSON.stringify(curlJson, undefined, 2));

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

	const contentType = curlJson?.headers?.[CONTENT_TYPE_KEY] as ContentTypes;

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
		// could figure the content type so do not set the body
		Object.assign(httpNodeParameters, {
			sendBody: false,
		});
	}

	//attempt to get the curl flags not supported by the library
	const curl = sanatizeCurlCommand(curlCommand);

	//check for follow redirect flags
	if (FOLLOW_REDIRECT_FLAGS.some((flag) => curl.includes(` ${flag} `))) {
		Object.assign(httpNodeParameters.options.redirect?.redirect, { followRedirects: true });

		if (curl.includes(` ${MAX_REDIRECT_FLAG} `)) {
			const [_, maxRedirects] = Array.from(
				extractGroup(curl, new RegExp(`${MAX_REDIRECT_FLAG} (\\d+) `, 'g')),
			)[0];
			if (maxRedirects) {
				Object.assign(httpNodeParameters.options.redirect?.redirect, { maxRedirects });
			}
		}
	}

	//check for proxy flags
	if (PROXY_FLAGS.some((flag) => curl.includes(` ${flag} `))) {
		const foundFlag = PROXY_FLAGS.find((flag) => curl.includes(` ${flag} `));
		if (foundFlag) {
			const [_, proxy] = Array.from(extractGroup(curl, new RegExp(`${foundFlag} (.+) `, 'g')))[0];
			Object.assign(httpNodeParameters.options, { proxy });
		}
	}

	// check for "include header in output" flag
	if (INCLUDE_HEADERS_IN_OUTPOUT_FLAGS.some((flag) => curl.includes(` ${flag} `))) {
		Object.assign(httpNodeParameters.options?.response?.response, {
			includeResponseMetadata: true,
			responseFormat: 'autodetect',
		});
	}

	console.log(curl);

	// check for request flag
	if (REQUEST_FLAGS.some((flag) => curl.includes(` ${flag} `))) {
		const foundFlag = REQUEST_FLAGS.find((flag) => curl.includes(` ${flag} `));
		if (foundFlag) {
			const [_, request] = Array.from(
				extractGroup(curl, new RegExp(`${foundFlag} (\\D+) `, 'g')),
			)[0];
			httpNodeParameters.method = request.toUpperCase();
		}
	}

	console.log(JSON.stringify(httpNodeParameters, undefined, 2));
	return httpNodeParameters;
};
