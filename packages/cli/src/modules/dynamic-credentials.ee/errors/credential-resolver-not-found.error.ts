import { UserError } from 'n8n-workflow';

import { CredentialResolutionError } from './credential-resolution.error';

/** Thrown by the resolver CRUD API when a resolver with the given ID does not exist. */
export class DynamicCredentialResolverNotFoundError extends UserError {
	constructor(resolverId: string) {
		super(`Credential resolver with ID "${resolverId}" does not exist.`);
	}
}

/**
 * Thrown during execution when the resolver referenced by a credential or workflow setting
 * cannot be found (entity deleted from DB or resolver type no longer registered).
 */
export class CredentialResolverNotFoundError extends CredentialResolutionError {
	constructor(credentialName: string, resolverId: string) {
		super(`Resolver "${resolverId}" not found for credential "${credentialName}"`);
		this.name = 'CredentialResolverNotFoundError';
	}
}
