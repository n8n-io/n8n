import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';

describe('ExternalSecretsProviders', () => {
	const providers = new ExternalSecretsProviders();

	describe('toProviderTypeResponse', () => {
		it('should map a provider to SecretProviderTypeResponse', () => {
			const AwsSecretsManager = providers.getProvider('awsSecretsManager');
			const provider = new AwsSecretsManager();

			const result = providers.toProviderTypeResponse(provider);

			expect(result).toEqual({
				type: 'awsSecretsManager',
				displayName: 'AWS Secrets Manager',
				icon: 'awsSecretsManager',
				properties: provider.properties,
			});
		});

		it('should map vault provider correctly', () => {
			const VaultProvider = providers.getProvider('vault');
			const provider = new VaultProvider();

			const result = providers.toProviderTypeResponse(provider);

			expect(result).toEqual({
				type: 'vault',
				displayName: 'HashiCorp Vault',
				icon: 'vault',
				properties: provider.properties,
			});
		});

		it('should include all required fields', () => {
			const AwsSecretsManager = providers.getProvider('awsSecretsManager');
			const provider = new AwsSecretsManager();

			const result = providers.toProviderTypeResponse(provider);

			expect(result).toHaveProperty('type');
			expect(result).toHaveProperty('displayName');
			expect(result).toHaveProperty('icon');
			expect(result).toHaveProperty('properties');
			expect(Array.isArray(result.properties)).toBe(true);
		});
	});
});
