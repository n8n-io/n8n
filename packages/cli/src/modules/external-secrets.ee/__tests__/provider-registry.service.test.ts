import { AnotherDummyProvider, DummyProvider } from '@test/external-secrets/utils';

import { ExternalSecretsProviderRegistry } from '../provider-registry.service';

describe('ProviderRegistry', () => {
	let registry: ExternalSecretsProviderRegistry;
	let dummyProvider: DummyProvider;
	let anotherProvider: AnotherDummyProvider;

	beforeEach(() => {
		registry = new ExternalSecretsProviderRegistry();
		dummyProvider = new DummyProvider();
		anotherProvider = new AnotherDummyProvider();
	});

	describe('add', () => {
		it('should add a provider to the registry', () => {
			registry.add('dummy', dummyProvider);

			expect(registry.has('dummy')).toBe(true);
			expect(registry.get('dummy')).toBe(dummyProvider);
		});

		it('should overwrite existing provider with same name', () => {
			const provider1 = new DummyProvider();
			const provider2 = new DummyProvider();

			registry.add('dummy', provider1);
			registry.add('dummy', provider2);

			expect(registry.get('dummy')).toBe(provider2);
		});
	});

	describe('remove', () => {
		it('should remove a provider from the registry', () => {
			registry.add('dummy', dummyProvider);
			expect(registry.has('dummy')).toBe(true);

			registry.remove('dummy');

			expect(registry.has('dummy')).toBe(false);
		});

		it('should handle removing non-existent provider', () => {
			expect(() => registry.remove('non-existent')).not.toThrow();
		});
	});

	describe('get', () => {
		it('should return provider by name', () => {
			registry.add('dummy', dummyProvider);

			const result = registry.get('dummy');

			expect(result).toBe(dummyProvider);
		});

		it('should return undefined for non-existent provider', () => {
			const result = registry.get('non-existent');

			expect(result).toBeUndefined();
		});
	});

	describe('has', () => {
		it('should return true when provider exists', () => {
			registry.add('dummy', dummyProvider);

			expect(registry.has('dummy')).toBe(true);
		});

		it('should return false when provider does not exist', () => {
			expect(registry.has('non-existent')).toBe(false);
		});
	});

	describe('getAll', () => {
		it('should return all providers as a Map', () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const result = registry.getAll();

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(2);
			expect(result.get('dummy')).toBe(dummyProvider);
			expect(result.get('another')).toBe(anotherProvider);
		});

		it('should return a copy of the providers map', () => {
			registry.add('dummy', dummyProvider);

			const result = registry.getAll();
			result.set('modified', anotherProvider);

			// Original registry should not be affected
			expect(registry.has('modified')).toBe(false);
		});

		it('should return empty map when no providers exist', () => {
			const result = registry.getAll();

			expect(result.size).toBe(0);
		});
	});

	describe('getConnected', () => {
		it('should return only connected providers', async () => {
			// Set up providers with different states
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });
			await dummyProvider.connect();

			await anotherProvider.init({ connected: true, connectedAt: new Date(), settings: {} });
			anotherProvider.setState('error', new Error('Test error'));

			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const result = registry.getConnected();

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(dummyProvider);
		});

		it('should return empty array when no providers are connected', () => {
			const result = registry.getConnected();

			expect(result).toEqual([]);
		});
	});

	describe('getNames', () => {
		it('should return all provider names', () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			const result = registry.getNames();

			expect(result).toEqual(expect.arrayContaining(['dummy', 'another']));
			expect(result).toHaveLength(2);
		});

		it('should return empty array when no providers exist', () => {
			const result = registry.getNames();

			expect(result).toEqual([]);
		});
	});

	describe('clear', () => {
		it('should remove all providers', () => {
			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);
			expect(registry.getNames()).toHaveLength(2);

			registry.clear();

			expect(registry.getNames()).toEqual([]);
			expect(registry.has('dummy')).toBe(false);
			expect(registry.has('another')).toBe(false);
		});

		it('should handle clearing when no providers exist', () => {
			expect(() => registry.clear()).not.toThrow();
		});
	});

	describe('disconnectAll', () => {
		it('should disconnect all providers', async () => {
			const disconnectSpy1 = jest.spyOn(dummyProvider, 'disconnect');
			const disconnectSpy2 = jest.spyOn(anotherProvider, 'disconnect');

			registry.add('dummy', dummyProvider);
			registry.add('another', anotherProvider);

			await registry.disconnectAll();

			expect(disconnectSpy1).toHaveBeenCalledTimes(1);
			expect(disconnectSpy2).toHaveBeenCalledTimes(1);
		});

		it('should ignore errors during disconnect', async () => {
			const errorProvider = new DummyProvider();
			jest.spyOn(errorProvider, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));

			registry.add('error', errorProvider);

			await expect(registry.disconnectAll()).resolves.not.toThrow();
		});

		it('should disconnect all providers even if some fail', async () => {
			const errorProvider = new DummyProvider();
			jest.spyOn(errorProvider, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));

			const disconnectSpy = jest.spyOn(dummyProvider, 'disconnect');

			registry.add('error', errorProvider);
			registry.add('dummy', dummyProvider);

			await registry.disconnectAll();

			expect(disconnectSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle disconnectAll when no providers exist', async () => {
			await expect(registry.disconnectAll()).resolves.not.toThrow();
		});
	});
});
