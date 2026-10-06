import { ForbiddenError } from '@n8n/errors';

export class InvalidMfaRecoveryCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid MFA recovery code', hint);
	}
}
