import { UserError } from 'n8n-workflow';

export class InvalidSamlMetadataUrlError extends UserError {
	constructor() {
		super('Failed to produce valid SAML metadata from the provided url');
	}
}
