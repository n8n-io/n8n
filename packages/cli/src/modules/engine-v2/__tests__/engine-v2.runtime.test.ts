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

	const server = {
		close: vi.fn((done: (error?: Error) => void) => done()),
		once: vi.fn((event: string, listener: () => void) => {
			if (event === 'listening') listener();
			return server;
		}),
	};

	const engine = {
		app: { listen: vi.fn((_port: number, _host: string) => server) },
		start: vi.fn(),
		stop: vi.fn(async () => {}),
		startExecution: vi.fn(),
	};

	return {
		dataSource,
		server,
		engine,
		createDataSource: vi.fn((_url: string) => dataSource),
		createEngineRuntime: vi.fn((_options: unknown) => engine),
	};
});

vi.mock('@n8n/engine', () => ({
	AllowAllAdmittance: vi.fn(),
	createDataSource: mocks.createDataSource,
	createEngineRuntime: mocks.createEngineRuntime,
}));

vi.mock('@n8n/node-engine-compatibility', () => ({
	createEngineStepDataLoader: vi.fn(),
	V1StepExecutor: vi.fn(function () {
		return { execute: vi.fn() };
	}),
}));

vi.mock('@/workflow-execute-additional-data', () => ({ getBase: vi.fn() }));

describe('EngineV2Runtime', () => {
	const engineConfig = (databaseUrl: string) =>
		mock<EngineConfig>({ databaseUrl, host: '0.0.0.0', port: 3000 });

	const newRuntime = (databaseUrl = 'postgres://engine') =>
		new EngineV2Runtime(engineConfig(databaseUrl), mock<NodeTypes>(), mockLogger());

	/** The `externalDependencies` callback the runtime handed to the engine. */
	const externalDependencies = () => {
		const options = mocks.createEngineRuntime.mock.calls[0][0] as {
			externalDependencies: (stores: unknown) => Record<string, unknown>;
		};
		return options.externalDependencies({ executionStore: {}, stepStore: {} });
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.dataSource.isInitialized = false;
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

			expect(externalDependencies().v1StepExecutor).toBeDefined();
		});

		it('serves the engine API on the configured address', async () => {
			await newRuntime().init();

			expect(mocks.engine.app.listen).toHaveBeenCalledWith(3000, '0.0.0.0');
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

		it('is a no-op when init never ran', async () => {
			await expect(newRuntime().shutdown()).resolves.toBeUndefined();

			expect(mocks.dataSource.destroy).not.toHaveBeenCalled();
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
