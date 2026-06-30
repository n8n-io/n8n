import type {
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';

export type CredentialResolveMetadata = {
	id: string;
	name: string;
	/** Credential type (e.g., 'oAuth2Api') */
	type: string;
	resolverId?: string;
	isResolvable: boolean;
};

export type CredentialResolutionResult = {
	data: ICredentialDataDecryptedObject;
	/** True only when the credential was actually resolved via a dynamic resolver (not a fallback to static data). */
	isDynamic: boolean;
	/**
	 * The n8n user the resolved private credentials belong to, when the resolver
	 * maps the context identity to an n8n user (n8n JWT resolver). Undefined for
	 * external-identity resolvers (Slack, OAuth subjects) and static fallbacks.
	 * Used by the redaction layer to grant the executing user access to their
	 * own data.
	 */
	resolvedUserId?: string;
};

/**
 * Interface for credential resolution providers.
 * Implementations can provide dynamic credential resolution logic.
 * This allows EE modules to hook into credential resolution without tight coupling.
 */
export interface ICredentialResolutionProvider {
	/**
	 * Resolves credentials dynamically if configured, otherwise returns static data.
	 *
	 * @param credentialsResolveMetadata The credential resolve metadata
	 * @param staticData The decrypted static credential data
	 * @param additionalData Additional workflow execution data for context and settings
	 * @returns Resolved credential data and a flag indicating whether dynamic resolution occurred
	 */
	resolveIfNeeded(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
	): Promise<CredentialResolutionResult>;

	/**
	 * Returns the seeded system resolver id used to store private credentials
	 * on the running user's behalf (e.g. OAuth2 callback for `isResolvable`
	 * credentials). Returns null when the system resolver has not been seeded.
	 */
	getSystemResolverId(): string | null;
}
