import {
	IErrorObject,
	INodeErrorPath,
	INodeErrorResolved,
	IStatusCodeMessages,
} from 'n8n-workflow';

const ERROR_MESSAGE_PROPERTIES = [
	'message',
	'Message',
	'msg',
	'description',
	'reason',
	'detail',
	'details',
	'errorMessage',
	'ErrorMessage',
	'error_message',
	'_error_message',
	'errorDescription',
	'error_description',
	'error_summary',
	'title',
	'text',
	'error',
	'err',
	'type',
];

const ERROR_CODE_PROPERTIES = ['statusCode', 'status', 'code', 'status_code', 'errorCode', 'error_code'];

const ERROR_NESTING_PROPERTIES = ['error', 'err', 'response', 'body', 'data'];

// const MULTI_MESSAGE_PROPERTIES = ['messages'];
// const MULTI_NESTING_PROPERTIES = ['errors'];

abstract class NodeError extends Error {
	description: string | null | undefined;
	cause: Error | IErrorObject;
	nodeType: string;
	timestamp: number;

	constructor(name: string, nodeType: string, error: Error | IErrorObject) {
		super();
		this.name = name;
		this.cause = error;
		this.nodeType = nodeType;
		this.timestamp = new Date().getTime();
	}

	/**
	 * Finds property through exploration based on potential keys and traversal keys.
	 *
	 * @param {IErrorObject} error
	 * @param {string[]} potentialKeys
	 * @param {string[]} traversalKeys
	 * @returns {string | null}
	 */
	protected findProperty(error: IErrorObject, potentialKeys: string[], traversalKeys: string[]): string | null {

		for(const key of potentialKeys) {
			if (error[key] && (typeof error[key] === 'string' || typeof error[key] === 'number')) {
				// @ts-ignore
				return typeof error[key] === 'string' ? error[key] : error[key].toString();
			}
		}

		for(const key of traversalKeys) {
			if (error[key] && typeof error[key] === 'object' && !Array.isArray(error[key])) {
				return this.findProperty(error[key] as IErrorObject, potentialKeys, traversalKeys);
			}
		}
		return null;
	}
}

export class NodeOperationError extends NodeError {

	constructor(nodeType: string, error: Error | string) {
		if (typeof error === 'string') {
			error = new Error(error);
		}
		super('NodeOperationError', nodeType, error);
		this.message = `${nodeType}: ${error.message}`;
	}
}

const STATUS_CODE_MESSAGES: IStatusCodeMessages = {
	'4XX': 'Your request is invalid or could not get processed by the service',
	'400': 'Bad Request - please check the payload of your request',
	'401': 'Authorization failed - please check your Credentials',
	'402': 'Payment required - please check your payment details',
	'403': 'Forbidden - please check your Credentials',
	'404': 'The resource you are requesting has not been found',
	'405': 'Method not allowed - please check if you are using the right HTTP-Method',
	'429': 'Too many requests - take a break! the service is receiving too many requests from you',

	'5XX': 'The service failed to process your request - try again later',
	'500': 'The service was not able to process your request and returned an error',
	'502': 'Bad Gateway- service failed to handle your request',
	'503': 'Service unavailable - try again later',
	'504': 'Gateway timed out - try again later',
};

export class NodeApiError extends NodeError {
	httpCode: string | null;

	constructor(
		nodeType: string,
		error: IErrorObject,
		{path, message, description, httpCode}: {path?: INodeErrorPath, message?: string, description?: string, httpCode?: string} = {},
	){
		super('NodeApiError', nodeType, error);
		this.message = `${nodeType}: `;
		if (message) {
			this.message += message;
			this.httpCode = httpCode ?? null;
			if (this.httpCode) {
				this.description = `${this.httpCode} - ${description}`;
			}
			else  {
				this.description = description;
			}
			return;
		}

		if (path) {
			const resolvedError = this.resolveError(error, path);
			this.httpCode = resolvedError.code;
			if (this.httpCode) {
				this.description = `${this.httpCode} - ${resolvedError.message}`;
			}
			else  {
				this.description = resolvedError.message;
			}
			this.setMessage();
			return;
		}

		this.httpCode = this.findProperty(error, ERROR_CODE_PROPERTIES, ERROR_NESTING_PROPERTIES);
		this.setMessage();

		this.description = this.findProperty(error, ERROR_MESSAGE_PROPERTIES, ERROR_NESTING_PROPERTIES);
	}

	/**
	 * Sets the error's message based on the http status code.
	 *
	 * @returns {void}
	 */
	private setMessage() {
		const unknownError = 'UNKNOWN ERROR - check the detailed error for more information';

		if (!this.httpCode) {
			this.httpCode = null;
			this.message += unknownError;
			return;
		}

		if (STATUS_CODE_MESSAGES[this.httpCode]) {
			this.message += STATUS_CODE_MESSAGES[this.httpCode];
			return;
		}

		switch (this.httpCode.charAt(0)) {
			case '4':
				this.message += STATUS_CODE_MESSAGES['4XX'];
				break;
			case '5':
				this.message += STATUS_CODE_MESSAGES['5XX'];
				break;
			default:
				this.message += unknownError;
		}
	}

	/**
	 * Resolves an API error object into a standardized error object based on the error path provided.
	 *
	 * @param {object} errorObject
	 * @param {INodeErrorPath} errorPath
	 * @returns {INodeErrorResolved}
	 */
	private resolveError(errorObject: object, errorPath: INodeErrorPath): INodeErrorResolved {
		const resolvedError: INodeErrorResolved = {
			code: '',
			message: '',
		};

		Object.entries(errorPath).forEach(([key, path]) => {
			resolvedError[key] = path.reduce((accumulator: INodeErrorResolved, currentValue: string) => accumulator[currentValue], errorObject).toString();
		});

		return resolvedError;
	}
}
