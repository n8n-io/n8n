import { mockLogger } from '@n8n/backend-test-utils';
import type { EngineConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { EngineV2Runtime } from '../engine-v2.runtime';

// Hoisted so the `vi.mock` factories below, which vitest lifts above the imports,
// can close over them.
const mocks = vi.hoisted(() => {
	const dataSource = {
		isInitialized: false,
		initialize: vi.fn(async () => {
			dataSource.isInitialized = true;
		}),
		runMigrations: vi.fn(async () => []),
		destroy: vi.fn(async () => {
			dataSource.isInitialized = false;
		}),
	};

	/** Set to make `listen()` fail instead of coming up. */
	const listen: { error?: Error } = {};

	const server = {
		close: vi.fn((done: (error?: Error) => void) => done()),
		once: vi.fn((event: string, listener: (error?: Error) => void) => {
			if (event === 'listening' && !listen.error) listener();
			if (event === 'error' && listen.error) listener(listen.error);
			return server;
		}),
	};

	const engine = {
		app: { listen: vi.fn((_port: number, _host: string) => server) },
		start: vi.fn(),
		stop: vi.fn(async () => {}),
	};

	const v1StepExecutor = { execute: vi.fn() };
	const stepDataLoader = vi.fn();

	type V1StepExecutorDeps = {
		additionalDataFactory: (executionId: string) => Promise<{ executionId?: string }>;
	};

	return {
		getBase: vi.fn(async () => ({}) as { executionId?: string }),
		dataSource,
		listen,
		server,
		engine,
		v1StepExecutor,
		stepDataLoader,
		createDataSource: vi.fn((_url: string) => dataSource),
		createEngineRuntime: vi.fn((_options: unknown) => engine),
		createEngineStepDataLoader: vi.fn((_executionStore: unknown, _stepStore: unknown) => {
			return stepDataLoader;
		}),
		V1StepExecutor: vi.fn(function (_deps: V1StepExecutorDeps) {
			return v1StepExecutor;
		}),
	};
});

vi.mock('@n8n/engine', () => ({
	AllowAllAdmittance: vi.fn(),
	SharedSecretIdentityVerifier: vi.fn(),
	createDataSource: mocks.createDataSource,
	createEngineRuntime: mocks.createEngineRuntime,
}));

vi.mock('@n8n/node-engine-compatibility', () => ({
	createEngineStepDataLoader: mocks.createEngineStepDataLoader,
	V1StepExecutor: mocks.V1StepExecutor,
}));

vi.mock('@/workflow-execute-additional-data', () => ({ getBase: mocks.getBase }));

describe('EngineV2Runtime', () => {
	const engineConfig = (databaseUrl: string) =>
		mock<EngineConfig>({ databaseUrl, host: '0.0.0.0', port: 3000 });

	const nodeTypes = mock<NodeTypes>();

	const newRuntime = (databaseUrl = 'postgres://engine') =>
		new EngineV2Runtime(engineConfig(databaseUrl), nodeTypes, mockLogger());

	/** The `externalDependencies` callback the runtime handed to the engine. */
	const externalDependencies = (stores: { executionStore: unknown; stepStore: unknown }) => {
		const options = mocks.createEngineRuntime.mock.calls[0][0] as {
			externalDependencies: (stores: unknown) => Record<string, unknown>;
		};
		return options.externalDependencies(stores);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.dataSource.isInitialized = false;
		mocks.listen.error = undefined;
	});

	describe('init', () => {
		it('refuses to start without a data plane database', async () => {
			await expect(newRuntime('').init()).rejects.toThrow('N8N_ENGINE_DATABASE_URL');

			expect(mocks.createDataSource).not.toHaveBeenCalled();
		});

		it('opens the data plane connection and migrates it before building the engine', async () => {
			await newRuntime().init();

			expect(mocks.createDataSource).toHaveBeenCalledWith('postgres://engine');
			expect(mocks.dataSource.initialize).toHaveBeenCalled();
			expect(mocks.dataSource.runMigrations).toHaveBeenCalled();
			expect(mocks.createEngineRuntime).toHaveBeenCalledWith(
				expect.objectContaining({ dataSource: mocks.dataSource }),
			);
		});

		it('starts the engine', async () => {
			await newRuntime().init();

			expect(mocks.engine.start).toHaveBeenCalled();
		});

		it('injects the v1 step executor so v1-node steps can run', async () => {
			await newRuntime().init();

			const stores = { executionStore: {}, stepStore: {} };

			expect(externalDependencies(stores).v1StepExecutor).toBe(mocks.v1StepExecutor);
			// The executor needs the CLI node types to run a v1 node, and the engine's
			// own stores to read the step data.
			expect(mocks.V1StepExecutor).toHaveBeenCalledWith(
				expect.objectContaining({ nodeTypes, loadStepData: mocks.stepDataLoader }),
			);
			expect(mocks.createEngineStepDataLoader).toHaveBeenCalledWith(
				stores.executionStore,
				stores.stepStore,
			);
		});

		it('tags the v1 additional data with the engine execution id', async () => {
			await newRuntime().init();
			externalDependencies({ executionStore: {}, stepStore: {} });

			const { additionalDataFactory } = mocks.V1StepExecutor.mock.calls[0][0];

			await expect(additionalDataFactory('exec-1')).resolves.toEqual({ executionId: 'exec-1' });
		});

		it('serves the engine API on the configured address', async () => {
			await newRuntime().init();

			expect(mocks.engine.app.listen).toHaveBeenCalledWith(3000, '0.0.0.0');
		});

		it('closes the connection when migrations fail', async () => {
			mocks.dataSource.runMigrations.mockRejectedValueOnce(new Error('migration failed'));

			await expect(newRuntime().init()).rejects.toThrow('migration failed');

			expect(mocks.dataSource.destroy).toHaveBeenCalled();
			expect(mocks.engine.stop).not.toHaveBeenCalled();
		});

		it('stops the engine and closes the connection when the server fails to listen', async () => {
			mocks.listen.error = new Error('listen failed');

			await expect(newRuntime().init()).rejects.toThrow('listen failed');

			expect(mocks.server.close).not.toHaveBeenCalled();
			expect(mocks.engine.stop).toHaveBeenCalled();
			expect(mocks.dataSource.destroy).toHaveBeenCalled();
		});

		it('surfaces the startup failure even when the rollback fails', async () => {
			mocks.listen.error = new Error('listen failed');
			mocks.engine.stop.mockRejectedValueOnce(new Error('stop failed'));

			await expect(newRuntime().init()).rejects.toThrow('listen failed');
		});
	});

	describe('shutdown', () => {
		it('closes the server, stops the engine and closes the connection', async () => {
			const runtime = newRuntime();
			await runtime.init();

			await runtime.shutdown();

			expect(mocks.server.close).toHaveBeenCalled();
			expect(mocks.engine.stop).toHaveBeenCalled();
			expect(mocks.dataSource.destroy).toHaveBeenCalled();
		});

		it('stops the engine and closes the connection when the server fails to close', async () => {
			const runtime = newRuntime();
			await runtime.init();
			mocks.server.close.mockImplementationOnce((done) => done(new Error('close failed')));

			const error = await runtime
				.shutdown()
				.catch((shutdownError: AggregateError) => shutdownError);

			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors).toEqual([new Error('close failed')]);
			expect(mocks.engine.stop).toHaveBeenCalled();
			expect(mocks.dataSource.destroy).toHaveBeenCalled();
		});

		it('closes the connection when the engine fails to stop', async () => {
			const runtime = newRuntime();
			await runtime.init();
			mocks.engine.stop.mockRejectedValueOnce(new Error('stop failed'));

			await expect(runtime.shutdown()).rejects.toThrow(AggregateError);

			expect(mocks.dataSource.destroy).toHaveBeenCalled();
		});

		it('is a no-op when init never ran', async () => {
			await expect(newRuntime().shutdown()).resolves.toBeUndefined();

			expect(mocks.dataSource.destroy).not.toHaveBeenCalled();
		});

		it('releases a resource again when its first release failed', async () => {
			const runtime = newRuntime();
			await runtime.init();
			mocks.server.close.mockImplementationOnce((done) => done(new Error('close failed')));

			await expect(runtime.shutdown()).rejects.toThrow(AggregateError);
			await expect(runtime.shutdown()).resolves.toBeUndefined();

			expect(mocks.server.close).toHaveBeenCalledTimes(2);
			// The engine and the connection released on the first pass, so they are
			// not touched again.
			expect(mocks.engine.stop).toHaveBeenCalledTimes(1);
			expect(mocks.dataSource.destroy).toHaveBeenCalledTimes(1);
		});

		it('is safe to call twice', async () => {
			const runtime = newRuntime();
			await runtime.init();

			await runtime.shutdown();
			await expect(runtime.shutdown()).resolves.toBeUndefined();

			expect(mocks.dataSource.destroy).toHaveBeenCalledTimes(1);
		});
	});
});
