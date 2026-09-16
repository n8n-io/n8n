import { ForbiddenError } from '@n8n/backend-services';

export class InvalidMfaRecoveryCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid MFA recovery code', hint);
	}
}
