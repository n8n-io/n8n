import { mockLogger } from '@n8n/backend-test-utils';
import type { SecretsProviderConnectionRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

import {
	AnotherDummyProvider,
	DummyProvider,
	ErrorProvider,
	FailedProvider,
	MockProviders,
} from '@test/external-secrets/utils';

import type { ExternalSecretsConfig } from '../external-secrets.config';
import { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import { ExternalSecretsRetryManager } from '../retry-manager.service';
import { SecretsCacheRefresh } from '../secrets-cache-refresh.service';
import type { ExternalSecretsSecretsCache } from '../secrets-cache.service';
import type { ExternalSecretsSettingsStore } from '../settings-store.service';

describe('SecretsCacheRefresh', () => {
	jest.useFakeTimers();

	let service: SecretsCacheRefresh;
	let mockProviders: MockProviders;
	let providerRegistry: ExternalSecretsProviderRegistry;
	let providerLifecycle: ExternalSecretsProviderLifecycle;
	let settingsStore: MockProxy<ExternalSecretsSettingsStore>;
	let retryManager: ExternalSecretsRetryManager;
	let secretsCache: MockProxy<ExternalSecretsSecretsCache>;
	let config: MockProxy<ExternalSecretsConfig>;
	let cipher: MockProxy<Cipher>;
	let connectionRepository: MockProxy<SecretsProviderConnectionRepository>;

	const logger = mockLogger();

	beforeEach(() => {
		mockProviders = new MockProviders();
		mockProviders.setProviders({ dummy: DummyProvider });

		providerRegistry = new ExternalSecretsProviderRegistry();
		providerLifecycle = new ExternalSecretsProviderLifecycle(logger, mockProviders);
		retryManager = new ExternalSecretsRetryManager(logger);

		settingsStore = mock<ExternalSecretsSettingsStore>();
		secretsCache = mock<ExternalSecretsSecretsCache>();
		config = mock<ExternalSecretsConfig>();
		cipher = mock<Cipher>();
		connectionRepository = mock<SecretsProviderConnectionRepository>();

		config.updateInterval = 60;
		config.externalSecretsForProjects = false;

		service = new SecretsCacheRefresh(
			logger,
			config,
			cipher,
			providerRegistry,
			providerLifecycle,
			settingsStore,
			retryManager,
			secretsCache,
			connectionRepository,
		);
	});

	afterEach(() => {
		service.shutdown();
		jest.clearAllTimers();
	});

	describe('init', () => {
		it('should prevent double initialization', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();
			await service.init();

			expect(service.initialized).toBe(true);
			expect(settingsStore.reload).toHaveBeenCalledTimes(1);
		});

		it('should handle concurrent init calls safely', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await Promise.all([service.init(), service.init(), service.init()]);

			expect(service.initialized).toBe(true);
			expect(settingsStore.reload).toHaveBeenCalledTimes(1);
		});

		it('should handle empty settings gracefully', async () => {
			settingsStore.reload.mockResolvedValue({});

			await service.init();

			expect(service.initialized).toBe(true);
			expect(providerRegistry.getNames()).toHaveLength(0);
		});

		it('should not connect provider when settings.connected is false', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: false, connectedAt: null, settings: {} },
			});

			await service.init();

			expect(providerRegistry.get('dummy')?.state).toBe('initialized');
		});

		it('should handle multiple providers', async () => {
			mockProviders.setProviders({
				dummy: DummyProvider,
				another_dummy: AnotherDummyProvider,
			});

			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
				another_dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();

			expect(providerRegistry.getNames()).toContain('dummy');
			expect(providerRegistry.getNames()).toContain('another_dummy');
			expect(providerRegistry.get('dummy')?.state).toBe('connected');
			expect(providerRegistry.get('another_dummy')?.state).toBe('connected');
		});

		it('should handle provider initialization failure gracefully', async () => {
			mockProviders.setProviders({
				dummy: DummyProvider,
				error: ErrorProvider,
			});

			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
				error: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();

			// Dummy should still work
			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('connected');

			// Error provider fails but doesn't crash
			expect(service.initialized).toBe(true);
		});

		it('should handle provider connection failure', async () => {
			mockProviders.setProviders({ dummy: FailedProvider });

			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();

			expect(providerRegistry.has('dummy')).toBe(true);
			expect(providerRegistry.get('dummy')?.state).toBe('error');
		});
	});

	describe('shutdown', () => {
		it('should be idempotent', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();

			expect(() => {
				service.shutdown();
				service.shutdown();
				service.shutdown();
			}).not.toThrow();

			expect(service.initialized).toBe(false);
		});

		it('should cancel pending retries', async () => {
			const cancelAllSpy = jest.spyOn(retryManager, 'cancelAll');

			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();
			service.shutdown();

			expect(cancelAllSpy).toHaveBeenCalled();
		});
	});

	describe('refresh interval', () => {
		it('should refresh secrets at configured interval', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();

			jest.advanceTimersByTime(config.updateInterval * 1000);

			expect(secretsCache.refreshAll).toHaveBeenCalled();
		});

		it('should not refresh after shutdown', async () => {
			settingsStore.reload.mockResolvedValue({
				dummy: { connected: true, connectedAt: new Date(), settings: {} },
			});

			await service.init();
			service.shutdown();

			secretsCache.refreshAll.mockClear();
			jest.advanceTimersByTime(config.updateInterval * 1000 * 2);

			expect(secretsCache.refreshAll).not.toHaveBeenCalled();
		});
	});
});
