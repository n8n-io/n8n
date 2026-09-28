import { ForbiddenError } from '@n8n/backend-services';

export class InvalidMfaCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid two-factor code.', hint);
	}
}
