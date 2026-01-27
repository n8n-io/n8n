import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { DummyProvider, FailedProvider, MockProviders } from '@test/external-secrets/utils';

import { ExternalSecretsManager } from '../external-secrets-manager.ee';
import type { ExternalSecretsConfig } from '../external-secrets.config';
import type { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';
import type { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import type { ExternalSecretsRetryManager } from '../retry-manager.service';
import type { ExternalSecretsSecretsCache } from '../secrets-cache.service';
import type { ExternalSecretsSettingsStore } from '../settings-store.service';
import type { ExternalSecretsSettings } from '../types';

describe('ExternalSecretsManager', () => {
	jest.useFakeTimers();

	let manager: ExternalSecretsManager;
	let mockConfig: ExternalSecretsConfig;
	let mockProvidersFactory: MockProviders;
	let mockEventService: any;
	let mockPublisher: any;
	let mockSettingsStore: jest.Mocked<ExternalSecretsSettingsStore>;
	let mockProviderRegistry: jest.Mocked<ExternalSecretsProviderRegistry>;
	let mockProviderLifecycle: jest.Mocked<ExternalSecretsProviderLifecycle>;
	let mockRetryManager: jest.Mocked<ExternalSecretsRetryManager>;
	let mockSecretsCache: jest.Mocked<ExternalSecretsSecretsCache>;

	const mockSettings: ExternalSecretsSettings = {
		dummy: {
			connected: true,
			connectedAt: new Date('2023-08-01T12:00:00Z'),
			settings: { key: 'value' },
		},
	};

	beforeEach(() => {
		mockConfig = { updateInterval: 60 } as ExternalSecretsConfig;
		mockProvidersFactory = new MockProviders();
		mockProvidersFactory.setProviders({ dummy: DummyProvider });
		mockEventService = { emit: jest.fn() };
		mockPublisher = { publishCommand: jest.fn() };

		// Mock SettingsStore
		mockSettingsStore = mock<ExternalSecretsSettingsStore>();
		mockSettingsStore.reload.mockResolvedValue(mockSettings);
		mockSettingsStore.getProvider.mockResolvedValue(mockSettings.dummy);
		mockSettingsStore.getCached.mockReturnValue(mockSettings);
		mockSettingsStore.updateProvider.mockResolvedValue({
			settings: mockSettings,
			isNewProvider: false,
		});

		// Mock ProviderRegistry with a Map to simulate real behavior
		const providersMap = new Map<string, any>();
		mockProviderRegistry = mock<ExternalSecretsProviderRegistry>();
		mockProviderRegistry.getNames.mockImplementation(() => Array.from(providersMap.keys()));
		mockProviderRegistry.get.mockImplementation((name) => providersMap.get(name));
		mockProviderRegistry.has.mockImplementation((name) => providersMap.has(name));
		mockProviderRegistry.getAll.mockImplementation(() => new Map(providersMap));
		mockProviderRegistry.add.mockImplementation((name, provider) => {
			providersMap.set(name, provider);
		});
		mockProviderRegistry.remove.mockImplementation((name) => {
			providersMap.delete(name);
		});

		// Mock ProviderLifecycle
		mockProviderLifecycle = mock<ExternalSecretsProviderLifecycle>();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: new DummyProvider(),
		});
		mockProviderLifecycle.connect.mockResolvedValue({ success: true });

		// Mock RetryManager
		mockRetryManager = mock<ExternalSecretsRetryManager>();
		mockRetryManager.runWithRetry.mockImplementation(async (_key, operation) => {
			const result = await operation();
			return result;
		});

		// Mock SecretsCache
		mockSecretsCache = mock<ExternalSecretsSecretsCache>();
		mockSecretsCache.getSecret.mockReturnValue(undefined);
		mockSecretsCache.hasSecret.mockReturnValue(false);
		mockSecretsCache.getSecretNames.mockReturnValue([]);
		mockSecretsCache.getAllSecretNames.mockReturnValue({});

		manager = new ExternalSecretsManager(
			mockLogger(),
			mockConfig,
			mockProvidersFactory,
			mockEventService,
			mockPublisher,
			mockSettingsStore,
			mockProviderRegistry,
			mockProviderLifecycle,
			mockRetryManager,
			mockSecretsCache,
		);
	});

	afterEach(() => {
		manager?.shutdown();
		jest.clearAllTimers();
	});

	describe('init', () => {
		it('should initialize and load all providers', async () => {
			await manager.init();

			expect(mockSettingsStore.reload).toHaveBeenCalled();
			expect(manager.initialized).toBe(true);
		});

		it('should start secrets refresh interval', async () => {
			await manager.init();

			// refreshAll is called once during init
			expect(mockSecretsCache.refreshAll).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(60000); // 60 seconds

			// Should be called again after interval
			expect(mockSecretsCache.refreshAll).toHaveBeenCalledTimes(2);
		});

		it('should not initialize twice', async () => {
			await manager.init();
			await manager.init();

			expect(mockSettingsStore.reload).toHaveBeenCalledTimes(1);
		});

		it('should handle initialization errors', async () => {
			mockSettingsStore.reload.mockRejectedValue(new Error('Database error'));

			await expect(manager.init()).rejects.toThrow('Database error');
			expect(manager.initialized).toBe(false);
		});
	});

	describe('shutdown', () => {
		it('should stop refresh interval and disconnect all providers', async () => {
			await manager.init();

			manager.shutdown();

			expect(mockRetryManager.cancelAll).toHaveBeenCalled();
			expect(mockProviderRegistry.disconnectAll).toHaveBeenCalled();
			expect(manager.initialized).toBe(false);
		});

		it('should stop calling refresh after shutdown', async () => {
			await manager.init();

			// refreshAll called once during init
			const callsAfterInit = mockSecretsCache.refreshAll.mock.calls.length;

			jest.advanceTimersByTime(60000);
			expect(mockSecretsCache.refreshAll).toHaveBeenCalledTimes(callsAfterInit + 1);

			manager.shutdown();

			jest.advanceTimersByTime(60000);
			expect(mockSecretsCache.refreshAll).toHaveBeenCalledTimes(callsAfterInit + 1); // No additional calls
		});
	});

	describe('getProvider', () => {
		it('should delegate to provider registry', () => {
			const dummyProvider = new DummyProvider();
			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			const result = manager.getProvider('dummy');

			expect(result).toBe(dummyProvider);
			expect(mockProviderRegistry.get).toHaveBeenCalledWith('dummy');
		});
	});

	describe('hasProvider', () => {
		it('should delegate to provider registry', () => {
			mockProviderRegistry.has.mockReturnValue(true);

			const result = manager.hasProvider('dummy');

			expect(result).toBe(true);
			expect(mockProviderRegistry.has).toHaveBeenCalledWith('dummy');
		});
	});

	describe('getProviderNames', () => {
		it('should delegate to provider registry', () => {
			mockProviderRegistry.getNames.mockReturnValue(['dummy', 'another']);

			const result = manager.getProviderNames();

			expect(result).toEqual(['dummy', 'another']);
			expect(mockProviderRegistry.getNames).toHaveBeenCalled();
		});
	});

	describe('getProvidersWithSettings', () => {
		it('should return all providers with their settings', () => {
			const dummyProvider = new DummyProvider();
			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			const result = manager.getProvidersWithSettings();

			expect(result).toEqual([
				{
					provider: dummyProvider,
					settings: mockSettings.dummy,
				},
			]);
		});

		it('should create new provider instance if not in registry', () => {
			mockProviderRegistry.get.mockReturnValue(undefined);

			const result = manager.getProvidersWithSettings();

			expect(result).toHaveLength(1);
			expect(result[0].provider).toBeInstanceOf(DummyProvider);
		});
	});

	describe('getProviderWithSettings', () => {
		it('should return provider with settings', () => {
			const dummyProvider = new DummyProvider();
			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			const result = manager.getProviderWithSettings('dummy');

			expect(result).toEqual({
				provider: dummyProvider,
				settings: mockSettings.dummy,
			});
		});
	});

	describe('updateProvider', () => {
		it('should update connected provider', async () => {
			const dummyProvider = new DummyProvider();
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });
			await dummyProvider.connect();
			jest.spyOn(dummyProvider, 'update');

			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			await manager.updateProvider('dummy');

			expect(dummyProvider.update).toHaveBeenCalled();
			expect(mockPublisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-external-secrets-providers',
			});
		});

		it('should throw error if provider not found', async () => {
			mockProviderRegistry.get.mockReturnValue(undefined);

			await expect(manager.updateProvider('nonexistent')).rejects.toThrow(
				'Provider "nonexistent" not found',
			);
		});

		it('should throw error if provider not connected', async () => {
			const dummyProvider = new DummyProvider();
			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			await expect(manager.updateProvider('dummy')).rejects.toThrow(
				'Provider "dummy" is not connected',
			);
		});
	});

	describe('getSecret', () => {
		it('should delegate to secrets cache', () => {
			mockSecretsCache.getSecret.mockReturnValue('secret-value');

			const result = manager.getSecret('dummy', 'test-secret');

			expect(result).toBe('secret-value');
			expect(mockSecretsCache.getSecret).toHaveBeenCalledWith('dummy', 'test-secret');
		});
	});

	describe('hasSecret', () => {
		it('should delegate to secrets cache', () => {
			mockSecretsCache.hasSecret.mockReturnValue(true);

			const result = manager.hasSecret('dummy', 'test-secret');

			expect(result).toBe(true);
			expect(mockSecretsCache.hasSecret).toHaveBeenCalledWith('dummy', 'test-secret');
		});
	});

	describe('getSecretNames', () => {
		it('should delegate to secrets cache', () => {
			mockSecretsCache.getSecretNames.mockReturnValue(['secret1', 'secret2']);

			const result = manager.getSecretNames('dummy');

			expect(result).toEqual(['secret1', 'secret2']);
			expect(mockSecretsCache.getSecretNames).toHaveBeenCalledWith('dummy');
		});
	});

	describe('getAllSecretNames', () => {
		it('should delegate to secrets cache', () => {
			mockSecretsCache.getAllSecretNames.mockReturnValue({
				dummy: ['secret1', 'secret2'],
			});

			const result = manager.getAllSecretNames();

			expect(result).toEqual({ dummy: ['secret1', 'secret2'] });
			expect(mockSecretsCache.getAllSecretNames).toHaveBeenCalled();
		});
	});

	describe('setProviderSettings', () => {
		it('should update settings and reload provider', async () => {
			const dummyProvider = new DummyProvider();
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });

			mockProviderRegistry.get.mockReturnValue(dummyProvider);
			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});

			await manager.setProviderSettings('dummy', { key: 'new-value' });

			expect(mockSettingsStore.updateProvider).toHaveBeenCalledWith('dummy', {
				settings: { key: 'new-value' },
			});
			expect(mockPublisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-external-secrets-providers',
			});
		});

		it('should track provider save event', async () => {
			const dummyProvider = new DummyProvider();
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });
			jest.spyOn(dummyProvider, 'test').mockResolvedValue([true]);

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});

			await manager.setProviderSettings('dummy', { key: 'value' }, 'user-123');

			// The registry.add happens during reloadProvider, so provider should be available
			// Wait for async tracking to complete by flushing all pending promises
			await Promise.resolve();
			await Promise.resolve();

			expect(mockEventService.emit).toHaveBeenCalledWith(
				'external-secrets-provider-settings-saved',
				expect.objectContaining({
					userId: 'user-123',
					vaultType: 'dummy',
					isValid: true,
				}),
			);
		});
	});

	describe('setProviderConnected', () => {
		it('should connect provider when set to connected', async () => {
			const dummyProvider = new DummyProvider();
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });

			mockProviderRegistry.get.mockReturnValue(dummyProvider);
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });

			await manager.setProviderConnected('dummy', true);

			expect(mockSettingsStore.updateProvider).toHaveBeenCalledWith('dummy', { connected: true });
			expect(mockRetryManager.runWithRetry).toHaveBeenCalled();
			expect(mockPublisher.publishCommand).toHaveBeenCalled();
		});

		it('should disconnect provider when set to disconnected', async () => {
			const dummyProvider = new DummyProvider();
			mockProviderRegistry.get.mockReturnValue(dummyProvider);

			await manager.setProviderConnected('dummy', false);

			expect(mockSettingsStore.updateProvider).toHaveBeenCalledWith('dummy', {
				connected: false,
			});
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(dummyProvider);
			expect(mockPublisher.publishCommand).toHaveBeenCalled();
		});
	});

	describe('testProviderSettings', () => {
		it('should connect provider before testing', async () => {
			const dummyProvider = new DummyProvider();
			jest.spyOn(dummyProvider, 'test').mockResolvedValue([true]);

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });
			mockSettingsStore.getProvider.mockResolvedValue({
				connected: true,
				connectedAt: new Date(),
				settings: {},
			});

			await manager.testProviderSettings('dummy', { key: 'value' });

			// Verify connect is called with the provider before test
			expect(mockProviderLifecycle.connect).toHaveBeenCalledWith(dummyProvider);
		});

		it('should test provider with settings', async () => {
			const dummyProvider = new DummyProvider();
			jest.spyOn(dummyProvider, 'test').mockResolvedValue([true]);

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });
			mockSettingsStore.getProvider.mockResolvedValue({
				connected: true,
				connectedAt: new Date(),
				settings: {},
			});

			const result = await manager.testProviderSettings('dummy', { key: 'value' });

			expect(result).toEqual({
				success: true,
				testState: 'connected',
				error: undefined,
			});
		});

		it('should return tested state for non-connected provider', async () => {
			const dummyProvider = new DummyProvider();
			jest.spyOn(dummyProvider, 'test').mockResolvedValue([true]);

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });
			mockSettingsStore.getProvider.mockResolvedValue({
				connected: false,
				connectedAt: new Date(),
				settings: {},
			});

			const result = await manager.testProviderSettings('dummy', { key: 'value' });

			expect(result).toEqual({
				success: true,
				testState: 'tested',
				error: undefined,
			});
		});

		it('should return error state on initialization failure', async () => {
			mockProviderLifecycle.initialize.mockResolvedValue({
				success: false,
				error: new Error('Init failed'),
			});

			const result = await manager.testProviderSettings('dummy', { key: 'value' });

			expect(result).toEqual({
				success: false,
				testState: 'error',
			});
		});

		it('should return error state on connection failure', async () => {
			const dummyProvider = new DummyProvider();

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({
				success: false,
				error: new Error('Authentication failed'),
			});

			const result = await manager.testProviderSettings('dummy', { key: 'value' });

			expect(result).toEqual({
				success: false,
				testState: 'error',
				error: 'Authentication failed',
			});
		});

		it('should return error state on test failure', async () => {
			const dummyProvider = new DummyProvider();
			jest.spyOn(dummyProvider, 'test').mockResolvedValue([false, 'Test failed']);

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });

			const result = await manager.testProviderSettings('dummy', { key: 'value' });

			expect(result).toEqual({
				success: false,
				testState: 'error',
				error: 'Test failed',
			});
		});

		it('should disconnect provider after test', async () => {
			const dummyProvider = new DummyProvider();
			const disconnectSpy = jest.spyOn(dummyProvider, 'disconnect');

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({ success: true });

			await manager.testProviderSettings('dummy', { key: 'value' });

			expect(disconnectSpy).toHaveBeenCalled();
		});

		it('should disconnect provider even after connection failure', async () => {
			const dummyProvider = new DummyProvider();
			const disconnectSpy = jest.spyOn(dummyProvider, 'disconnect');

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({
				success: false,
				error: new Error('Connection failed'),
			});

			await manager.testProviderSettings('dummy', { key: 'value' });

			expect(disconnectSpy).toHaveBeenCalled();
		});
	});

	describe('reloadAllProviders', () => {
		it('should reload settings and refresh secrets', async () => {
			await manager.reloadAllProviders();

			expect(mockSettingsStore.reload).toHaveBeenCalled();
			expect(mockSecretsCache.refreshAll).toHaveBeenCalled();
		});

		it('should initialize new providers from settings', async () => {
			const dummyProvider = new DummyProvider();
			await dummyProvider.init({ connected: true, connectedAt: new Date(), settings: {} });

			const newSettings = {
				dummy: {
					connected: true,
					connectedAt: new Date(),
					settings: {},
				},
			};

			mockSettingsStore.reload.mockResolvedValue(newSettings);
			mockSettingsStore.getProvider.mockResolvedValue(newSettings.dummy);
			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: dummyProvider,
			});

			await manager.reloadAllProviders();

			expect(mockProviderLifecycle.initialize).toHaveBeenCalledWith('dummy', {
				connected: true,
				connectedAt: expect.any(Date),
				settings: {},
			});
		});
	});

	describe('updateSecrets', () => {
		it('should delegate to secrets cache', async () => {
			await manager.updateSecrets();

			expect(mockSecretsCache.refreshAll).toHaveBeenCalled();
		});
	});

	describe('integration scenarios', () => {
		it('should handle provider connection retry on failure', async () => {
			const failedProvider = new FailedProvider();
			await failedProvider.init({ connected: true, connectedAt: new Date(), settings: {} });

			mockProviderLifecycle.initialize.mockResolvedValue({
				success: true,
				provider: failedProvider,
			});
			mockProviderLifecycle.connect.mockResolvedValue({
				success: false,
				error: new Error('Connection failed'),
			});

			// Add the provider to the registry so it can be found during connection
			mockProviderRegistry.add('dummy', failedProvider);

			let retryOperation: any;
			mockRetryManager.runWithRetry.mockImplementation(async (_key, operation) => {
				retryOperation = operation;
				const result = await operation();
				return result;
			});

			await manager.setProviderConnected('dummy', true);

			expect(retryOperation).toBeDefined();
		});

		it('should handle full lifecycle: init -> update -> shutdown', async () => {
			await manager.init();

			expect(manager.initialized).toBe(true);

			await manager.updateSecrets();

			expect(mockSecretsCache.refreshAll).toHaveBeenCalled();

			manager.shutdown();

			expect(manager.initialized).toBe(false);
		});
	});
});
