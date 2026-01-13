import { mockLogger } from '@n8n/backend-test-utils';

import {
	DummyProvider,
	ErrorProvider,
	FailedProvider,
	MockProviders,
} from '@test/external-secrets/utils';

import { ExternalSecretsProviderLifecycle } from '../provider-lifecycle.service';

describe('ProviderLifecycle', () => {
	let lifecycle: ExternalSecretsProviderLifecycle;
	let mockProviders: MockProviders;

	const providerSettings = {
		connected: true,
		connectedAt: new Date(),
		settings: {},
	};

	beforeEach(() => {
		mockProviders = new MockProviders();
		mockProviders.setProviders({ dummy: DummyProvider });
		lifecycle = new ExternalSecretsProviderLifecycle(mockLogger(), mockProviders);
	});

	describe('initialize', () => {
		it('should initialize provider successfully', async () => {
			const result = await lifecycle.initialize('dummy', providerSettings);

			expect(result.success).toBe(true);
			expect(result.provider).toBeInstanceOf(DummyProvider);
			expect(result.provider?.state).toBe('initialized');
			expect(result.error).toBeUndefined();
		});

		it('should call provider init with settings', async () => {
			const initSpy = jest.spyOn(DummyProvider.prototype, 'init');

			await lifecycle.initialize('dummy', providerSettings);

			expect(initSpy).toHaveBeenCalledWith(providerSettings);
		});

		it('should return error when provider class not found', async () => {
			const result = await lifecycle.initialize('non-existent', providerSettings);

			expect(result.success).toBe(false);
			expect(result.provider).toBeUndefined();
			expect(result.error).toEqual(new Error('Provider class not found: non-existent'));
		});

		it('should handle init failure gracefully', async () => {
			mockProviders.setProviders({ error: ErrorProvider });

			const result = await lifecycle.initialize('error', providerSettings);

			expect(result.success).toBe(false);
			expect(result.provider).toBeInstanceOf(ErrorProvider);
			expect(result.provider?.state).toBe('error');
			expect(result.error).toBeInstanceOf(Error);
		});

		it('should set provider to error state on init failure', async () => {
			mockProviders.setProviders({ error: ErrorProvider });

			const result = await lifecycle.initialize('error', providerSettings);

			expect(result.provider?.state).toBe('error');
			expect(result.error).toBeInstanceOf(Error);
		});
	});

	describe('connect', () => {
		it('should connect provider successfully', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);

			const result = await lifecycle.connect(provider);

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
			expect(provider.state).toBe('connected');
		});

		it('should set provider state to connecting before connection', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);

			let stateBeforeConnect: string | undefined;
			const originalConnect = provider.connect.bind(provider);
			jest.spyOn(provider, 'connect').mockImplementation(async function (this: DummyProvider) {
				stateBeforeConnect = this.state;
				return originalConnect();
			});

			await lifecycle.connect(provider);

			expect(stateBeforeConnect).toBe('connecting');
		});

		it('should handle connection failure', async () => {
			const provider = new FailedProvider();
			await provider.init(providerSettings);

			const result = await lifecycle.connect(provider);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(provider.state).toBe('error');
		});

		it('should return error if provider enters error state during connection', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);

			// Mock connect to set state to error
			jest.spyOn(provider, 'connect').mockImplementation(async function (this: DummyProvider) {
				this.setState('error', new Error('Connection failed'));
			});

			const result = await lifecycle.connect(provider);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(new Error('Provider entered error state during connection'));
		});
	});

	describe('disconnect', () => {
		it('should disconnect provider successfully', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);
			await provider.connect();

			const disconnectSpy = jest.spyOn(provider, 'disconnect');

			await lifecycle.disconnect(provider);

			expect(disconnectSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle disconnect errors gracefully', async () => {
			const provider = new DummyProvider();
			jest.spyOn(provider, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));

			await expect(lifecycle.disconnect(provider)).resolves.not.toThrow();
		});
	});

	describe('reload', () => {
		it('should disconnect and reinitialize provider', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);
			await provider.connect();

			const disconnectSpy = jest.spyOn(provider, 'disconnect');

			const result = await lifecycle.reload(provider, providerSettings);

			expect(disconnectSpy).toHaveBeenCalledTimes(1);
			expect(result.success).toBe(true);
			expect(result.provider).toBeInstanceOf(DummyProvider);
			expect(result.provider?.state).toBe('initialized');
		});

		it('should return new provider instance', async () => {
			const provider = new DummyProvider();
			await provider.init(providerSettings);

			const result = await lifecycle.reload(provider, providerSettings);

			// The reloaded provider is a new instance
			expect(result.provider).not.toBe(provider);
			expect(result.provider).toBeInstanceOf(DummyProvider);
		});

		it('should handle reload failure', async () => {
			mockProviders.setProviders({ error: ErrorProvider });

			const provider = new ErrorProvider();
			await expect(provider.init(providerSettings)).rejects.toThrow();

			const result = await lifecycle.reload(provider, providerSettings);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
		});
	});

	describe('integration', () => {
		it('should complete full lifecycle: initialize -> connect -> disconnect', async () => {
			// Initialize
			const initResult = await lifecycle.initialize('dummy', providerSettings);
			expect(initResult.success).toBe(true);
			expect(initResult.provider?.state).toBe('initialized');

			// Connect
			const connectResult = await lifecycle.connect(initResult.provider!);
			expect(connectResult.success).toBe(true);
			expect(initResult.provider?.state).toBe('connected');

			// Disconnect
			await lifecycle.disconnect(initResult.provider!);
		});

		it('should handle full lifecycle with errors', async () => {
			mockProviders.setProviders({ failed: FailedProvider });

			// Initialize succeeds
			const initResult = await lifecycle.initialize('failed', providerSettings);
			expect(initResult.success).toBe(true);

			// Connect fails
			const connectResult = await lifecycle.connect(initResult.provider!);
			expect(connectResult.success).toBe(false);
			expect(initResult.provider?.state).toBe('error');

			// Disconnect still works
			await expect(lifecycle.disconnect(initResult.provider!)).resolves.not.toThrow();
		});
	});
});
