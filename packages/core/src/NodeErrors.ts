import {
	IErrorObject,
	INode,
	IStatusCodeMessages,
} from 'n8n-workflow';

/**
 * Top-level properties where an error message can be found in an API response.
 */
const ERROR_MESSAGE_PROPERTIES = [
	'message',
	'Message',
	'msg',
	'messages',
	'description',
	'reason',
	'detail',
	'details',
	'errors',
	'errorMessage',
	'errorMessages',
	'ErrorMessage',
	'error_message',
	'_error_message',
	'errorDescription',
	'error_description',
	'error_summary',
	'title',
	'text',
	'field',
	'error',
	'err',
	'type',
];

/**
 * Top-level properties where an HTTP error code can be found in an API response.
 */
const ERROR_CODE_PROPERTIES = ['statusCode', 'status', 'code', 'status_code', 'errorCode', 'error_code'];

/**
 * Properties where an nested object can be found in an API response.
 */
const ERROR_NESTING_PROPERTIES = ['error', 'err', 'response', 'body', 'data'];

/**
 * Base class for specific NodeError-types,
 * with functionality for finding a value recursively inside an error object.
 */
abstract class NodeError extends Error {
	description: string | null | undefined;
	cause: Error | IErrorObject;
	node: INode;
	timestamp: number;

	constructor(name: string, node: INode, error: Error | IErrorObject) {
		super();
		this.name = name;
		this.cause = error;
		this.node = node;
		this.timestamp = new Date().getTime();
	}

	/**
	 * Finds property through exploration based on potential keys and traversal keys.
	 * Depth-first approach.
	 *
	 * This method iterates over `potentialKeys` and, if the value at
	 * the key is a truthy value, the type of the value is checked:
	 * (1) if a string or number, the value is returned as a string; or
	 * (2) if an array,
	 * 		its string or number elements are collected as a long string,
	 * 		its object elements are traversed recursively (restart this function
	 *    with each object as a starting point)
	 *
	 * If nothing found via `potentialKeys` this method iterates over `traversalKeys` and
	 * if the value at the key is a traversable object it restarts with the object as the new starting point (recursion).
	 * If nothing found for the `traversalKey` exploration continues with remaining `traversalKeys`.
	 *
	 * Otherwise, if all the paths have been exhausted and no value is eligible, `null` is returned.
	 *
	 * @param {IErrorObject} error
	 * @param {string[]} potentialKeys
	 * @param {string[]} traversalKeys
	 * @returns {string | null}
	 */
	protected findProperty(
		error: IErrorObject,
		potentialKeys: string[],
		traversalKeys: string[],
	): string | null {
		for(const key of potentialKeys) {
			if (error[key]) {
				if (typeof error[key] === 'string') return error[key] as string;
				if (typeof error[key] === 'number') return error[key]!.toString();
				if (Array.isArray(error[key])) {
					// @ts-ignore
					const resolvedErrors: string[] = error[key].map((error) => {
							if (typeof error === 'string') return error;
							if (typeof error === 'number') return error.toString();
							if (this.isTraversableObject(error)) {
								return this.findProperty(error, potentialKeys, traversalKeys);
							}
							return null;
						})
						.filter((errorValue: string | null) => errorValue !== null);

					if (resolvedErrors.length === 0) {
						return null;
					}
					return resolvedErrors.join(' | ');
				}
			}
		}

		for (const key of traversalKeys) {
			if (this.isTraversableObject(error[key])) {
				const property = this.findProperty(error[key] as IErrorObject, potentialKeys, traversalKeys);
				if (property) {
					return property;
				}
			}
		}

		return null;
	}

	/**
	 * Check if a value is an object with at least one key, i.e. it can be traversed.
	 */
	private isTraversableObject(value: unknown): value is IErrorObject { // tslint:disable-line:no-any
		return value && typeof value === 'object' && !Array.isArray(value) && !!Object.keys(value).length;
	}
}

/**
 * Class for instantiating an operational error, e.g. an invalid credentials error.
 */
export class NodeOperationError extends NodeError {

	constructor(node: INode, error: Error | string) {
		if (typeof error === 'string') {
			error = new Error(error);
		}
		super('NodeOperationError', node, error);
		this.message = `${this.node.name}: ${error.message}`;
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

const UNKNOWN_ERROR_MESSAGE = 'UNKNOWN ERROR - check the detailed error for more information';

/**
 * Class for instantiating an error in an API response, e.g. a 404 Not Found response,
 * with an HTTP error code, an error message and a description (stack trace header).
 */
export class NodeApiError extends NodeError {
	httpCode: string | null;

	constructor(
		node: INode,
		error: IErrorObject,
		{message, description, httpCode}: {message?: string, description?: string, httpCode?: string} = {},
	){
		super('NodeApiError', node, error);
		this.message = `${this.node.name}: `;
		if (message) {
			this.message += message;
			this.description = description;
			this.httpCode = httpCode ?? null;
			if (this.httpCode && this.description) {
				this.description = `${this.httpCode} - ${this.description}`;
			}
			else if (this.httpCode) {
				this.description = `Status Code: ${this.httpCode}`;
			}
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

		if (!this.httpCode) {
			this.httpCode = null;
			this.message += UNKNOWN_ERROR_MESSAGE;
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
				this.message += UNKNOWN_ERROR_MESSAGE;
		}
	}
}
