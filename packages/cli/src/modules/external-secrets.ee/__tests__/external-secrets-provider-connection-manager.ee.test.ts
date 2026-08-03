import type { Logger } from '@n8n/backend-common';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DummyProvider } from '@test/external-secrets/utils';

import { ExternalSecretsProviderConnectionManager } from '../external-secrets-provider-connection-manager.ee';
import type { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';
import type { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import type { ExternalSecretsRetryManager } from '../retry-manager.service';
import type { ExternalSecretsSecretsCache } from '../secrets-cache.service';
import type { SecretsProvider, SecretsProviderSettings } from '../types';

const createDeferred = <T>() => {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
};

const flushPromises = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

describe('ExternalSecretsProviderConnectionManager', () => {
	let manager: ExternalSecretsProviderConnectionManager;
	let mockProviderRegistry: Mocked<ExternalSecretsProviderRegistry>;
	let mockProviderLifecycle: Mocked<ExternalSecretsProviderLifecycle>;
	let mockRetryManager: Mocked<ExternalSecretsRetryManager>;
	let mockSecretsCache: Mocked<ExternalSecretsSecretsCache>;
	let providersMap: Map<string, SecretsProvider>;
	let scopedLogger: Mocked<Logger>;

	const providerSettings: SecretsProviderSettings = {
		connected: true,
		connectedAt: null,
		settings: { key: 'value' },
	};

	const upsertProvider = async (providerKey = 'my-vault', providerType = 'dummy') =>
		await manager.upsertProviderConnection({
			providerKey,
			providerType,
			config: providerSettings,
		});

	beforeEach(() => {
		vi.useFakeTimers();
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

		mockSecretsCache = mock<ExternalSecretsSecretsCache>();

		scopedLogger = mock<Logger>();
		const logger = mock<Logger>({
			scoped: vi.fn().mockReturnValue(scopedLogger),
		});
		manager = new ExternalSecretsProviderConnectionManager(
			logger,
			mockProviderRegistry,
			mockProviderLifecycle,
			mockRetryManager,
			mockSecretsCache,
		);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should refresh a new provider before completing its initial upsert', async () => {
		const provider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({ success: true, provider });

		await upsertProvider();

		expect(mockProviderRegistry.set).toHaveBeenCalledWith('my-vault', provider);
		expect(mockProviderLifecycle.connect).toHaveBeenCalledWith(provider);
		expect(mockSecretsCache.refreshProvider).toHaveBeenCalledWith('my-vault', provider);
	});

	it('should prepare batch upserts in order and await their completions concurrently', async () => {
		const firstProvider = new DummyProvider();
		const secondProvider = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: firstProvider })
			.mockResolvedValueOnce({ success: true, provider: secondProvider });

		const firstRefresh = createDeferred<undefined>();
		const secondRefresh = createDeferred<undefined>();
		mockSecretsCache.refreshProvider
			.mockReturnValueOnce(firstRefresh.promise)
			.mockReturnValueOnce(secondRefresh.promise);

		const batchPromise = manager.upsertProviderConnections([
			{
				providerKey: 'first-vault',
				providerType: 'first',
				config: providerSettings,
			},
			{
				providerKey: 'second-vault',
				providerType: 'second',
				config: providerSettings,
			},
		]);

		await vi.waitFor(() => {
			expect(mockSecretsCache.refreshProvider).toHaveBeenCalledTimes(2);
		});
		expect(
			mockProviderLifecycle.initialize.mock.calls.map(([providerType]) => providerType),
		).toEqual(['first', 'second']);

		firstRefresh.resolve(undefined);
		await flushPromises();

		let completed = false;
		void batchPromise.then(() => {
			completed = true;
		});
		await flushPromises();
		expect(completed).toBe(false);

		secondRefresh.resolve(undefined);
		await batchPromise;
	});

	it('should keep the old provider active while replacement initialization is pending', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const initialization = createDeferred<{
			success: boolean;
			provider: SecretsProvider;
		}>();
		mockProviderLifecycle.initialize.mockReturnValue(initialization.promise);

		const upsertPromise = upsertProvider();

		expect(providersMap.get('my-vault')).toBe(existingProvider);

		initialization.resolve({ success: true, provider: replacementProvider });
		await upsertPromise;

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
	});

	it('should keep the old provider active while replacement connection is pending', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		const connection = createDeferred<{ success: boolean }>();
		mockProviderLifecycle.connect.mockReturnValue(connection.promise);

		const upsertPromise = upsertProvider();
		await flushPromises();

		expect(providersMap.get('my-vault')).toBe(existingProvider);

		connection.resolve({ success: true });
		await upsertPromise;

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
	});

	it('should resolve the upsert while hydration is pending and activate on completion', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		const updateSpy = vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		// The upsert resolves while hydration is still pending: the old provider stays active.
		await upsertProvider();

		expect(providersMap.get('my-vault')).toBe(existingProvider);
		expect(updateSpy).toHaveBeenCalledTimes(1);
		expect(mockProviderLifecycle.disconnect).not.toHaveBeenCalledWith(existingProvider);

		hydration.resolve(undefined);

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(updateSpy).toHaveBeenCalledTimes(1);
	});

	it('should expose the newest provider in an error state when initialization fails', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const failedProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: false,
			provider: failedProvider,
			error: new Error('Init failed'),
		});

		await upsertProvider();

		expect(providersMap.get('my-vault')).toBe(failedProvider);
		expect(failedProvider.state).toBe('error');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockRetryManager.runWithRetry).not.toHaveBeenCalled();
	});

	it('should remove the old provider when initialization fails without an error instance', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: false,
			error: new Error('Init failed'),
		});

		await upsertProvider();

		expect(providersMap.has('my-vault')).toBe(false);
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
	});

	it('should retire an unconnected old provider and publish a failed connection for retry', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		mockProviderLifecycle.connect.mockResolvedValue({
			success: false,
			error: new Error('Connection failed'),
		});

		await upsertProvider();

		expect(providersMap.get('my-vault')).toBe(replacementProvider);
		expect(replacementProvider.state).toBe('error');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(scopedLogger.error).toHaveBeenCalledWith(
			'External secrets provider replacement connection attempt failed',
			expect.objectContaining({
				providerKey: 'my-vault',
				phase: 'connection',
				error: expect.any(Error),
			}),
		);
		expect(scopedLogger.error).not.toHaveBeenCalledWith(
			'External secrets provider replacement reached terminal failure',
			expect.objectContaining({ phase: 'connection' }),
		);
	});

	it('should keep a connected old provider active while a replacement connection retries', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		mockProviderLifecycle.connect.mockResolvedValue({
			success: false,
			error: new Error('Connection failed'),
		});

		await upsertProvider();

		expect(providersMap.get('my-vault')).toBe(existingProvider);
		expect(replacementProvider.state).toBe('error');
		expect(mockProviderLifecycle.disconnect).not.toHaveBeenCalledWith(existingProvider);
		expect(scopedLogger.error).toHaveBeenCalledWith(
			'External secrets provider replacement connection attempt failed',
			expect.objectContaining({
				providerKey: 'my-vault',
				phase: 'connection',
				error: expect.any(Error),
			}),
		);
	});

	it('should activate a retried replacement over a preserved connected old provider', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		let retryOperation!: () => Promise<{ success: boolean; error?: Error }>;
		mockRetryManager.runWithRetry.mockImplementation(async (_key, operation) => {
			retryOperation = operation;
			return await operation();
		});
		mockProviderLifecycle.connect.mockResolvedValueOnce({
			success: false,
			error: new Error('Connection failed'),
		});

		await upsertProvider();
		expect(providersMap.get('my-vault')).toBe(existingProvider);

		mockProviderLifecycle.connect.mockImplementationOnce(async (provider) => {
			provider.setState('connected');
			return { success: true };
		});
		await retryOperation();

		// The old provider keeps serving secrets while the retried candidate hydrates.
		expect(providersMap.get('my-vault')).toBe(existingProvider);

		hydration.resolve(undefined);

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
	});

	it('should keep a connection retry off-registry until its hydration succeeds', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		let retryOperation!: () => Promise<{ success: boolean; error?: Error }>;
		mockRetryManager.runWithRetry.mockImplementation(async (_key, operation) => {
			retryOperation = operation;
			return await operation();
		});
		mockProviderLifecycle.connect.mockResolvedValueOnce({
			success: false,
			error: new Error('Connection failed'),
		});

		await upsertProvider();
		expect(providersMap.get('my-vault')).toBe(replacementProvider);

		mockProviderLifecycle.connect.mockImplementationOnce(async (provider) => {
			provider.setState('connected');
			return { success: true };
		});
		await retryOperation();

		expect(replacementProvider.state).toBe('connected');
		expect(providersMap.has('my-vault')).toBe(false);

		hydration.resolve(undefined);

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
	});

	it('should publish a hydration failure and retire the old provider', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		vi.spyOn(replacementProvider, 'update').mockRejectedValue(new Error('Hydration failed'));
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await upsertProvider();

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
		expect(replacementProvider.state).toBe('error');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(scopedLogger.error).toHaveBeenCalledWith(
			'External secrets provider replacement reached terminal failure',
			expect.objectContaining({
				providerKey: 'my-vault',
				phase: 'hydration',
				error: expect.any(Error),
			}),
		);
	});

	it('should ignore and dispose a superseded candidate that succeeds late', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		const candidateAHydration = createDeferred<undefined>();
		const candidateAUpdate = vi
			.spyOn(candidateA, 'update')
			.mockReturnValue(candidateAHydration.promise);
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });

		const upsertA = upsertProvider();
		await vi.waitFor(() => {
			expect(candidateAUpdate).toHaveBeenCalled();
		});
		const upsertB = upsertProvider();
		await upsertB;

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(candidateB);
		});

		candidateAHydration.resolve(undefined);
		await upsertA;

		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(candidateA);
		});
		expect(providersMap.get('my-vault')).toBe(candidateB);
		expect(scopedLogger.debug).toHaveBeenCalledWith(
			'External secrets provider superseded replacement discarded',
			expect.objectContaining({
				providerKey: 'my-vault',
				phase: 'hydration',
				disposed: true,
			}),
		);
	});

	it('should ignore and dispose a superseded candidate that fails late', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		const candidateAHydration = createDeferred<undefined>();
		const candidateAUpdate = vi
			.spyOn(candidateA, 'update')
			.mockReturnValue(candidateAHydration.promise);
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });

		const upsertA = upsertProvider();
		await vi.waitFor(() => {
			expect(candidateAUpdate).toHaveBeenCalled();
		});
		const upsertB = upsertProvider();
		await upsertB;

		candidateAHydration.reject(new Error('Hydration failed'));
		await upsertA;

		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(candidateA);
		});
		expect(providersMap.get('my-vault')).toBe(candidateB);
		expect(candidateB.state).not.toBe('error');
	});

	it('should remove access immediately and prevent pending hydration from restoring it', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		const updateSpy = vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		const upsertPromise = upsertProvider();
		await vi.waitFor(() => {
			expect(updateSpy).toHaveBeenCalled();
		});
		await manager.removeProviderConnection('my-vault');

		expect(providersMap.has('my-vault')).toBe(false);

		hydration.resolve(undefined);
		await upsertPromise;

		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(replacementProvider);
		});
		expect(providersMap.has('my-vault')).toBe(false);
	});

	it('should invalidate pending hydration when disconnecting the active provider', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		const updateSpy = vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		const upsertPromise = upsertProvider();
		await vi.waitFor(() => {
			expect(updateSpy).toHaveBeenCalled();
		});
		await manager.disconnectProvider('my-vault');

		hydration.resolve(undefined);
		await upsertPromise;

		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(replacementProvider);
		});
		expect(providersMap.has('my-vault')).toBe(false);
	});

	it('should prevent activation after shutdown during initialization', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const initialization = createDeferred<{
			success: boolean;
			provider: SecretsProvider;
		}>();
		mockProviderLifecycle.initialize.mockReturnValue(initialization.promise);

		const upsertPromise = upsertProvider();
		manager.shutdown();
		initialization.resolve({ success: true, provider: replacementProvider });

		await upsertPromise;
		expect(providersMap.get('my-vault')).toBe(existingProvider);
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(replacementProvider);
	});

	it('should prevent activation after shutdown during connection', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		const connection = createDeferred<{ success: boolean }>();
		mockProviderLifecycle.connect.mockReturnValue(connection.promise);

		const upsertPromise = upsertProvider();
		await flushPromises();
		manager.shutdown();
		connection.resolve({ success: true });

		await upsertPromise;
		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(replacementProvider);
		});
		expect(providersMap.get('my-vault')).toBe(existingProvider);
	});

	it('should prevent late activation after shutdown during hydration', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		const hydration = createDeferred<undefined>();
		const updateSpy = vi.spyOn(replacementProvider, 'update').mockReturnValue(hydration.promise);
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		const upsertPromise = upsertProvider();
		await vi.waitFor(() => {
			expect(updateSpy).toHaveBeenCalled();
		});
		manager.shutdown();
		hydration.resolve(undefined);
		await upsertPromise;

		await vi.waitFor(() => {
			expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(replacementProvider);
		});
		expect(providersMap.get('my-vault')).toBe(existingProvider);
	});

	it('should log replacement lifecycle transitions', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await upsertProvider();

		expect(scopedLogger.debug).toHaveBeenCalledWith(
			'External secrets provider replacement started',
			expect.objectContaining({
				providerKey: 'my-vault',
				providerType: 'dummy',
				phase: 'initialization',
			}),
		);
		await vi.waitFor(() => {
			expect(scopedLogger.debug).toHaveBeenCalledWith(
				'External secrets provider replacement activated',
				expect.objectContaining({
					providerKey: 'my-vault',
					providerType: 'dummy',
					phase: 'hydration',
				}),
			);
		});
	});

	it('should cancel retries and disconnect providers on shutdown', () => {
		manager.shutdown();

		expect(mockRetryManager.cancelAll).toHaveBeenCalled();
		expect(mockProviderRegistry.disconnectAll).toHaveBeenCalled();
	});

	it('should remove access before disconnecting a provider', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		await manager.disconnectProvider('my-vault');

		expect(mockRetryManager.cancelRetry).toHaveBeenCalledWith('my-vault');
		expect(mockProviderLifecycle.disconnect).toHaveBeenCalledWith(existingProvider);
		expect(mockProviderRegistry.remove).toHaveBeenCalledWith('my-vault');
		expect(providersMap.has('my-vault')).toBe(false);
	});
});
