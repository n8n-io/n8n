import { ApplicationError, type Severity } from 'n8n-workflow';

export class CredentialNotFoundError extends ApplicationError {
	severity: Severity;

	constructor(credentialId: string, credentialType: string) {
		super(`Credential with ID "${credentialId}" does not exist for type "${credentialType}".`);
		this.severity = 'warning';
	}
}
