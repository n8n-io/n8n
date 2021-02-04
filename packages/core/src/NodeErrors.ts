import {
	IDataObject, // TODO: Remove me and create own type for Objects!!!
	INodeErrorPath,
	INodeErrorResolved,
} from 'n8n-workflow';

class NodeError extends Error {
	subtitle: string | undefined;
	cause: Error | object;
	node: string;
	timestamp: number;

  constructor(node: string, error: Error | object) {
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
	codeProperties = ['statusCode', 'code', 'status', 'errorCode', 'status_code', 'error_code', 'type'];
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
		'error_info' // error_info key just additional info, how to treat that?
	];
	nestingProperties = ['error', 'err', 'response', 'body', 'data'];

	multiMessageProperties = ['messages']
	multiNestingProperties = ['errors',]


	statusCodeMessages: IDataObject = {
		'4XX': 'Your request is invalid or could not get processed by the service',
		'400': 'Bad Request - please check the payload of your request',
		'401': 'Authorization failed - please check your Credentials',
		'402': 'Payment required - please check your payment details',
		'403': 'Forbidden - please check your Credentials',
		'404': 'The path you are requesting has not been found',
		'405': 'Method not allowed - please check if you are using the right HTTP-Method',
		'429': 'Too many requests - take a break! the service is receiving too many requests from you',

		'5XX': 'The service failed to process your request - try again later',
		'500': 'The service was not able to process your request and returned an error',
		'502': 'Bad Gateway- service failed to handle your request',
		'503': 'Service unavailable - try again later',
		'504': 'Gateway timed out - try again later',
	}

  constructor(node: string, error: Error | object, path?: INodeErrorPath) {
    super(node, error);
		this.name = "NodeApiError";
		this.message = `${node}: `;

		if (path) {
			const resolvedError = this.resolveError(error, path);
			this.subtitle = `[${resolvedError.code}]: ${resolvedError.message}`
			this.httpCode = resolvedError.code;
			if (this.statusCodeMessages[this.httpCode] === undefined) {
				switch (this.httpCode.charAt(0)) {
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
			console.log(this);
			return;
		}
		this.httpCode = '123';

		// find code
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
			code: '',
			message: '',
		};

		Object.entries(errorPath).forEach(([key, path]) => {
			resolvedError[key] = path.reduce((accumulator: any, currentValue: any) => accumulator[currentValue], errorObject).toString();
		});

		return resolvedError;
	}
}
