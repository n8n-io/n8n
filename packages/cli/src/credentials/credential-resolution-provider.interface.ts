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
	resolvableAllowFallback?: boolean;
	isResolvable: boolean;
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
	 * @param canUseExternalSecrets Whether the credential can use external secrets for expression resolution
	 * @returns Resolved credential data (either dynamic or static)
	 */
	resolveIfNeeded(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
		canUseExternalSecrets?: boolean,
	): Promise<ICredentialDataDecryptedObject>;
}
