import { OperationalError } from 'n8n-workflow';

export class CredentialResolutionError extends OperationalError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'CredentialResolutionError';
	}
}
