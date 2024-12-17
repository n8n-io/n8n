import { ApplicationError } from 'n8n-workflow';

export class CredentialsOverwritesAlreadySetError extends ApplicationError {
	constructor() {
		super('Credentials overwrites may not be set more than once.');
	}
}
