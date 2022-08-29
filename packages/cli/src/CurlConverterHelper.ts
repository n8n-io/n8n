import curlconverter from 'curlconverter';
import get from 'lodash.get';

interface CurlJson {
	url: string;
	raw_url?: string;
	method: string;
	contentType?: string;
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
	contentType?: 'form-urlencoded' | 'multipart-form-data' | 'json';
	bodyParameters?: {
		parameters: Parameter[];
	};
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

const curlToJson = (curlCommand: string): CurlJson => {
	return JSON.parse(curlconverter.toJsonString(curlCommand)) as CurlJson;
};

const isContentType = (headers: CurlJson['headers'], contentType: ContentTypes): boolean => {
	return get(headers, 'content-type') === contentType;
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

	// only multipart/form-data request include files
	if (!curlJson.files) return true;

	return false;
};

const isMultipartRequest = (curlJson: CurlJson): boolean => {
	if (isContentType(curlJson.headers, ContentTypes.applicationMultipart)) return true;

	// only multipart/form-data request include files
	if (!curlJson.files) return true;

	if (curlJson.data) return true;

	return false;
};

const toKeyValueArray = ([key, value]: string[]) => ({ name: key, value });

// const contentTypeKey = ({ name }: { name: string }) => name.toLowerCase() !== 'content-type';

const extractHeaders = (headers: CurlJson['headers']): HttpNodeHeaders => {
	const onlyContentTypeHeaderDefined =
		headers && Object.keys(headers).length === 1 && headers['Content-Type'] !== undefined;

	if (headers && !onlyContentTypeHeaderDefined) {
		return {
			sendHeaders: true,
			headerParameters: {
				parameters: Object.entries(headers).map(toKeyValueArray),
			},
		};
	}

	return {
		sendHeaders: false,
		headerParameters: {
			parameters: [],
		},
	};
};

const extractQueries = (queries: CurlJson['queries']): HttpNodeQueries => {
	if (queries) {
		return {
			sendQuery: true,
			queryParameters: {
				parameters: Object.entries(queries).map(toKeyValueArray),
			},
		};
	}

	return {
		sendQuery: false,
		queryParameters: {
			parameters: [],
		},
	};
};

const jsonBodyToNodeParameters = (body: CurlJson['data']): Parameter[] | [] => {
	if (body) {
		const data = JSON.parse(Object.keys(body)[0]) as { [key: string]: string };
		return Object.entries(data).map(toKeyValueArray);
	}

	return [];
};

const keyValueBodyToNodeParameters = (body: CurlJson['data']): Parameter[] | [] => {
	if (body) {
		return Object.entries(body).map(toKeyValueArray);
	}
	return [];
};

export const toHttpNodeParameters = (curlCommand: string): HttpNodeParameters => {
	const curlJson = curlToJson(curlCommand);

	console.log(JSON.stringify(curlJson, undefined, 2));

	const httpNodeParameters: HttpNodeParameters = {
		url: curlJson.url,
		requestMethod: curlJson.method.toUpperCase(),
		...extractHeaders(curlJson.headers),
		...extractQueries(curlJson.queries),
		options: {},
	};

	if (isJsonRequest(curlJson)) {
		Object.assign(httpNodeParameters, {
			contentType: 'json',
			sendBody: true,
			specifyBody: 'keypair',
			bodyParameters: {
				parameters: jsonBodyToNodeParameters(curlJson.data),
			},
		});
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
				parameters: keyValueBodyToNodeParameters(curlJson.data).map((data) => ({
					...data,
					isFile: false,
				})),
			},
		});
	}
	console.log(JSON.stringify(httpNodeParameters, undefined, 2));
	return httpNodeParameters;
};
