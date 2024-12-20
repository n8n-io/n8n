import { ApplicationError } from 'n8n-workflow';

export class InvalidSamlMetadataError extends ApplicationError {
	constructor() {
		super('Invalid SAML metadata', { level: 'warning' });
	}
}
