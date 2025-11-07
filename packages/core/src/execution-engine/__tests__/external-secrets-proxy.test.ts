import { mock } from 'jest-mock-extended';

import { ExternalSecretsProxy, type IExternalSecretsManager } from '../external-secrets-proxy';

describe('ExternalSecretsProxy', () => {
	let proxy: ExternalSecretsProxy;
	const manager = mock<IExternalSecretsManager>();

	beforeEach(() => {
		jest.resetAllMocks();
		proxy = new ExternalSecretsProxy();
	});

	describe('update', () => {
		it('should update secrets when manager is set', async () => {
			manager.updateSecrets.mockResolvedValue();
			proxy.setManager(manager);

			await proxy.update();

			expect(manager.updateSecrets).toHaveBeenCalledTimes(1);
		});

		it('should not throw when updating without a manager', async () => {
			await expect(proxy.update()).resolves.not.toThrow();
		});
	});

	describe('getSecret', () => {
		it('should get secret from manager', () => {
			const secretValue = { key: 'value' };
			manager.getSecret.mockReturnValue(secretValue);
			proxy.setManager(manager);

			const result = proxy.getSecret('aws', 'api-key');

			expect(manager.getSecret).toHaveBeenCalledWith('aws', 'api-key');
			expect(result).toBe(secretValue);
		});

		it('should return undefined when getting secret without a manager', () => {
			const result = proxy.getSecret('aws', 'api-key');

			expect(result).toBeUndefined();
		});
	});

	describe('hasSecret', () => {
		it('should check if secret exists', () => {
			manager.hasSecret.mockReturnValue(true);
			proxy.setManager(manager);

			const result = proxy.hasSecret('aws', 'api-key');

			expect(manager.hasSecret).toHaveBeenCalledWith('aws', 'api-key');
			expect(result).toBe(true);
		});

		it('should return false when checking secret without a manager', () => {
			const result = proxy.hasSecret('aws', 'api-key');

			expect(result).toBe(false);
		});
	});

	describe('hasProvider', () => {
		it('should check if provider exists', () => {
			manager.hasProvider.mockReturnValue(true);
			proxy.setManager(manager);

			const result = proxy.hasProvider('aws');

			expect(manager.hasProvider).toHaveBeenCalledWith('aws');
			expect(result).toBe(true);
		});

		it('should return false when checking provider without a manager', () => {
			const result = proxy.hasProvider('aws');

			expect(result).toBe(false);
		});
	});

	describe('listProviders', () => {
		it('should list providers', () => {
			const providers = ['aws', 'gcp', 'azure'];
			manager.getProviderNames.mockReturnValue(providers);
			proxy.setManager(manager);

			const result = proxy.listProviders();

			expect(manager.getProviderNames).toHaveBeenCalledTimes(1);
			expect(result).toEqual(providers);
		});

		it('should return empty array when listing providers without a manager', () => {
			const result = proxy.listProviders();

			expect(result).toEqual([]);
		});
	});

	describe('listSecrets', () => {
		it('should list secrets for a provider', () => {
			const secrets = ['api-key', 'api-secret', 'token'];
			manager.getSecretNames.mockReturnValue(secrets);
			proxy.setManager(manager);

			const result = proxy.listSecrets('aws');

			expect(manager.getSecretNames).toHaveBeenCalledWith('aws');
			expect(result).toEqual(secrets);
		});

		it('should return empty array when listing secrets without a manager', () => {
			const result = proxy.listSecrets('aws');

			expect(result).toEqual([]);
		});
	});
});
