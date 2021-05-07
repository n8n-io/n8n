import axios, { AxiosRequestConfig, Method } from 'axios';
import {
	IDataObject,
} from 'n8n-workflow';
import {
	IRestApiContext,
} from '../Interface';


class ResponseError extends Error {
	// The HTTP status code of response
	httpStatusCode?: number;

	// The error code in the response
	errorCode?: number;

	// The stack trace of the server
	serverStackTrace?: string;

	/**
	 * Creates an instance of ResponseError.
	 * @param {string} message The error message
	 * @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	 * @param {number} [httpStatusCode] The HTTP status code the response should have
	 * @param {string} [stack] The stack trace
	 * @memberof ResponseError
	 */
	constructor (message: string, options: {errorCode?: number, httpStatusCode?: number, stack?: string} = {}) {
		super(message);
		this.name = 'ResponseError';

		const { errorCode, httpStatusCode, stack } = options;
		if (errorCode) {
			this.errorCode = errorCode;
		}
		if (httpStatusCode) {
			this.httpStatusCode = httpStatusCode;
		}
		if (stack) {
			this.serverStackTrace = stack;
		}
	}
}

export async function makeRestApiRequest(context: IRestApiContext, method: Method, endpoint: string, data?: IDataObject) {
	const { baseUrl, sessionId } = context;
	const options: AxiosRequestConfig = {
		method,
		url: endpoint,
		baseURL: baseUrl,
		headers: {
			sessionid: sessionId,
		},
	};
	if (['PATCH', 'POST', 'PUT'].includes(method)) {
		options.data = data;
	} else {
		options.params = data;
	}

	try {
		const response = await axios.request(options);
		return response.data.data;
	} catch (error) {
		if (error.message === 'Network Error') {
			throw new ResponseError('API-Server can not be reached. It is probably down.');
		}

		const errorResponseData = error.response.data;
		if (errorResponseData !== undefined && errorResponseData.message !== undefined) {
			throw new ResponseError(errorResponseData.message, {errorCode: errorResponseData.code, httpStatusCode: error.response.status, stack: errorResponseData.stack});
		}

		throw error;
	}
}