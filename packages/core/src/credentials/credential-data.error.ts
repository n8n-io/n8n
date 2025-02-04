import { ApplicationError } from 'n8n-workflow';

import type { Credentials } from '@/credentials/credentials';

export const CREDENTIAL_ERRORS = {
	NO_DATA: 'No data is set on this credentials.',
	DECRYPTION_FAILED:
		'Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
	INVALID_JSON: 'Decrypted credentials data is not valid JSON.',
	INVALID_DATA: 'Credentials data is not in a valid format.',
};

export class CredentialDataError extends ApplicationError {
	readonly credential: Pick<Credentials<object>, 'name' | 'type' | 'id'>;

	constructor({ name, type, id }: Credentials<object>, message: string, cause?: unknown) {
		message = `${message} (Credential: '${name}' - Type: ${type} - ID: ${id})`;

		super(message, {
			extra: { name, type, id },
			cause,
		});

		this.credential = { name, type, id };
	}
}
