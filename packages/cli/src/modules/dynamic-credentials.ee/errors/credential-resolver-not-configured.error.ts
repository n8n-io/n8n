import { CredentialResolutionError } from './credential-resolution.error';

/**
 * Thrown when a credential is marked as resolvable but has no resolver configured
 * (neither on the credential itself nor on the workflow settings).
 */
export class CredentialResolverNotConfiguredError extends CredentialResolutionError {
	constructor(credentialName: string) {
		super(`No resolver configured for dynamic credential "${credentialName}"`);
		this.name = 'CredentialResolverNotConfiguredError';
	}
}
