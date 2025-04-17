import { UnexpectedError } from 'n8n-workflow';

export class ExternalSecretsProviderNotFoundError extends UnexpectedError {
	constructor(public providerName: string) {
		super(`External secrets provider not found: ${providerName}`);
	}
}
