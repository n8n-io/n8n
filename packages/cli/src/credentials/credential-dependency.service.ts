import type { CredentialDependencyType } from '@n8n/db';
import { CredentialDependencyRepository, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type EntityManager } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { extractProviderKeysFromCredentialData } from './external-secrets.utils';

export const EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE = 'externalSecretProvider' as const;

export type CredentialDependencyFilter = {
	dependencyType: CredentialDependencyType;
	dependencyId: string;
};

@Service()
export class CredentialDependencyService {
	constructor(
		private readonly credentialDependencyRepository: CredentialDependencyRepository,
		private readonly secretsProviderConnectionRepository: SecretsProviderConnectionRepository,
	) {}

	async resolveExternalSecretsStoreDependencyFilter(
		externalSecretsStoreProviderKey: string,
	): Promise<CredentialDependencyFilter | undefined> {
		const providerId = await this.secretsProviderConnectionRepository.findIdByProviderKey(
			externalSecretsStoreProviderKey,
		);

		if (providerId === null) return undefined;

		return {
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyId: providerId,
		};
	}

	private async resolveProviderIdsFromCredentialData(
		decryptedCredentialData: ICredentialDataDecryptedObject,
	): Promise<string[]> {
		const providerKeys = [...extractProviderKeysFromCredentialData(decryptedCredentialData)];
		return await this.secretsProviderConnectionRepository.findIdsByProviderKeys(providerKeys);
	}

	async upsertExternalSecretProviderDependenciesForCredential({
		credentialId,
		decryptedCredentialData,
		entityManager,
	}: {
		credentialId: string;
		decryptedCredentialData: ICredentialDataDecryptedObject;
		entityManager: EntityManager;
	}): Promise<void> {
		const dependencyIds = await this.resolveProviderIdsFromCredentialData(decryptedCredentialData);
		await this.credentialDependencyRepository.upsertDependenciesForCredential({
			credentialId,
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyIds,
			entityManager,
		});
	}

	async syncExternalSecretProviderDependenciesForCredential({
		credentialId,
		decryptedCredentialData,
		entityManager,
	}: {
		credentialId: string;
		decryptedCredentialData: ICredentialDataDecryptedObject;
		entityManager: EntityManager;
	}): Promise<void> {
		const dependencyIds = await this.resolveProviderIdsFromCredentialData(decryptedCredentialData);
		await this.credentialDependencyRepository.syncDependenciesForCredential({
			credentialId,
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyIds,
			entityManager,
		});
	}

	async deleteDependencyById({
		dependencyType,
		dependencyId,
		entityManager,
	}: {
		dependencyType: CredentialDependencyType;
		dependencyId: string;
		entityManager?: EntityManager;
	}): Promise<void> {
		const manager = entityManager ?? this.credentialDependencyRepository.manager;
		await manager.delete(this.credentialDependencyRepository.target, {
			dependencyType,
			dependencyId,
		});
	}

	async deleteDependenciesByIds({
		dependencyType,
		dependencyIds,
		entityManager,
	}: {
		dependencyType: CredentialDependencyType;
		dependencyIds: string[];
		entityManager?: EntityManager;
	}): Promise<void> {
		if (dependencyIds.length === 0) return;

		const manager = entityManager ?? this.credentialDependencyRepository.manager;
		await manager.delete(this.credentialDependencyRepository.target, {
			dependencyType,
			dependencyId: In(dependencyIds),
		});
	}
}
