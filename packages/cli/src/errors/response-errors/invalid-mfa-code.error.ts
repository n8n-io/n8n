import { ForbiddenError } from '@n8n/services-common';

export class InvalidMfaCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid two-factor code.', hint);
	}
}
