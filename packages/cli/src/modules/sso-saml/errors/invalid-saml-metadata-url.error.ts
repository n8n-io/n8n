import { UserError } from '@n8n/errors';

export class InvalidSamlMetadataUrlError extends UserError {
	constructor(url: string) {
		super(`Failed to produce valid SAML metadata from ${url}`);
	}
}
