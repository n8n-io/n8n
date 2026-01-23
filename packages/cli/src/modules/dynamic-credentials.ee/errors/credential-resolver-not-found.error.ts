import { UserError } from 'n8n-workflow';

export class DynamicCredentialResolverNotFoundError extends UserError {
	constructor(resolverId: string) {
		super(`Credential resolver with ID "${resolverId}" does not exist.`);
	}
}
