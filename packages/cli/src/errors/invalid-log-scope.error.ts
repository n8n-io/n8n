import { ApplicationError } from 'n8n-workflow';

export class InvalidLogScopeError extends ApplicationError {
	constructor(invalidScopes: string[]) {
		super('Found invalid log scopes. Please review the value passed to the `DEBUG` env var.', {
			extra: { invalidScopes },
		});
	}
}
