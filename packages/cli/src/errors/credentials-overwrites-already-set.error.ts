import { ApplicationError } from 'n8n-workflow';

export class CredentialsOverwritesAlreadySetError extends ApplicationError {
	constructor() {
		super('Credentials overwrites can be set only once');
	}
}
