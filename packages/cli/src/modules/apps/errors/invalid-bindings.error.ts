import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class InvalidBindingsError extends BadRequestError {
	constructor(issues: string[]) {
		super(`Invalid bindings: ${issues.join(' ')}`);
	}
}
