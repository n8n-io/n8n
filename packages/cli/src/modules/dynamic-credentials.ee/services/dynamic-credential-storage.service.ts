import type {
	CredentialStoreMetadata,
	IDynamicCredentialStorageProvider,
} from '@/credentials/dynamic-credential-storage.interface';
import {
	type ICredentialContext,
	type ICredentialDataDecryptedObject,
	type IWorkflowSettings,
	jsonParse,
} from 'n8n-workflow';
import type { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import type { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import type { Cipher } from 'n8n-core';
import { CredentialStorageError } from '../errors/credential-storage.error';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { extractSharedFields } from './shared-fields';

@Service()
export class DynamicCredentialStorageService implements IDynamicCredentialStorageProvider {
	constructor(
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {}

	async storeIfNeeded(
		credentialStoreMetadata: CredentialStoreMetadata,
		dynamicData: ICredentialDataDecryptedObject,
		credentialContext: ICredentialContext,
		staticData?: ICredentialDataDecryptedObject,
		workflowSettings?: IWorkflowSettings,
	): Promise<void> {
		try {
			if (!credentialStoreMetadata.isResolvable) {
				// Not resolvable - nothing to store
				return;
			}

			// Determine which resolver ID to use: credential's own resolver or workflow's fallback
			const resolverId =
				credentialStoreMetadata.resolverId ?? workflowSettings?.credentialResolverId;

			// Not resolvable - return static credentials
			if (!resolverId) {
				return this.handleNoResolver(credentialStoreMetadata);
			}

			// Load resolver configuration
			const resolverEntity = await this.resolverRepository.findOneBy({
				id: resolverId,
			});

			if (!resolverEntity) {
				return this.handleMissingResolver(credentialStoreMetadata, resolverId);
			}

			// Get resolver instance from registry
			const resolver = this.resolverRegistry.getResolverByName(resolverEntity.type);

			if (!resolver) {
				return this.handleMissingResolver(credentialStoreMetadata, resolverId);
			}

			const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			const credentialType = this.loadNodesAndCredentials.getCredential(
				credentialStoreMetadata.type,
			);

			// Get shared fields based on credential type
			const sharedFields = extractSharedFields(credentialType.type);

			const mergedDynamicData = {
				...(staticData ?? {}),
				...dynamicData,
			};

			for (const field of sharedFields) {
				if (field in mergedDynamicData) {
					delete mergedDynamicData[field];
				}
			}

			await resolver.setSecret(credentialStoreMetadata.id, credentialContext, mergedDynamicData, {
				configuration: resolverConfig,
				resolverName: resolverEntity.name,
				resolverId: resolverEntity.id,
			});

			this.logger.debug('Successfully stored dynamic credentials', {
				credentialId: credentialStoreMetadata.id,
				resolverId,
				resolverSource: credentialStoreMetadata.resolverId ? 'credential' : 'workflow',
				identity: credentialContext.identity,
			});
		} catch (error) {
			throw new CredentialStorageError(
				`Failed to store dynamic credentials data for "${credentialStoreMetadata.name}"`,
				{ cause: error },
			);
		}
	}

	private handleNoResolver(credentialStoreMetadata: CredentialStoreMetadata) {
		throw new CredentialStorageError(
			`No resolver found for credential "${credentialStoreMetadata.name}"`,
		);
	}

	private handleMissingResolver(
		credentialStoreMetadata: CredentialStoreMetadata,
		resolverId: string,
	) {
		throw new CredentialStorageError(
			`Resolver "${resolverId}" not found for credential "${credentialStoreMetadata.name}"`,
		);
	}
}
