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
	requestMethod: string;
	sendBody?: boolean;
	authentication: string;
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json' | 'raw';
	rawContentType?: string;
	specifyBody?: 'json' | 'keypair';
	bodyParameters?: {
		parameters: Parameter[];
	};
	jsonBody?: object;
	options: {};
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
			.map((e) => ({ isFile: false, ...e })),
		...Object.entries(files)
			.map(toKeyValueArray)
			.map((e) => ({ isFile: true, ...e })),
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

const jsonHasNestedObjects = (json: { [key: string]: string | number | object }) =>
	Object.values(json).some((e) => typeof e === 'object');

export const toHttpNodeParameters = (curlCommand: string): HttpNodeParameters => {
	const curlJson = curlToJson(curlCommand);

	if (curlJson.headers) {
		curlJson.headers = toLowerKeys(curlJson.headers);
	}

	console.log(JSON.stringify(curlJson, undefined, 2));

	const httpNodeParameters: HttpNodeParameters = {
		url: curlJson.url,
		authentication: 'none',
		requestMethod: curlJson.method.toUpperCase(),
		...extractHeaders({ ...curlJson.headers, ...curlJson.cookies }),
		...extractQueries(curlJson.queries),
		options: {},
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
	console.log(JSON.stringify(httpNodeParameters, undefined, 2));
	return httpNodeParameters;
};
