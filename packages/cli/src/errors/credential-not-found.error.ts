import { ApplicationError } from 'n8n-workflow';

export class CredentialNotFoundError extends ApplicationError {
	constructor(credentialId: string, credentialType: string) {
		super(`Credential with ID "${credentialId}" does not exist for type "${credentialType}".`);
		this.level = 'warning';
	}
}
