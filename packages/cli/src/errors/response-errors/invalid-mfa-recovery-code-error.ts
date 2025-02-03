import { ForbiddenError } from './forbidden.error';

export class InvalidMfaRecoveryCodeError extends ForbiddenError {
	constructor(hint?: string) {
		super('Invalid MFA recovery code', hint);
	}
}
