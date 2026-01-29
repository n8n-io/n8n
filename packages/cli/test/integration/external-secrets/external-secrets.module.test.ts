import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';
import { ExternalSecretsProviderRegistry } from '@/modules/external-secrets.ee/provider-registry.service';
import { SecretsCacheRefresh } from '@/modules/external-secrets.ee/secrets-cache-refresh.service';
import { ExternalSecretsSecretsCache } from '@/modules/external-secrets.ee/secrets-cache.service';
import { ExternalSecretsSettingsStore } from '@/modules/external-secrets.ee/settings-store.service';

import { DummyProvider, MockProviders } from '../../shared/external-secrets/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

describe('ExternalSecretsModule', () => {
	jest.useFakeTimers();

	let module: ExternalSecretsModule;
	let secretsCacheRefresh: SecretsCacheRefresh;
	let settingsStore: ExternalSecretsSettingsStore;
	let providerRegistry: ExternalSecretsProviderRegistry;
	let secretsCache: ExternalSecretsSecretsCache;
	let config: ExternalSecretsConfig;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());
		mockProvidersInstance.setProviders({ dummy: DummyProvider });

		// Get services from container
		settingsStore = Container.get(ExternalSecretsSettingsStore);
		config = Container.get(ExternalSecretsConfig);

		// Set config to legacy mode
		(config as any).externalSecretsForProjects = false;

		// Save settings once for all tests
		await settingsStore.save({
			dummy: {
				connected: true,
				connectedAt: new Date(),
				settings: {},
			},
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(() => {
		module = Container.get(ExternalSecretsModule);
		secretsCacheRefresh = Container.get(SecretsCacheRefresh);
		providerRegistry = Container.get(ExternalSecretsProviderRegistry);
		secretsCache = Container.get(ExternalSecretsSecretsCache);

		// Clear provider registry between tests
		for (const name of providerRegistry.getNames()) {
			providerRegistry.remove(name);
		}
	});

	afterEach(async () => {
		await module.shutdown();
		jest.clearAllTimers();
	});

	describe('init', () => {
		it('should initialize and register providers', async () => {
			await module.init();

			expect(secretsCacheRefresh.initialized).toBe(true);
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('connected');
		});

		it('should refresh secrets on init', async () => {
			await module.init();

			expect(secretsCache.getSecretNames('dummy')).toEqual(['test1', 'test2']);
		});

		it('should start secrets refresh interval', async () => {
			await module.init();

			const provider = providerRegistry.get('dummy') as DummyProvider;
			const updateSpy = jest.spyOn(provider, 'update');

			jest.advanceTimersByTime(config.updateInterval * 1000);

			expect(updateSpy).toHaveBeenCalled();
		});
	});

	describe('shutdown', () => {
		it('should reset state', async () => {
			await module.init();
			expect(secretsCacheRefresh.initialized).toBe(true);

			await module.shutdown();

			expect(secretsCacheRefresh.initialized).toBe(false);
		});

		it('should stop refresh interval', async () => {
			await module.init();

			const provider = providerRegistry.get('dummy') as DummyProvider;
			const updateSpy = jest.spyOn(provider, 'update');

			await module.shutdown();

			jest.advanceTimersByTime(config.updateInterval * 1000 * 2);

			expect(updateSpy).not.toHaveBeenCalled();
		});

		it('should be idempotent', async () => {
			await module.init();

			await expect(
				(async () => {
					await module.shutdown();
					await module.shutdown();
					await module.shutdown();
				})(),
			).resolves.not.toThrow();

			expect(secretsCacheRefresh.initialized).toBe(false);
		});
	});
});
