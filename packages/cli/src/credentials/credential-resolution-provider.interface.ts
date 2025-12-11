import type {
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';

export type CredentialResolveMetadata = {
	id: string;
	name: string;
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
	 * @param executionContext Optional execution context containing credential context
	 * @param workflowSettings Optional workflow settings containing resolver ID fallback
	 * @returns Resolved credential data (either dynamic or static)
	 */
	resolveIfNeeded(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
	): Promise<ICredentialDataDecryptedObject>;
}
