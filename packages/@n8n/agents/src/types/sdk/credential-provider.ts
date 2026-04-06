/** A resolved credential containing at minimum an API key. */
export interface ResolvedCredential {
	apiKey: string;
	[key: string]: unknown;
}

/** Summary of a credential available for use. */
export interface CredentialListItem {
	id: string;
	name: string;
	type: string;
}

/**
 * A reference to a credential value resolved at build time via CredentialProvider.
 * Storing this reference (instead of the raw secret) in schemas keeps secrets out of serialized data.
 */
export interface CredentialConfig {
	/** Credential identifier passed to CredentialProvider.resolve(). */
	name: string;
	/** Optional dot-path into the resolved credential object (e.g. 'password'). */
	path?: string;
}

/**
 * Interface for resolving credentials at build time.
 *
 * The platform injects an implementation that knows how to look up
 * credentials by ID and return decrypted values. This keeps raw keys
 * out of user code and avoids the need to subclass Agent.
 *
 * @example
 * ```typescript
 * const agent = new Agent('assistant')
 *   .model('anthropic', 'claude-sonnet-4')
 *   .credential('credential-id-123')
 *   .credentialProvider(myProvider)
 *   .instructions('You are helpful.');
 * ```
 */
export interface CredentialProvider {
	/** Resolve a credential by ID, returning decrypted credential data. */
	resolve(credentialId: string): Promise<ResolvedCredential>;

	/** List credentials available to this agent. */
	list(): Promise<CredentialListItem[]>;
}
