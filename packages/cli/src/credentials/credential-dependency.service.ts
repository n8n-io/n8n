import type { CredentialDependencyType } from '@n8n/db';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { extractExternalSecretProviderKeys } from './validation';

export const EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE = 'externalSecretProvider' as const;

export type CredentialDependencyFilter = {
	dependencyType: CredentialDependencyType;
	dependencyId: string;
};

@Service()
export class CredentialDependencyService {
	constructor(
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

	async resolveProviderIdsFromCredentialData(
		decryptedCredentialData: ICredentialDataDecryptedObject,
	): Promise<string[]> {
		const providerKeys = [...extractExternalSecretProviderKeys(decryptedCredentialData)];
		return await this.secretsProviderConnectionRepository.findIdsByProviderKeys(providerKeys);
	}
}
