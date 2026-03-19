import type { CredentialDependencyRepository, SecretsProviderConnectionRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import {
	CredentialDependencyService,
	EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
} from '@/credentials/credential-dependency.service';

describe('CredentialDependencyService', () => {
	const credentialDependencyRepository = mock<CredentialDependencyRepository>();
	const secretsProviderConnectionRepository = mock<SecretsProviderConnectionRepository>();
	const service = new CredentialDependencyService(
		credentialDependencyRepository,
		secretsProviderConnectionRepository,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('resolveExternalSecretsStoreDependencyFilter', () => {
		it('returns dependency filter when provider exists', async () => {
			secretsProviderConnectionRepository.findIdByProviderKey.mockResolvedValue('42');

			const result = await service.resolveExternalSecretsStoreDependencyFilter('vault');

			expect(secretsProviderConnectionRepository.findIdByProviderKey).toHaveBeenCalledWith('vault');
			expect(result).toEqual({
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyId: '42',
			});
		});

		it('returns undefined when provider does not exist', async () => {
			secretsProviderConnectionRepository.findIdByProviderKey.mockResolvedValue(null);

			const result = await service.resolveExternalSecretsStoreDependencyFilter('missing');

			expect(result).toBeUndefined();
		});
	});

	describe('upsertExternalSecretProviderDependenciesForCredential', () => {
		it('resolves provider ids and upserts dependencies', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue(['7', '8']);
			const entityManager = mock<EntityManager>();

			await service.upsertExternalSecretProviderDependenciesForCredential({
				credentialId: 'cred-1',
				decryptedCredentialData: {
					apiKey: '={{ $secrets.vault.apiKey }}',
					token: '={{ $secrets["aws-secrets-manager"].token }}',
				},
				entityManager,
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([
				'vault',
				'aws-secrets-manager',
			]);
			expect(credentialDependencyRepository.upsertDependenciesForCredential).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyIds: ['7', '8'],
				entityManager,
			});
		});

		it('handles credential data without external providers', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue([]);
			const entityManager = mock<EntityManager>();

			await service.upsertExternalSecretProviderDependenciesForCredential({
				credentialId: 'cred-1',
				decryptedCredentialData: { apiKey: 'plain-value' },
				entityManager,
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([]);
			expect(credentialDependencyRepository.upsertDependenciesForCredential).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyIds: [],
				entityManager,
			});
		});
	});

	describe('syncExternalSecretProviderDependenciesForCredential', () => {
		it('resolves provider ids and syncs dependencies', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue(['7', '8']);
			const entityManager = mock<EntityManager>();

			await service.syncExternalSecretProviderDependenciesForCredential({
				credentialId: 'cred-1',
				decryptedCredentialData: {
					apiKey: '={{ $secrets.vault.apiKey }}',
					token: '={{ $secrets["aws-secrets-manager"].token }}',
				},
				entityManager,
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([
				'vault',
				'aws-secrets-manager',
			]);
			expect(credentialDependencyRepository.syncDependenciesForCredential).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyIds: ['7', '8'],
				entityManager,
			});
		});

		it('handles credential data without external providers', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue([]);
			const entityManager = mock<EntityManager>();

			await service.syncExternalSecretProviderDependenciesForCredential({
				credentialId: 'cred-1',
				decryptedCredentialData: { apiKey: 'plain-value' },
				entityManager,
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([]);
			expect(credentialDependencyRepository.syncDependenciesForCredential).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
				dependencyIds: [],
				entityManager,
			});
		});
	});
});
