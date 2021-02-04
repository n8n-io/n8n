import {
	IDataObject, // TODO: Remove me and create own type for Objects!!!
	INodeErrorPath,
	INodeErrorResolved,
} from 'n8n-workflow';

class NodeError extends Error {
	subtitle: string | undefined;
	cause: Error | object;
	nodeType: string;
	timestamp: number;

	constructor(nodeType: string, error: Error | object) {
		super();
		this.cause = error;
		this.nodeType = nodeType;
		this.timestamp = new Date().getTime();
	}
}

export class NodeOperationError extends NodeError {

	constructor(nodeType: string, error: Error | string) {
		if (typeof error === "string") {
			error = new Error(error);
		}
		super(nodeType, error);
		this.name = "NodeOperationError";
		this.message = `${nodeType}: ${error.message}`;
	}
}

export class NodeApiError extends NodeError {
	httpCode: number | null;
	codeProperties = ['statusCode', 'status', 'code', 'status_code', 'errorCode', 'error_code'];
	messageProperties = [
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
		'error', // error key just if error property is string
		'err', // err key just if error property is string
		'error_info', // error_info key just additional info, how to treat that?
		'type',// error_info key just additional info, how to treat that?
	];
	nestingProperties = ['error', 'err', 'response', 'body', 'data'];

	multiMessageProperties = ['messages'];
	multiNestingProperties = ['errors',];


	statusCodeMessages: IDataObject = {
		'4XX': 'Your request is invalid or could not get processed by the service',
		400: 'Bad Request - please check the payload of your request',
		401: 'Authorization failed - please check your Credentials',
		402: 'Payment required - please check your payment details',
		403: 'Forbidden - please check your Credentials',
		404: 'The resource you are requesting has not been found',
		405: 'Method not allowed - please check if you are using the right HTTP-Method',
		429: 'Too many requests - take a break! the service is receiving too many requests from you',

		'5XX': 'The service failed to process your request - try again later',
		500: 'The service was not able to process your request and returned an error',
		502: 'Bad Gateway- service failed to handle your request',
		503: 'Service unavailable - try again later',
		504: 'Gateway timed out - try again later',
	};

	constructor(
		nodeType: string,
		error: Error | object,
		options?: {path?: INodeErrorPath, message?: string, subtitle?: string, httpCode?: number},
	){
		super(nodeType, error);
		this.name = "NodeApiError";
		this.message = `${nodeType}: `;
		if (options?.message) {
			this.message += options.message;
			this.subtitle = options.subtitle;
			this.httpCode = options.httpCode ?? null;
			return;
		}

		if (options?.path) {
			const resolvedError = this.resolveError(error, options.path);
			this.subtitle = `[${resolvedError.code}]: ${resolvedError.message}`;
			this.httpCode = resolvedError.code;
			if (this.statusCodeMessages[this.httpCode] === undefined) {
				switch (this.httpCode.toString().charAt(0)) {
					case '4':
						this.message += this.statusCodeMessages['4XX'];
						break;
					case '5':
						this.message += this.statusCodeMessages['5XX'];
						break;
					default:
						this.message += 'UNKNOWN ERROR - check the detailed error for more information';
				}
				return;
			}

			this.message += this.statusCodeMessages[this.httpCode];
			return;
		}
		this.httpCode = null;

		// find code
			// Object.keys(error)
		// find message
		// this.message += this.statusCodeMessages[this.httpCode];
		// this.subtitle = `[${standardError.code}]: ${standardError.message}`

	}




	/**
	 * Resolves an API error object into a standardized error object based on the error path provided.
	 *
	 * @export
	 * @param {object} errorObject
	 * @param {INodeErrorPath} errorPath
	 * @returns {INodeErrorResolved}
	 */
	private resolveError(errorObject: object, errorPath: INodeErrorPath): INodeErrorResolved {
		const resolvedError: INodeErrorResolved = {
			code: 0,
			message: '',
		};

		Object.entries(errorPath).forEach(([key, path]) => {
			resolvedError[key] = path.reduce((accumulator: any, currentValue: any) => accumulator[currentValue], errorObject).toString();
		});

		return resolvedError;
	}
}
