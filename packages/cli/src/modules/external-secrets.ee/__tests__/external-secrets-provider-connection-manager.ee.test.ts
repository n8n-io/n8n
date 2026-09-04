import type { Logger } from '@n8n/backend-common';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DummyProvider } from '@test/external-secrets/utils';

import { ExternalSecretsProviderConnectionManager } from '../external-secrets-provider-connection-manager.ee';
import type { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';
import type { ExternalSecretsProviderRegistry } from '../provider-registry.service';
import type { ExternalSecretsRetryManager, RetryOperation } from '../retry-manager.service';
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
	let pendingRetries: Map<string, RetryOperation>;

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

	// toHaveBeenCalledWith compares structurally, so two providers in the same state deep-equal
	// each other. These assertions are about identity.
	const disconnectedProviders = () =>
		mockProviderLifecycle.disconnect.mock.calls.map(([provider]) => provider);

	const runPendingRetry = async (providerKey = 'my-vault') => {
		const operation = pendingRetries.get(providerKey);
		if (!operation) throw new Error(`No pending retry for ${providerKey}`);

		// The real timer callback drops its entry before awaiting the attempt.
		pendingRetries.delete(providerKey);
		const result = await operation();
		if (!result.success) pendingRetries.set(providerKey, operation);
		return result;
	};

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

		// Mirrors the real manager's per-key semantics: one chain per key, cancelled on entry and
		// re-armed on failure. It deliberately does not route through mockRetryManager.cancelRetry,
		// so the cancelRetry call records stay clean for the assertions that read them.
		pendingRetries = new Map();
		mockRetryManager = mock<ExternalSecretsRetryManager>();
		mockRetryManager.runWithRetry.mockImplementation(async (key, operation) => {
			pendingRetries.delete(key);
			const result = await operation();
			if (!result.success) pendingRetries.set(key, operation);
			return result;
		});
		mockRetryManager.cancelRetry.mockImplementation((key) => pendingRetries.delete(key));
		mockRetryManager.cancelAll.mockImplementation(() => pendingRetries.clear());

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

	it('should keep a connected old provider active while a replacement hydration retries', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		vi.spyOn(replacementProvider, 'update').mockRejectedValue(new Error('Hydration failed'));
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await upsertProvider();

		await vi.waitFor(() => {
			expect(replacementProvider.state).toBe('error');
		});
		expect(providersMap.get('my-vault')).toBe(existingProvider);
		expect(disconnectedProviders()).not.toContain(existingProvider);
		expect(pendingRetries.has('my-vault')).toBe(true);
	});

	it('should heal a published hydration failure when its retry succeeds', async () => {
		const existingProvider = new DummyProvider();
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		vi.spyOn(replacementProvider, 'update').mockRejectedValueOnce(new Error('Hydration failed'));
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});
		mockProviderLifecycle.connect.mockImplementation(async (provider) => {
			provider.setState('connected');
			return { success: true };
		});

		await upsertProvider();

		// No connected predecessor, so the errored candidate takes the slot. It has fetched nothing
		// yet, which is the accepted price of leaving it there while it retries.
		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
		expect(replacementProvider.state).toBe('error');
		expect(providersMap.get('my-vault')?.getSecret('test1')).toBeUndefined();

		await runPendingRetry();

		expect(providersMap.get('my-vault')).toBe(replacementProvider);
		expect(replacementProvider.state).toBe('connected');
		expect(providersMap.get('my-vault')?.getSecret('test1')).toBe('value1');
		expect(disconnectedProviders()).not.toContain(replacementProvider);
	});

	it('should keep the pending retry of a newer replacement when an older one connects late', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		const candidateAUpdate = vi.spyOn(candidateA, 'update');
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });

		const connectionA = createDeferred<{ success: boolean }>();
		mockProviderLifecycle.connect.mockImplementation(async (provider) =>
			provider === candidateA
				? await connectionA.promise
				: { success: false, error: new Error('Connection failed') },
		);

		const upsertA = upsertProvider();
		await flushPromises();
		await upsertProvider();

		const retryOfB = pendingRetries.get('my-vault');
		expect(retryOfB).toBeDefined();

		connectionA.resolve({ success: true });
		await upsertA;

		await vi.waitFor(() => {
			expect(disconnectedProviders()).toContain(candidateA);
		});
		expect(candidateAUpdate).not.toHaveBeenCalled();
		expect(pendingRetries.get('my-vault')).toBe(retryOfB);
		expect(providersMap.get('my-vault')).toBe(existingProvider);
	});

	it('should not schedule a retry when a hydration failure lands after supersession', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		vi.spyOn(candidateA, 'update').mockRejectedValue(new Error('Hydration failed'));
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });

		await upsertProvider();
		await vi.waitFor(() => {
			expect(pendingRetries.has('my-vault')).toBe(true);
		});
		const retryOfA = pendingRetries.get('my-vault')!;

		const connectionB = createDeferred<{ success: boolean }>();
		mockProviderLifecycle.connect.mockReturnValue(connectionB.promise);
		const upsertB = upsertProvider();

		// A late attempt of the superseded candidate must report success, otherwise the retry
		// manager would arm a timer that nothing owns.
		await expect(retryOfA()).resolves.toEqual({ success: true });

		connectionB.resolve({ success: true });
		await upsertB;
	});

	it('should disconnect a candidate waiting on a hydration retry when the connection is removed', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		vi.spyOn(replacementProvider, 'update').mockRejectedValue(new Error('Hydration failed'));
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await upsertProvider();
		await vi.waitFor(() => {
			expect(pendingRetries.has('my-vault')).toBe(true);
		});
		expect(disconnectedProviders()).not.toContain(replacementProvider);

		await manager.removeProviderConnection('my-vault');

		expect(disconnectedProviders()).toContain(replacementProvider);
		expect(providersMap.has('my-vault')).toBe(false);
	});

	it.each([
		{ label: 'with a failed provider instance', withProvider: true },
		{ label: 'without a provider instance', withProvider: false },
	])(
		'should keep a connected old provider active when replacement initialization fails $label',
		async ({ withProvider }) => {
			const existingProvider = new DummyProvider();
			existingProvider.setState('connected');
			providersMap.set('my-vault', existingProvider);

			const failedProvider = withProvider ? new DummyProvider() : undefined;
			mockProviderLifecycle.initialize.mockResolvedValue({
				success: false,
				provider: failedProvider,
				error: new Error('Init failed'),
			});

			await upsertProvider();

			expect(providersMap.get('my-vault')).toBe(existingProvider);
			expect(mockProviderRegistry.remove).not.toHaveBeenCalledWith('my-vault');
			expect(disconnectedProviders()).not.toContain(existingProvider);
			expect(scopedLogger.error).toHaveBeenCalledWith(
				'External secrets provider replacement failed; previous provider stays active',
				expect.objectContaining({
					providerKey: 'my-vault',
					phase: 'initialization',
					error: expect.any(Error),
				}),
			);
			expect(scopedLogger.error).not.toHaveBeenCalledWith(
				'External secrets provider replacement reached terminal failure',
				expect.objectContaining({ phase: 'initialization' }),
			);

			// No provider instance is ever dropped unreferenced.
			if (failedProvider) expect(disconnectedProviders()).toContain(failedProvider);
		},
	);

	it('should not disconnect a superseded candidate that is still connecting', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });

		const connectionA = createDeferred<{ success: boolean }>();
		mockProviderLifecycle.connect.mockImplementation(async (provider) => {
			provider.setState('connecting');
			return provider === candidateA ? await connectionA.promise : { success: true };
		});

		const upsertA = upsertProvider();
		await flushPromises();
		expect(candidateA.state).toBe('connecting');

		await upsertProvider();

		// Candidate A owns its connect() call and must settle itself: disconnecting it mid-connect
		// races the providers that re-create their abort controller inside doConnect().
		expect(disconnectedProviders()).not.toContain(candidateA);

		connectionA.resolve({ success: true });
		await upsertA;

		await vi.waitFor(() => {
			expect(disconnectedProviders()).toContain(candidateA);
		});
	});

	it('should disconnect a superseded candidate that connected but has no retry armed yet', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const candidateA = new DummyProvider();
		const hydration = createDeferred<undefined>();
		vi.spyOn(candidateA, 'update').mockReturnValue(hydration.promise);
		const candidateB = new DummyProvider();
		mockProviderLifecycle.initialize
			.mockResolvedValueOnce({ success: true, provider: candidateA })
			.mockResolvedValueOnce({ success: true, provider: candidateB });
		mockProviderLifecycle.connect.mockImplementation(async (provider) => {
			provider.setState('connected');
			return { success: true };
		});

		await upsertProvider();
		expect(candidateA.state).toBe('connected');
		expect(pendingRetries.has('my-vault')).toBe(false);

		await upsertProvider();

		expect(disconnectedProviders()).toContain(candidateA);
	});

	it('should retire a connected old provider for a replacement that is saved as disconnected', async () => {
		const existingProvider = new DummyProvider();
		existingProvider.setState('connected');
		providersMap.set('my-vault', existingProvider);

		const replacementProvider = new DummyProvider();
		replacementProvider.setState('initialized');
		mockProviderLifecycle.initialize.mockResolvedValue({
			success: true,
			provider: replacementProvider,
		});

		await manager.upsertProviderConnection({
			providerKey: 'my-vault',
			providerType: 'dummy',
			config: { ...providerSettings, connected: false },
		});

		expect(providersMap.get('my-vault')).toBe(replacementProvider);
		expect(replacementProvider.state).toBe('initialized');
		expect(disconnectedProviders()).toContain(existingProvider);
		expect(mockRetryManager.runWithRetry).not.toHaveBeenCalled();
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
		await runPendingRetry();

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
		await runPendingRetry();

		expect(replacementProvider.state).toBe('connected');
		expect(providersMap.has('my-vault')).toBe(false);

		hydration.resolve(undefined);

		await vi.waitFor(() => {
			expect(providersMap.get('my-vault')).toBe(replacementProvider);
		});
	});

	it('should publish a hydration failure and retire an unconnected old provider', async () => {
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
			'External secrets provider replacement hydration attempt failed',
			expect.objectContaining({
				providerKey: 'my-vault',
				phase: 'hydration',
				error: expect.any(Error),
			}),
		);
		expect(scopedLogger.error).not.toHaveBeenCalledWith(
			'External secrets provider replacement reached terminal failure',
			expect.objectContaining({ phase: 'hydration' }),
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
			'External secrets provider replacement candidate discarded',
			expect.objectContaining({
				providerKey: 'my-vault',
				reason: 'hydration',
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
