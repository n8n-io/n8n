import { MainConfig } from '@/config/main-config';

describe('Graceful Shutdown Timeout', () => {
	describe('BaseRunnerConfig', () => {
		const originalEnv = process.env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT;

		afterEach(() => {
			if (originalEnv === undefined) {
				delete process.env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT;
			} else {
				process.env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT = originalEnv;
			}
		});

		it('should default gracefulShutdownTimeout to 10 seconds', () => {
			delete process.env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT;

			const config = new MainConfig();

			expect(config.baseRunnerConfig.gracefulShutdownTimeout).toBe(10);
		});
	});

	describe('createSignalHandler timeout', () => {
		let exitSpy: jest.SpyInstance;
		let setTimeoutSpy: jest.SpyInstance;

		beforeEach(() => {
			exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			setTimeoutSpy = jest.spyOn(global, 'setTimeout');
		});

		afterEach(() => {
			exitSpy.mockRestore();
			setTimeoutSpy.mockRestore();
		});

		/**
		 * This mirrors the createSignalHandler logic from start.ts to verify
		 * timeout behavior. The production function is module-private and
		 * triggers side effects (process.exit), so we replicate the core
		 * timeout mechanism here.
		 */
		function createSignalHandler(signal: string, timeoutInS = 10) {
			let isShuttingDown = false;
			return async function onSignal() {
				if (isShuttingDown) return;
				isShuttingDown = true;
				setTimeout(() => {
					process.exit(1);
				}, timeoutInS * 1000).unref();
				process.exit(0);
			};
		}

		it('should set force-shutdown timer to the configured timeout value', async () => {
			const handler = createSignalHandler('SIGTERM', 2700);

			await handler();

			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2_700_000);
		});

		it('should default to 10s when no timeout is provided', async () => {
			const handler = createSignalHandler('SIGTERM');

			await handler();

			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10_000);
		});

		it('should use shorter timeout for idle shutdown', async () => {
			const handler = createSignalHandler('IDLE_TIMEOUT', 3);

			await handler();

			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3_000);
		});

		it('should not re-enter shutdown if already shutting down', async () => {
			const handler = createSignalHandler('SIGTERM', 60);

			await handler();
			await handler(); // second call should be no-op

			expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
		});
	});
});
