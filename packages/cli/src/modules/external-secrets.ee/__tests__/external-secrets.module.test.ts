import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import {
	AnotherDummyProvider,
	DummyProvider,
	ErrorProvider,
	FailedProvider,
	MockProviders,
} from '@test/external-secrets/utils';

import { ExternalSecretsProviders } from '../external-secrets-providers.ee';
import { ExternalSecretsConfig } from '../external-secrets.config';
import { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import { SecretsCacheRefresh } from '../secrets-cache-refresh.service';
import { ExternalSecretsSecretsCache } from '../secrets-cache.service';
import { ExternalSecretsSettingsStore } from '../settings-store.service';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

describe('ExternalSecretsModule', () => {
	jest.useFakeTimers();

	let secretsCacheRefresh: SecretsCacheRefresh;
	let settingsStore: ExternalSecretsSettingsStore;
	let providerRegistry: ExternalSecretsProviderRegistry;
	let secretsCache: ExternalSecretsSecretsCache;
	let config: ExternalSecretsConfig;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings']);
		mockProvidersInstance.setProviders({ dummy: DummyProvider });

		Container.set(Logger, mockLogger());

		// Get services from container
		secretsCacheRefresh = Container.get(SecretsCacheRefresh);
		settingsStore = Container.get(ExternalSecretsSettingsStore);
		providerRegistry = Container.get(ExternalSecretsProviderRegistry);
		secretsCache = Container.get(ExternalSecretsSecretsCache);
		config = Container.get(ExternalSecretsConfig);

		// Clear provider registry between tests
		for (const name of providerRegistry.getNames()) {
			providerRegistry.remove(name);
		}

		// Set config to legacy mode for most tests
		(config as any).externalSecretsForProjects = false;
	});

	afterEach(() => {
		secretsCacheRefresh?.shutdown();
		jest.clearAllTimers();
	});

	describe('init', () => {
		it('should initialize and register providers from legacy settings', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			expect(secretsCacheRefresh.initialized).toBe(true);
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('connected');
		});

		it('should prevent double initialization', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();
			await secretsCacheRefresh.init();

			expect(secretsCacheRefresh.initialized).toBe(true);
			expect(providerRegistry.getNames()).toHaveLength(1);
		});

		it('should handle concurrent init calls safely', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await Promise.all([
				secretsCacheRefresh.init(),
				secretsCacheRefresh.init(),
				secretsCacheRefresh.init(),
			]);

			expect(secretsCacheRefresh.initialized).toBe(true);
			expect(providerRegistry.getNames()).toHaveLength(1);
		});

		it('should start secrets refresh interval', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			const provider = providerRegistry.get('dummy') as DummyProvider;
			const updateSpy = jest.spyOn(provider, 'update');

			// Advance time by the config interval
			jest.advanceTimersByTime(config.updateInterval * 1000);

			expect(updateSpy).toHaveBeenCalled();
		});

		it('should handle empty settings gracefully', async () => {
			await secretsCacheRefresh.init();

			expect(secretsCacheRefresh.initialized).toBe(true);
			expect(providerRegistry.getNames()).toHaveLength(0);
		});
	});

	describe('shutdown', () => {
		it('should disconnect all providers and reset state', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();
			expect(secretsCacheRefresh.initialized).toBe(true);

			secretsCacheRefresh.shutdown();

			expect(secretsCacheRefresh.initialized).toBe(false);
		});

		it('should stop refresh interval', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			const provider = providerRegistry.get('dummy') as DummyProvider;
			const updateSpy = jest.spyOn(provider, 'update');

			secretsCacheRefresh.shutdown();

			jest.advanceTimersByTime(config.updateInterval * 1000 * 2);

			// Update should not have been called after shutdown
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it('should be idempotent (safe to call multiple times)', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			expect(() => {
				secretsCacheRefresh.shutdown();
				secretsCacheRefresh.shutdown();
				secretsCacheRefresh.shutdown();
			}).not.toThrow();

			expect(secretsCacheRefresh.initialized).toBe(false);
		});
	});

	describe('provider lifecycle', () => {
		it('should connect provider when settings.connected is true', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.get('dummy')?.state).toBe('connected');
		});

		it('should not connect provider when settings.connected is false', async () => {
			await settingsStore.save({
				dummy: {
					connected: false,
					connectedAt: null,
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.get('dummy')?.state).toBe('initialized');
		});

		it('should handle provider initialization failure gracefully', async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				error: ErrorProvider,
			});

			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
				error: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Dummy should still work
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('connected');

			// Error provider should have failed but not crashed the init
			expect(secretsCacheRefresh.initialized).toBe(true);
		});

		it('should handle provider connection failure', async () => {
			mockProvidersInstance.setProviders({ dummy: FailedProvider });

			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Provider should be in registry but in error state
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('error');
		});

		it('should handle multiple providers', async () => {
			mockProvidersInstance.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
				another_dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.getNames()).toContain('dummy');
			expect(providerRegistry.getNames()).toContain('another_dummy');
			expect(providerRegistry.get('dummy')?.state).toBe('connected');
			expect(providerRegistry.get('another_dummy')?.state).toBe('connected');
		});
	});

	describe('secrets refresh', () => {
		it('should refresh secrets on init', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Secrets should be available after init
			expect(secretsCache.getSecretNames('dummy')).toEqual(['test1', 'test2']);
		});

		it('should refresh secrets at configured interval', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			const provider = providerRegistry.get('dummy') as DummyProvider;
			expect(secretsCache.getSecretNames('dummy')).toEqual(['test1', 'test2']);

			// Change the secrets that will be returned on next update
			provider._updateSecrets = { newSecret: 'newValue' };

			// Advance time to trigger refresh
			jest.advanceTimersByTime(config.updateInterval * 1000);

			expect(secretsCache.getSecretNames('dummy')).toEqual(['newSecret']);
		});
	});
});
