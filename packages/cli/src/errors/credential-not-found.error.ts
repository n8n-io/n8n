import { UserError } from 'n8n-workflow';

export class CredentialNotFoundError extends UserError {
	constructor(credentialId: string, credentialType?: string) {
		credentialType
			? super(`Credential with ID "${credentialId}" does not exist for type "${credentialType}".`)
			: super(`Credential with ID "${credentialId}" was not found.`);
	}
}
