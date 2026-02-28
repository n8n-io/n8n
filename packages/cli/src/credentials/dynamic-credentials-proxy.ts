import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';
import { UnexpectedError, toCredentialContext } from 'n8n-workflow';

import type {
	CredentialResolveMetadata,
	ICredentialResolutionProvider,
} from './credential-resolution-provider.interface';
import type {
	CredentialStoreMetadata,
	IDynamicCredentialStorageProvider,
} from './dynamic-credential-storage.interface';

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
		canUseExternalSecrets?: boolean,
	): Promise<ICredentialDataDecryptedObject> {
		// A2A inline credential resolution — runs before the EE module gate so BYOK
		// works on all instances (including unlicensed dev instances).
		const a2aResult = this.resolveA2AInline(
			credentialsResolveMetadata,
			staticData,
			executionContext,
		);
		if (a2aResult !== undefined) return a2aResult;

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
			canUseExternalSecrets,
		);
	}

	/**
	 * Attempts A2A inline credential resolution. Returns resolved data if the
	 * execution context carries an `agent-a2a` source, or `undefined` to signal
	 * the caller should continue with the standard resolution path.
	 */
	private resolveA2AInline(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
	): ICredentialDataDecryptedObject | undefined {
		if (!executionContext?.credentials) return undefined;

		let credentialContext: ICredentialContext | undefined;
		try {
			const cipher = Container.get(Cipher);
			const decrypted = cipher.decrypt(executionContext.credentials);
			credentialContext = toCredentialContext(decrypted);
		} catch (error) {
			this.logger.error('Failed to decrypt credential context for A2A check', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}

		if (credentialContext?.metadata?.source !== 'agent-a2a') return undefined;

		const workflowCredentials = credentialContext.metadata.workflowCredentials as
			| Record<string, Record<string, string>>
			| undefined;
		const inlineCreds = workflowCredentials?.[credentialsResolveMetadata.type];

		if (inlineCreds && typeof inlineCreds === 'object') {
			this.logger.debug('A2A proxy: injecting inline BYOK credentials', {
				credentialId: credentialsResolveMetadata.id,
				credentialType: credentialsResolveMetadata.type,
				identity: credentialContext.identity,
			});
			return { ...staticData, ...inlineCreds };
		}

		// A2A context present but no BYOK for this type — respect fallback setting
		if (credentialsResolveMetadata.resolvableAllowFallback) {
			this.logger.debug('A2A proxy: no BYOK for type, falling back to static', {
				credentialId: credentialsResolveMetadata.id,
				credentialType: credentialsResolveMetadata.type,
			});
			return staticData;
		}

		throw new UnexpectedError(
			`A2A credential resolution failed: no BYOK credentials for type "${credentialsResolveMetadata.type}"`,
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

	/**
	 * Stores OAuth token data for dynamic credentials, handling execution context decryption
	 */
	async storeOAuthTokenDataIfNeeded(
		credentialStoreMetadata: CredentialStoreMetadata,
		oauthTokenData: IDataObject,
		executionContext: IExecutionContext | undefined,
		staticData: ICredentialDataDecryptedObject,
		workflowSettings?: IWorkflowSettings,
	): Promise<void> {
		if (!credentialStoreMetadata.isResolvable || !credentialStoreMetadata.resolverId) {
			return;
		}

		const cipher = Container.get(Cipher);

		let credentialContext: { version: 1; identity: string } | undefined;

		if (executionContext?.credentials) {
			const decrypted = cipher.decrypt(executionContext.credentials);
			credentialContext = toCredentialContext(decrypted) as { version: 1; identity: string };
		}

		if (!credentialContext) {
			throw new UnexpectedError('No credential context found', {
				extra: {
					credentialId: credentialStoreMetadata.id,
					credentialName: credentialStoreMetadata.name,
				},
			});
		}

		await this.storeIfNeeded(
			credentialStoreMetadata,
			{ oauthTokenData } as ICredentialDataDecryptedObject,
			credentialContext,
			staticData,
			workflowSettings,
		);
	}
}
