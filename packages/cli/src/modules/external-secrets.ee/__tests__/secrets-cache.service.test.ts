import { mockLogger } from '@n8n/backend-test-utils';

import { AnotherDummyProvider, DummyProvider } from '@test/external-secrets/utils';

import { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import { ExternalSecretsSecretsCache } from '../secrets-cache.service';

describe('SecretsCache', () => {
	let cache: ExternalSecretsSecretsCache;
	let registry: ExternalSecretsProviderRegistry;
	let dummyProvider: DummyProvider;
	let anotherProvider: AnotherDummyProvider;

	const providerSettings = {
		connected: true,
		connectedAt: new Date(),
		settings: {},
	};

	beforeEach(async () => {
		registry = new ExternalSecretsProviderRegistry();
		cache = new ExternalSecretsSecretsCache(mockLogger(), registry);

		dummyProvider = new DummyProvider();
		await dummyProvider.init(providerSettings);
		await dummyProvider.connect();

		anotherProvider = new AnotherDummyProvider();
		await anotherProvider.init(providerSettings);
		await anotherProvider.connect();
	});

	describe('refreshAll', () => {
		it('should refresh secrets from all connected providers', async () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const updateSpy1 = jest.spyOn(dummyProvider, 'update');
			const updateSpy2 = jest.spyOn(anotherProvider, 'update');

			await cache.refreshAll();

			expect(updateSpy1).toHaveBeenCalledTimes(1);
			expect(updateSpy2).toHaveBeenCalledTimes(1);
		});

		it('should only refresh connected providers', async () => {
			dummyProvider.setState('error', new Error('Test error'));

			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const updateSpy1 = jest.spyOn(dummyProvider, 'update');
			const updateSpy2 = jest.spyOn(anotherProvider, 'update');

			await cache.refreshAll();

			expect(updateSpy1).not.toHaveBeenCalled();
			expect(updateSpy2).toHaveBeenCalledTimes(1);
		});

		it('should handle refresh errors gracefully', async () => {
			const failingProvider = new DummyProvider();
			await failingProvider.init(providerSettings);
			await failingProvider.connect();
			jest.spyOn(failingProvider, 'update').mockRejectedValue(new Error('Update failed'));

			registry.add('failing', failingProvider);
			registry.add('dummy', dummyProvider);

			await expect(cache.refreshAll()).resolves.not.toThrow();
		});

		it('should continue refreshing other providers if one fails', async () => {
			jest.spyOn(dummyProvider, 'update').mockRejectedValue(new Error('Update failed'));

			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const updateSpy = jest.spyOn(anotherProvider, 'update');

			await cache.refreshAll();

			expect(updateSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle empty registry', async () => {
			await expect(cache.refreshAll()).resolves.not.toThrow();
		});
	});

	describe('getSecret', () => {
		it('should get secret from provider', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const result = cache.getSecret('dummy', 'test1');

			expect(result).toBe('value1');
		});

		it('should return undefined for non-existent provider', () => {
			const result = cache.getSecret('non-existent', 'test1');

			expect(result).toBeUndefined();
		});

		it('should return undefined for non-existent secret', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const result = cache.getSecret('dummy', 'non-existent');

			expect(result).toBeUndefined();
		});

		it('should delegate to provider getSecret method', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const getSpy = jest.spyOn(dummyProvider, 'getSecret');

			cache.getSecret('dummy', 'test1');

			expect(getSpy).toHaveBeenCalledWith('test1');
		});
	});

	describe('hasSecret', () => {
		it('should return true when secret exists', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const result = cache.hasSecret('dummy', 'test1');

			expect(result).toBe(true);
		});

		it('should return false for non-existent provider', () => {
			const result = cache.hasSecret('non-existent', 'test1');

			expect(result).toBe(false);
		});

		it('should return false for non-existent secret', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const result = cache.hasSecret('dummy', 'non-existent');

			expect(result).toBe(false);
		});

		it('should delegate to provider hasSecret method', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const hasSpy = jest.spyOn(dummyProvider, 'hasSecret');

			cache.hasSecret('dummy', 'test1');

			expect(hasSpy).toHaveBeenCalledWith('test1');
		});
	});

	describe('getSecretNames', () => {
		it('should return secret names from provider', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const result = cache.getSecretNames('dummy');

			expect(result).toEqual(['test1', 'test2']);
		});

		it('should return empty array for non-existent provider', () => {
			const result = cache.getSecretNames('non-existent');

			expect(result).toEqual([]);
		});

		it('should return empty array when provider has no secrets', () => {
			registry.add('dummy', dummyProvider);
			// Don't call update, so no secrets are loaded

			const result = cache.getSecretNames('dummy');

			expect(result).toEqual([]);
		});

		it('should delegate to provider getSecretNames method', async () => {
			registry.add('dummy', dummyProvider);
			await dummyProvider.update();

			const getNamesSpy = jest.spyOn(dummyProvider, 'getSecretNames');

			cache.getSecretNames('dummy');

			expect(getNamesSpy).toHaveBeenCalled();
		});
	});

	describe('getAllSecretNames', () => {
		it('should return secret names from all providers', async () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			await dummyProvider.update();
			await anotherProvider.update();

			const result = cache.getAllSecretNames();

			expect(result).toEqual({
				dummy: ['test1', 'test2'],
				another: ['test1', 'test2'],
			});
		});

		it('should return empty object when no providers exist', () => {
			const result = cache.getAllSecretNames();

			expect(result).toEqual({});
		});

		it('should include providers with no secrets', () => {
			registry.add('dummy', dummyProvider);
			// Don't call update, so no secrets are loaded

			const result = cache.getAllSecretNames();

			expect(result).toEqual({
				dummy: [],
			});
		});

		it('should handle mix of providers with and without secrets', async () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			await dummyProvider.update();
			// Don't update anotherProvider

			const result = cache.getAllSecretNames();

			expect(result).toEqual({
				dummy: ['test1', 'test2'],
				another: [],
			});
		});
	});

	describe('integration', () => {
		it('should refresh and retrieve secrets', async () => {
			registry.add('dummy', dummyProvider);

			await cache.refreshAll();

			expect(cache.hasSecret('dummy', 'test1')).toBe(true);
			expect(cache.getSecret('dummy', 'test1')).toBe('value1');
			expect(cache.getSecretNames('dummy')).toEqual(['test1', 'test2']);
		});

		it('should update secrets after refresh', async () => {
			registry.add('dummy', dummyProvider);

			await cache.refreshAll();
			expect(cache.getSecret('dummy', 'test1')).toBe('value1');

			// Update provider secrets
			dummyProvider._updateSecrets = { test1: 'updated-value', test3: 'new-value' };
			await cache.refreshAll();

			expect(cache.getSecret('dummy', 'test1')).toBe('updated-value');
			expect(cache.getSecret('dummy', 'test3')).toBe('new-value');
			expect(cache.getSecretNames('dummy')).toEqual(['test1', 'test3']);
		});
	});
});
