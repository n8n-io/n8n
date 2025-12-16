import type { Logger } from '@n8n/backend-common';
import type {
	CredentialStoreMetadata,
	IDynamicCredentialStorageProvider,
} from './dynamic-credential-storage.interface';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';
import type {
	CredentialResolveMetadata,
	ICredentialResolutionProvider,
} from './credential-resolution-provider.interface';
import { Service } from '@n8n/di';

@Service()
export class DynamicCredentialsProxy
	implements IDynamicCredentialStorageProvider, ICredentialResolutionProvider
{
	private storageProvider: IDynamicCredentialStorageProvider;
	private resolvingProvider: ICredentialResolutionProvider;

	constructor(private readonly logger: Logger) {}

	setStorageProvider(provider: IDynamicCredentialStorageProvider) {
		this.storageProvider = provider;
	}

	setResolverProvider(provider: ICredentialResolutionProvider) {
		this.resolvingProvider = provider;
	}

	async resolveIfNeeded(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
	): Promise<ICredentialDataDecryptedObject> {
		if (!this.resolvingProvider) {
			if (credentialsResolveMetadata.isResolvable) {
				this.logger.warn(
					`No dynamic credential resolving provider set, but trying to resolve resolvable credential "${credentialsResolveMetadata.name}"`,
				);
				throw new Error('No dynamic credential resolving provider set');
			}
			return staticData;
		}
		return await this.resolvingProvider.resolveIfNeeded(
			credentialsResolveMetadata,
			staticData,
			executionContext,
			workflowSettings,
		);
	}

	async storeIfNeeded(
		credentialStoreMetadata: CredentialStoreMetadata,
		dynamicData: ICredentialDataDecryptedObject,
		credentialContext: ICredentialContext,
		staticData?: ICredentialDataDecryptedObject,
		workflowSettings?: IWorkflowSettings,
	): Promise<void> {
		if (!this.storageProvider) {
			if (credentialStoreMetadata.isResolvable) {
				this.logger.warn(
					`No dynamic credential storage provider set, but trying to store resolvable credential "${credentialStoreMetadata.name}"`,
				);
				throw new Error('No dynamic credential storage provider set');
			}
			return;
		}
		return await this.storageProvider.storeIfNeeded(
			credentialStoreMetadata,
			dynamicData,
			credentialContext,
			staticData,
			workflowSettings,
		);
	}
}
