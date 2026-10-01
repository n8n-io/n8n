import { UnexpectedError } from '@n8n/errors';

export class CredentialMissingIdError extends UnexpectedError {
	constructor(credentialName: string, credentialType: string) {
		super('Found credential with no ID.', {
			extra: { credentialName },
			tags: { credentialType },
		});
	}
}
