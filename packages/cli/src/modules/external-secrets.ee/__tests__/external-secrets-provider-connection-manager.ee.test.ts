import { mockLogger } from '@n8n/backend-test-utils';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DummyProvider } from '@test/external-secrets/utils';

import { ExternalSecretsProviderConnectionManager } from '../external-secrets-provider-connection-manager.ee';
import type { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';
import type { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import type { ExternalSecretsRetryManager } from '../retry-manager.service';
import type { SecretsProvider, SecretsProviderSettings } from '../types';

describe('ExternalSecretsProviderConnectionManager', () => {
	let manager: ExternalSecretsProviderConnectionManager;
	let mockProviderRegistry: Mocked<ExternalSecretsProviderRegistry>;
	let mockProviderLifecycle: Mocked<ExternalSecretsProviderLifecycle>;
	let mockRetryManager: Mocked<ExternalSecretsRetryManager>;
	let providersMap: Map<string, SecretsProvider>;

	const providerSettings: SecretsProviderSettings = {
		connected: true,
		connectedAt: null,
		settings: { key: 'value' },
	};

	beforeEach(() => {
		providersMap = new Map();

		mockProviderRegistry = mock<ExternalSecretsProviderRegistry>();
		mockProviderRegistry.get.mockImplementation((name) => providersMap.get(name));
		mockProviderRegistry.has.mockImplementation((name) => providersMap.has(name));
		mockProviderRegistry.set.mockImplementation((name, provider) => {
			providersMap.set(name, provider);
		});
		mockProviderRegistry.remove.mockImplementation((name) => {
			providersMap.delete(name);
		});

		mockProviderLifecycle = mock<ExternalSecretsProviderLifecycle>();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: new DummyProvider(),
		});
		mockProviderLifecycle.connect.mockResolvedValue({ success: true });

		mockRetryManager = mock<ExternalSecretsRetryManager>();
		mockRetryManager.runWithRetry.mockImplementation(async (_key, operation) => {
			return await operation();
		});

		manager = new ExternalSecretsProviderConnectionManager(
			mockLogger(),
			mockProviderRegistry,
			mockProviderLifecycle,
			mockRetryManager,
		);
	});

	it('should add new provider and connect with retry', async () => {
		const provider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({ success: true, provider });

		await manager.upsertProviderConnection('my-vault', 'dummy', providerSettings);

		expect(mockProviderLifecycle.initialize).toHaveBeenCalledWith('dummy', providerSettings);
		expect(mockProviderRegistry.set).toHaveBeenCalledWith('my-vault', provider);
		expect(mockRetryManager.runWithRetry).toHaveBeenCalledWith('my-vault', expect.any(Function));
		expect(mockProviderLifecycle.connect).toHaveBeenCalledWith(provider);
	});

	it('should replace provider without removing the registry key first', async () => {
		const existingProvider = new DummyProvider();
		mockProviderRegistry.set('my-vault', existingProvider);
		mockProviderRegistry.set.mockClear();

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await manager.upsertProviderConnection('my-vault', 'dummy', providerSettings);

		expect(mockProviderRegistry.remove).not.toHaveBeenCalledWith('my-vault');
		expect(mockProviderRegistry.set).toHaveBeenCalledWith('my-vault', replacementProvider);
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
	});

	it('should cancel retry and remove existing provider when replacement initialization fails', async () => {
		const existingProvider = new DummyProvider();
		mockProviderRegistry.set('my-vault', existingProvider);
		mockRetryManager.cancelRetry.mockClear();

		mockProviderLifecycle.initialize.mockResolvedValue({
			success: false,
			error: new Error('Init failed'),
		});

		await manager.upsertProviderConnection('my-vault', 'dummy', providerSettings);

		expect(mockRetryManager.cancelRetry).toHaveBeenCalledWith('my-vault');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockProviderRegistry.remove).toHaveBeenCalledWith('my-vault');
		expect(mockRetryManager.runWithRetry).not.toHaveBeenCalled();
	});

	it('should register failed replacement without cancelling scheduled retry when connection fails', async () => {
		const existingProvider = new DummyProvider();
		mockProviderRegistry.set('my-vault', existingProvider);
		mockProviderRegistry.set.mockClear();
		mockRetryManager.cancelRetry.mockClear();

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		mockProviderLifecycle.connect.mockResolvedValue({
			success: false,
			error: new Error('Connection failed'),
		});

		await manager.upsertProviderConnection('my-vault', 'dummy', providerSettings);

		expect(mockRetryManager.runWithRetry).toHaveBeenCalledWith('my-vault', expect.any(Function));
		expect(mockRetryManager.cancelRetry).not.toHaveBeenCalledWith('my-vault');
		expect(mockProviderRegistry.set).toHaveBeenCalledWith('my-vault', replacementProvider);
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockProviderRegistry.remove).not.toHaveBeenCalledWith('my-vault');
	});

	it('should cancel retry and remove provider', async () => {
		const existingProvider = new DummyProvider();
		mockProviderRegistry.set('my-vault', existingProvider);

		await manager.removeProviderConnection('my-vault');

		expect(mockRetryManager.cancelRetry).toHaveBeenCalledWith('my-vault');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockProviderRegistry.remove).toHaveBeenCalledWith('my-vault');
	});

	it('should disconnect provider without removing it', async () => {
		const existingProvider = new DummyProvider();
		mockProviderRegistry.set('my-vault', existingProvider);

		await manager.disconnectProvider('my-vault');

		expect(mockRetryManager.cancelRetry).toHaveBeenCalledWith('my-vault');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockProviderRegistry.remove).not.toHaveBeenCalledWith('my-vault');
	});
});
