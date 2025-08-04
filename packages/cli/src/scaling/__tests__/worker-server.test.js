'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const node_assert_1 = require('node:assert');
const http = __importStar(require('node:http'));
const middlewares_1 = require('@/middlewares');
const worker_server_1 = require('../worker-server');
const app = (0, jest_mock_extended_1.mock)();
jest.mock('node:http');
jest.mock('express', () => ({ __esModule: true, default: () => app }));
const addressInUseError = () => {
	const error = new Error('Port already in use');
	error.code = 'EADDRINUSE';
	return error;
};
describe('WorkerServer', () => {
	let globalConfig;
	const externalHooks = (0, jest_mock_extended_1.mock)();
	const instanceSettings = (0, jest_mock_extended_1.mock)({ instanceType: 'worker' });
	const prometheusMetricsService = (0, jest_mock_extended_1.mock)();
	const dbConnection = (0, jest_mock_extended_1.mock)();
	const newWorkerServer = () =>
		new worker_server_1.WorkerServer(
			globalConfig,
			(0, backend_test_utils_1.mockLogger)(),
			dbConnection,
			(0, jest_mock_extended_1.mock)(),
			externalHooks,
			instanceSettings,
			prometheusMetricsService,
			(0, jest_mock_extended_1.mock)(),
		);
	beforeEach(() => {
		globalConfig = (0, jest_mock_extended_1.mock)({
			queue: {
				health: { active: true, port: 5678, address: '::' },
			},
			credentials: {
				overwrite: { endpoint: '' },
			},
		});
		jest.restoreAllMocks();
	});
	describe('constructor', () => {
		it('should throw if non-worker instance type', () => {
			expect(
				() =>
					new worker_server_1.WorkerServer(
						globalConfig,
						(0, backend_test_utils_1.mockLogger)(),
						dbConnection,
						(0, jest_mock_extended_1.mock)(),
						externalHooks,
						(0, jest_mock_extended_1.mock)({ instanceType: 'webhook' }),
						prometheusMetricsService,
						(0, jest_mock_extended_1.mock)(),
					),
			).toThrowError(node_assert_1.AssertionError);
		});
		it('should exit if port taken', async () => {
			const server = (0, jest_mock_extended_1.mock)();
			const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
			jest.spyOn(http, 'createServer').mockReturnValue(server);
			server.on.mockImplementation((event, callback) => {
				if (event === 'error') callback(addressInUseError());
				return server;
			});
			newWorkerServer();
			expect(processExitSpy).toHaveBeenCalledWith(1);
			processExitSpy.mockRestore();
		});
	});
	describe('init', () => {
		it('should mount all endpoints when all are enabled', async () => {
			const server = (0, jest_mock_extended_1.mock)();
			jest.spyOn(http, 'createServer').mockReturnValue(server);
			server.listen.mockImplementation((...args) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});
			const workerServer = newWorkerServer();
			const CREDENTIALS_OVERWRITE_ENDPOINT = 'credentials/overwrites';
			globalConfig.credentials.overwrite.endpoint = CREDENTIALS_OVERWRITE_ENDPOINT;
			await workerServer.init({ health: true, overwrites: true, metrics: true });
			expect(app.get).toHaveBeenCalledWith('/healthz', expect.any(Function));
			expect(app.post).toHaveBeenCalledWith(
				`/${CREDENTIALS_OVERWRITE_ENDPOINT}`,
				middlewares_1.rawBodyReader,
				middlewares_1.bodyParser,
				expect.any(Function),
			);
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});
		it('should mount only health and overwrites endpoints if only those are enabled', async () => {
			const server = (0, jest_mock_extended_1.mock)();
			jest.spyOn(http, 'createServer').mockReturnValue(server);
			server.listen.mockImplementation((...args) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});
			const workerServer = newWorkerServer();
			await workerServer.init({ health: true, overwrites: false, metrics: true });
			expect(app.get).toHaveBeenCalledWith('/healthz', expect.any(Function));
			expect(app.post).not.toHaveBeenCalled();
			expect(prometheusMetricsService.init).toHaveBeenCalledWith(app);
		});
		it('should throw if no endpoints are enabled', async () => {
			const server = (0, jest_mock_extended_1.mock)();
			jest.spyOn(http, 'createServer').mockReturnValue(server);
			const workerServer = newWorkerServer();
			await expect(
				workerServer.init({ health: false, overwrites: false, metrics: false }),
			).rejects.toThrowError(node_assert_1.AssertionError);
		});
		it('should call `worker.ready` external hook', async () => {
			const server = (0, jest_mock_extended_1.mock)();
			jest.spyOn(http, 'createServer').mockReturnValue(server);
			const workerServer = newWorkerServer();
			server.listen.mockImplementation((...args) => {
				const callback = args.find((arg) => typeof arg === 'function');
				if (callback) callback();
				return server;
			});
			await workerServer.init({ health: true, overwrites: true, metrics: true });
			expect(externalHooks.run).toHaveBeenCalledWith('worker.ready');
		});
	});
});
//# sourceMappingURL=worker-server.test.js.map
