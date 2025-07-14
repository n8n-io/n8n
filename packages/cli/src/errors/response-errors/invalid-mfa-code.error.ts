import { ForbiddenError } from './forbidden.error';

export class InvalidMfaCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid two-factor code.', hint);
	}
}
