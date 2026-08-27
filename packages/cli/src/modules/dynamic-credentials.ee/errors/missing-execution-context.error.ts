import { CredentialResolutionError } from './credential-resolution.error';

/**
 * Thrown when dynamic credential resolution is attempted but no execution context
 * (or no credentials field within it) is available.
 */
export class MissingExecutionContextError extends CredentialResolutionError {
	constructor() {
		super(
			"This node uses an end-user credential, but no user could be identified for this run, so the credential for it couldn't be resolved",
		);
		this.name = 'MissingExecutionContextError';
	}
}
