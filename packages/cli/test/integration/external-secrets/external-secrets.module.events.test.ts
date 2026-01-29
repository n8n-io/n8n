import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsProviderRegistry } from '@/modules/external-secrets.ee/provider-registry.service';
import { SecretsCacheRefresh } from '@/modules/external-secrets.ee/secrets-cache-refresh.service';
import { ExternalSecretsSecretsCache } from '@/modules/external-secrets.ee/secrets-cache.service';
import { ExternalSecretsSettingsStore } from '@/modules/external-secrets.ee/settings-store.service';

import {
	AnotherDummyProvider,
	DummyProvider,
	FailedProvider,
	MockProviders,
} from '../../shared/external-secrets/utils';

const mockProvidersInstance = new MockProviders();
mockInstance(ExternalSecretsProviders, mockProvidersInstance);

describe('ExternalSecretsModule Events', () => {
	let secretsCacheRefresh: SecretsCacheRefresh;
	let settingsStore: ExternalSecretsSettingsStore;
	let providerRegistry: ExternalSecretsProviderRegistry;
	let secretsCache: ExternalSecretsSecretsCache;
	let connectionRepository: SecretsProviderConnectionRepository;
	let cipher: Cipher;
	let config: ExternalSecretsConfig;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings', 'SecretsProviderConnection']);
		mockProvidersInstance.setProviders({ dummy: DummyProvider });

		Container.set(Logger, mockLogger());

		secretsCacheRefresh = Container.get(SecretsCacheRefresh);
		settingsStore = Container.get(ExternalSecretsSettingsStore);
		providerRegistry = Container.get(ExternalSecretsProviderRegistry);
		secretsCache = Container.get(ExternalSecretsSecretsCache);
		connectionRepository = Container.get(SecretsProviderConnectionRepository);
		cipher = Container.get(Cipher);
		config = Container.get(ExternalSecretsConfig);

		providerRegistry.clear();

		(config as any).externalSecretsForProjects = false;
	});

	afterEach(() => {
		secretsCacheRefresh?.shutdown();
	});

	describe('reloadProviderConnections (legacy mode)', () => {
		beforeEach(() => {
			(config as any).externalSecretsForProjects = false;
		});

		it('should load providers from settings store', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: { key: 'value' },
				},
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('connected');
		});

		it('should tear down existing provider before reloading', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			const originalProvider = providerRegistry.get('dummy');
			const disconnectSpy = jest.spyOn(originalProvider!, 'disconnect');

			// Trigger reload event
			await (secretsCacheRefresh as any).reloadProviderConnections();

			expect(disconnectSpy).toHaveBeenCalled();
		});

		it('should use provider name as both providerType and providerKey', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// In legacy mode, the provider name is used as both type and key
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.getNames()).toEqual(['dummy']);
		});

		it('should handle multiple providers in settings', async () => {
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

			expect(providerRegistry.getNames()).toHaveLength(2);
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.has('another_dummy')).toBe(true);
		});

		it('should call secretsCache.refreshAll after loading', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Secrets should be populated after init (which calls refreshAll)
			expect(secretsCache.getSecretNames('dummy')).toEqual(['test1', 'test2']);
		});

		it('should handle reload after initial init', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();
			expect(providerRegistry.has('dummy')).toBe(true);

			// Add another provider to settings
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

			// Trigger reload
			await (secretsCacheRefresh as any).reloadProviderConnections();

			expect(providerRegistry.getNames()).toHaveLength(2);
			expect(providerRegistry.has('another_dummy')).toBe(true);
		});
	});

	describe('reloadProviderConnections (project mode)', () => {
		beforeEach(() => {
			(config as any).externalSecretsForProjects = true;
		});

		it('should load providers from database connections', async () => {
			const encryptedSettings = cipher.encrypt(JSON.stringify({ region: 'us-east-1' }));

			await connectionRepository.save({
				providerKey: 'my-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.has('my-vault')).toBe(true);
			expect(providerRegistry.get('my-vault')?.state).toBe('connected');
		});

		it('should use providerKey as registry key (not type)', async () => {
			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			// Create two connections of same type with different keys
			await connectionRepository.save({
				providerKey: 'vault-1',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});
			await connectionRepository.save({
				providerKey: 'vault-2',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.has('vault-1')).toBe(true);
			expect(providerRegistry.has('vault-2')).toBe(true);
			expect(providerRegistry.getNames()).toContain('vault-1');
			expect(providerRegistry.getNames()).toContain('vault-2');
		});

		it('should map isEnabled to connected state', async () => {
			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			await connectionRepository.save({
				providerKey: 'disabled-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: false,
			});

			await secretsCacheRefresh.init();

			const provider = providerRegistry.get('disabled-vault');
			expect(provider?.state).toBe('initialized');
		});

		it('should decrypt encryptedSettings from connection', async () => {
			const settings = { region: 'eu-west-1', accessKey: 'test-key' };
			const encryptedSettings = cipher.encrypt(JSON.stringify(settings));

			await connectionRepository.save({
				providerKey: 'my-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.has('my-vault')).toBe(true);
		});

		it('should handle multiple connections', async () => {
			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			await connectionRepository.save({
				providerKey: 'vault-a',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});
			await connectionRepository.save({
				providerKey: 'vault-b',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});
			await connectionRepository.save({
				providerKey: 'vault-c',
				type: 'dummy',
				encryptedSettings,
				isEnabled: false,
			});

			await secretsCacheRefresh.init();

			expect(providerRegistry.getNames()).toHaveLength(3);
			expect(providerRegistry.get('vault-a')?.state).toBe('connected');
			expect(providerRegistry.get('vault-b')?.state).toBe('connected');
			expect(providerRegistry.get('vault-c')?.state).toBe('initialized');
		});

		it('should call secretsCache.refreshAll after loading', async () => {
			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			await connectionRepository.save({
				providerKey: 'my-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			await secretsCacheRefresh.init();

			expect(secretsCache.getSecretNames('my-vault')).toEqual(['test1', 'test2']);
		});
	});

	describe('teardown and reload', () => {
		it('should cancel pending retries on teardown', async () => {
			mockProvidersInstance.setProviders({ dummy: FailedProvider });

			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Provider should be in error state with pending retry
			expect(providerRegistry.get('dummy')?.state).toBe('error');

			// Shutdown should not throw
			expect(() => secretsCacheRefresh.shutdown()).not.toThrow();
		});

		it('should handle reload with provider teardown', async () => {
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			const originalProvider = providerRegistry.get('dummy');
			expect(originalProvider?.state).toBe('connected');

			// Trigger reload
			await (secretsCacheRefresh as any).reloadProviderConnections();

			// New provider instance should be created
			const newProvider = providerRegistry.get('dummy');
			expect(newProvider).not.toBe(originalProvider);
			expect(newProvider?.state).toBe('connected');
		});
	});

	describe('mode switching', () => {
		it('should use repository when externalSecretsForProjects is true', async () => {
			(config as any).externalSecretsForProjects = true;

			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			await connectionRepository.save({
				providerKey: 'project-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			// Also save to settings store (should be ignored in project mode)
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Should only have the project-based provider
			expect(providerRegistry.has('project-vault')).toBe(true);
			expect(providerRegistry.has('dummy')).toBe(false);
		});

		it('should use settingsStore when externalSecretsForProjects is false', async () => {
			(config as any).externalSecretsForProjects = false;

			const encryptedSettings = cipher.encrypt(JSON.stringify({}));

			await connectionRepository.save({
				providerKey: 'project-vault',
				type: 'dummy',
				encryptedSettings,
				isEnabled: true,
			});

			// Also save to settings store
			await settingsStore.save({
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			});

			await secretsCacheRefresh.init();

			// Should only have the legacy provider
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.has('project-vault')).toBe(false);
		});
	});
});
