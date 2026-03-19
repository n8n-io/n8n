import type { SecretsProviderConnectionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import {
	CredentialDependencyService,
	EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
} from '@/credentials/credential-dependency.service';

describe('CredentialDependencyService', () => {
	const secretsProviderConnectionRepository = mock<SecretsProviderConnectionRepository>();
	const service = new CredentialDependencyService(secretsProviderConnectionRepository);

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

	describe('resolveProviderIdsFromCredentialData', () => {
		it('extracts provider keys and resolves provider ids', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue(['7', '8']);

			const result = await service.resolveProviderIdsFromCredentialData({
				apiKey: '={{ $secrets.vault.apiKey }}', // With dot notation
				token: '={{ $secrets["aws-secrets-manager"].token }}', // With bracket notation
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([
				'vault',
				'aws-secrets-manager',
			]);
			expect(result).toEqual(['7', '8']);
		});

		it('returns empty ids when no providers are referenced', async () => {
			secretsProviderConnectionRepository.findIdsByProviderKeys.mockResolvedValue([]);

			const result = await service.resolveProviderIdsFromCredentialData({
				apiKey: 'plain-value',
			});

			expect(secretsProviderConnectionRepository.findIdsByProviderKeys).toHaveBeenCalledWith([]);
			expect(result).toEqual([]);
		});
	});
});
