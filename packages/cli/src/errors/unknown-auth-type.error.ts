import { ApplicationError } from 'n8n-workflow';

export class UnknownAuthTypeError extends ApplicationError {
	constructor(authType: string) {
		super('Unknown auth type', { extra: { authType } });
	}
}
