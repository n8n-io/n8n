import { CredentialResolutionError } from './credential-resolution.error';

/**
 * Thrown when dynamic credential resolution is attempted but no execution context
 * (or no credentials field within it) is available.
 */
export class MissingExecutionContextError extends CredentialResolutionError {
	constructor(credentialName: string) {
		super(`Cannot resolve dynamic credentials without execution context for "${credentialName}"`);
		this.name = 'MissingExecutionContextError';
	}
}
