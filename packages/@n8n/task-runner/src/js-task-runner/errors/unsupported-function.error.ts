import { UserError } from 'n8n-workflow';

/**
 * Error that indicates that a specific function is not available in the
 * Code Node.
 */
export class UnsupportedFunctionError extends UserError {
	constructor(functionName: string) {
		super(`The function "${functionName}" is not supported in the Code Node`);
	}
}
