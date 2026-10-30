import { OperationalError } from '@n8n/errors';

export class CredentialResolutionError extends OperationalError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'CredentialResolutionError';
	}
}
