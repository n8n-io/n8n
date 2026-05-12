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
	 * Whether this resolution requires the execution data to be redacted.
	 * Defaults to true for externally-identified resolutions (chat-hub etc.)
	 * because their tokens are sensitive to operators. False for editor-driven
	 * manual runs where the n8n user is connecting to themselves — they should
	 * see their own execution output.
	 */
	requiresRedaction?: boolean;
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
	 * Returns the id of the system-managed credential resolver used for "private"
	 * (per-user self-connect) credentials. The resolver is lazily seeded on first
	 * call so end-users never need an admin to wire one up.
	 */
	getPrivateCredentialResolverId(): Promise<string | null>;

	/**
	 * Returns the subset of credential ids for which the given user already has
	 * a stored connection (i.e. an entry in DynamicCredentialUserEntry). Used to
	 * compute the `connectedByMe` flag surfaced to the editor.
	 */
	getConnectedCredentialIdsForUser(userId: string, credentialIds: string[]): Promise<Set<string>>;
}
