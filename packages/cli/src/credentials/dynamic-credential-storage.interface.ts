import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IWorkflowSettings,
} from 'n8n-workflow';

/**
 * Metadata for storing credentials to external systems.
 */
export type CredentialStoreMetadata = {
	/** Credential ID */
	id: string;
	/** Credential name */
	name: string;
	/** Credential type (e.g., 'oAuth2Api') */
	type: string;
	/** Resolver ID to use for storage */
	resolverId?: string;
	/** Whether credential supports dynamic storage */
	isResolvable: boolean;
};

/**
 * Provider for storing credentials to external secret management systems.
 * Handles the write path for dynamic credentials (e.g., OAuth token refresh).
 */
export interface IDynamicCredentialStorageProvider {
	/**
	 * Stores credential data to external system if credential is configured for dynamic storage.
	 *
	 * @param credentialStoreMetadata Credential metadata
	 * @param dynamicData Credential data to store (e.g., tokens)
	 * @param credentialContext Identity and metadata for scoping storage
	 * @param staticData Static credential data from database (e.g., clientId, clientSecret)
	 * @param workflowSettings Workflow settings with fallback resolver ID
	 */
	storeIfNeeded(
		credentialStoreMetadata: CredentialStoreMetadata,
		dynamicData: ICredentialDataDecryptedObject,
		credentialContext: ICredentialContext,
		staticData?: ICredentialDataDecryptedObject,
		workflowSettings?: IWorkflowSettings,
	): Promise<void>;
}
