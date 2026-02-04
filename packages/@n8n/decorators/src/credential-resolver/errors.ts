/**
 * Base error class for all credential resolver errors.
 */
export class CredentialResolverError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CredentialResolverError';
	}
}

/**
 * Thrown when no credential data exists for the requested credential and context combination.
 * Indicates the entity has not stored credentials for this credential type.
 */
export class CredentialResolverDataNotFoundError extends CredentialResolverError {
	constructor() {
		super('No data found available for the requested credential and context combination.');
		this.name = 'CredentialResolverDataNotFoundError';
	}
}

/**
 * Thrown when resolver configuration validation fails.
 * Indicates invalid configuration values or unreachable external services.
 */
export class CredentialResolverValidationError extends CredentialResolverError {
	constructor(message: string) {
		super(`Credential resolver options validation failed: ${message}`);
		this.name = 'CredentialResolverValidationError';
	}
}
