import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';
import { ExternalSecretsProviderRegistry } from '@/modules/external-secrets.ee/provider-registry.service';
import { SecretsCacheRefresh } from '@/modules/external-secrets.ee/secrets-cache-refresh.service.ee';
import { ExternalSecretsSecretsCache } from '@/modules/external-secrets.ee/secrets-cache.service';
import { ExternalSecretsSettingsStore } from '@/modules/external-secrets.ee/settings-store.service';

import { DummyProvider, MockProviders } from '../../shared/external-secrets/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

describe('ExternalSecretsModule', () => {
	jest.useFakeTimers();

	let module: ExternalSecretsModule;
	let secretsCacheRefresh: SecretsCacheRefresh;
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

	describe('using settings store', () => {
		let settingsStore: ExternalSecretsSettingsStore;

		beforeAll(async () => {
			Container.set(Logger, mockLogger());
			mockProvidersInstance.setProviders({ dummy: DummyProvider });

			settingsStore = Container.get(ExternalSecretsSettingsStore);
			config = Container.get(ExternalSecretsConfig);

			(config as any).externalSecretsForProjects = false;

			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});
		});

		beforeEach(() => {
			module = Container.get(ExternalSecretsModule);
			secretsCacheRefresh = Container.get(SecretsCacheRefresh);
			providerRegistry = Container.get(ExternalSecretsProviderRegistry);
			secretsCache = Container.get(ExternalSecretsSecretsCache);

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
		});
	});

	describe('using provider connections entities', () => {
		let connectionRepository: SecretsProviderConnectionRepository;
		let cipher: Cipher;

		beforeAll(async () => {
			Container.set(Logger, mockLogger());
			mockProvidersInstance.setProviders({ dummy: DummyProvider });

			connectionRepository = Container.get(SecretsProviderConnectionRepository);
			cipher = Container.get(Cipher);
			config = Container.get(ExternalSecretsConfig);

			(config as any).externalSecretsForProjects = true;

			const encryptedSettings = cipher.encrypt(JSON.stringify({}));
			await connectionRepository.save({
				providerKey: 'my-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});
		});

		beforeEach(() => {
			module = Container.get(ExternalSecretsModule);
			secretsCacheRefresh = Container.get(SecretsCacheRefresh);
			providerRegistry = Container.get(ExternalSecretsProviderRegistry);
			secretsCache = Container.get(ExternalSecretsSecretsCache);

			for (const name of providerRegistry.getNames()) {
				providerRegistry.remove(name);
			}
		});

		afterEach(async () => {
			await module.shutdown();
			jest.clearAllTimers();
		});

		describe('init', () => {
			it('should initialize and register providers from database', async () => {
				await module.init();

				expect(secretsCacheRefresh.initialized).toBe(true);
				expect(providerRegistry.has('my-vault')).toBe(true);
				expect(providerRegistry.get('my-vault')?.state).toBe('connected');
			});

			it('should refresh secrets on init', async () => {
				await module.init();

				expect(secretsCache.getSecretNames('my-vault')).toEqual(['test1', 'test2']);
			});

			it('should start secrets refresh interval', async () => {
				await module.init();

				const provider = providerRegistry.get('my-vault') as DummyProvider;
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

				const provider = providerRegistry.get('my-vault') as DummyProvider;
				const updateSpy = jest.spyOn(provider, 'update');

				await module.shutdown();

				jest.advanceTimersByTime(config.updateInterval * 1000 * 2);

				expect(updateSpy).not.toHaveBeenCalled();
			});
		});
	});
});
