import {
	IDataObject, // TODO: Remove me and create own type for Objects!!!
	IN8nApiResponseError,
	IN8nErrorPathMapping,
} from 'n8n-workflow';

class NodeError extends Error {
	subtitle: string | undefined;
	cause: Error;
	node: string;
	timestamp: number;

  constructor(node: string, error: Error) {
    super();
		this.cause = error;
		this.node = node;
		this.timestamp = new Date().getTime();
	}
}

export class NodeOperationError extends NodeError {

  constructor(node: string, error: Error | string) {
		if (typeof error === "string") {
			error = new Error(error)
		}
    super(node, error);
		this.name = "NodeOperationError";
		this.message = `${node}: ${error.message}`;
	}
}

export class NodeApiError extends NodeError {
	httpCode: string;

	statusCodeMessages: IDataObject = {
		'400': 'Bad Request - please check the payload of your request',
		'401': 'Authorization failed - please check your Credentials',
		'403': 'Forbidden - please check your Credentials',
		'404': 'The path you are requesting has not been found',
		'405': 'Method not allowed - please check if you are using the right HTTP-Method',
		'429': 'Too many requests - take a break! the service is receiving too many requests from you',
		'500': 'The service was not able to process your request and returned an error',
		'502': 'Bad Gateway- service failed to handle your request',
		'503': 'Service Unavailable - try again later',
		'504': 'Gateway timed out - try again later',
	}

  constructor(node: string, error: Error, path: IN8nErrorPathMapping) {
    super(node, error);
		this.name = "NodeApiError";
		this.message = `${node}: `;

		const standardError = this.standardizeError(error, path);
		this.httpCode = standardError.code;
		this.message += this.statusCodeMessages[this.httpCode];
		this.subtitle = `[${standardError.code}]: ${standardError.message}`
	}

	/**
	 * Converts an API error object into a standard N8N error object based on the error path mapping provided.
	 *
	 * @export
	 * @param {object} errorObject
	 * @param {IN8nErrorPathMapping} errorPathMapping
	 * @returns {IN8nApiResponseError}
	 */
	standardizeError(errorObject: object, errorPathMapping: IN8nErrorPathMapping): IN8nApiResponseError {
		const apiResponseError: IN8nApiResponseError = {
			code: '',
			message: '',
		};

		const findValueRecursively = (accumulator: any, currentValue: any) => accumulator[currentValue]; // tslint:disable-line:no-any

		Object.entries(errorPathMapping).forEach(([key, path]) => {
			apiResponseError[key] = path.reduce(findValueRecursively, errorObject).toString();
		});

		return apiResponseError;
	}

	// /**
	//  * Throws an error with a standard N8N error message.
	//  *
	//  * @export
	//  * @param {string} nodeName
	//  * @param {IN8nApiResponseError} apiResponseError
	//  * @returns {never}
	//  */
	// throwApiResponseError(
	// 	nodeName: string,
	// 	apiResponseError: IN8nApiResponseError,
	// ): never {
	// 	throw new Error(`${nodeName} error response [${apiResponseError.code}]: ${apiResponseError.message}`);
	// }
}
