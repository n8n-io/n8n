import { ForbiddenError } from '@n8n/errors';

export class InvalidMfaCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid two-factor code.', hint);
	}
}
