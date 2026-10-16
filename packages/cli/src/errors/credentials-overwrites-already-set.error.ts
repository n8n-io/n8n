import { UserError } from '@n8n/errors';

export class CredentialsOverwritesAlreadySetError extends UserError {
	constructor() {
		super('Credentials overwrites may not be set more than once.');
	}
}
