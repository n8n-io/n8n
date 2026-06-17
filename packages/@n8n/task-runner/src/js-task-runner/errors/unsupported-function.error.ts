import { ApplicationError } from '@n8n/errors';

/**
 * Error that indicates that a specific function is not available in the
 * Code Node.
 */
export class UnsupportedFunctionError extends ApplicationError {
	constructor(functionName: string) {
		super(`The function "${functionName}" is not supported in the Code Node`, {
			level: 'info',
		});
	}
}
