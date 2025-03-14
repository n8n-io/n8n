import { UserError } from 'n8n-workflow';

export class InvalidSamlMetadataError extends UserError {
	constructor() {
		super('Invalid SAML metadata');
	}
}
