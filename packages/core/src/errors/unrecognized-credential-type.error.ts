import { UserError } from '@n8n/errors';

export class UnrecognizedCredentialTypeError extends UserError {
	constructor(credentialType: string) {
		super(`Unrecognized credential type: ${credentialType}`);
	}
}
