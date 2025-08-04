'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const config_2 = __importDefault(require('@/config'));
const deprecation_service_1 = require('../deprecation.service');
describe('DeprecationService', () => {
	const logger = (0, jest_mock_extended_1.mock)();
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		nodes: { exclude: [] },
	});
	const instanceSettings = (0, backend_test_utils_1.mockInstance)(n8n_core_1.InstanceSettings, {
		instanceType: 'main',
	});
	const deprecationService = new deprecation_service_1.DeprecationService(
		logger,
		globalConfig,
		instanceSettings,
	);
	beforeEach(() => {
		process.env = {};
		jest.resetAllMocks();
	});
	describe('N8N_PARTIAL_EXECUTION_VERSION_DEFAULT', () => {
		test('supports multiple warnings for the same environment variable', () => {
			process.env.N8N_PARTIAL_EXECUTION_VERSION_DEFAULT = '1';
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			deprecationService.warn();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(dataCaptor);
			expect(dataCaptor.value.split('\n')).toEqual(
				expect.arrayContaining([
					' - N8N_PARTIAL_EXECUTION_VERSION_DEFAULT -> Version 1 of partial executions is deprecated and will be removed as early as v1.85.0',
					' - N8N_PARTIAL_EXECUTION_VERSION_DEFAULT -> This environment variable is internal and should not be set.',
				]),
			);
		});
	});
	const toTest = (envVar, value, mustWarn) => {
		const originalEnv = process.env[envVar];
		try {
			if (value) {
				process.env[envVar] = value;
			} else {
				delete process.env[envVar];
			}
			deprecationService.warn();
			if (mustWarn) {
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn.mock.lastCall?.[0]).toMatch(envVar);
			} else {
				expect(logger.warn.mock.lastCall?.[0] ?? '').not.toMatch(envVar);
			}
		} finally {
			if (originalEnv) {
				process.env[envVar] = originalEnv;
			} else {
				delete process.env[envVar];
			}
		}
	};
	test.each([
		['N8N_BINARY_DATA_TTL', '1', true],
		['N8N_PERSISTED_BINARY_DATA_TTL', '1', true],
		['EXECUTIONS_DATA_PRUNE_TIMEOUT', '1', true],
		['N8N_CONFIG_FILES', '1', true],
		['N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN', '1', true],
		['N8N_PARTIAL_EXECUTION_VERSION_DEFAULT', '1', true],
		['N8N_PARTIAL_EXECUTION_VERSION_DEFAULT', '2', true],
		['N8N_PARTIAL_EXECUTION_VERSION_DEFAULT', undefined, false],
	])('should detect when %s is `%s`', (envVar, value, mustWarn) => {
		toTest(envVar, value, mustWarn);
	});
	test.each([
		['default', true],
		['filesystem', false],
		['s3', false],
	])('should handle N8N_BINARY_DATA_MODE as %s', (mode, mustWarn) => {
		toTest('N8N_BINARY_DATA_MODE', mode, mustWarn);
	});
	test.each([
		['sqlite', false],
		['postgresdb', false],
		['mysqldb', true],
		['mariadb', true],
	])('should handle DB_TYPE as %s', (dbType, mustWarn) => {
		toTest('DB_TYPE', dbType, mustWarn);
	});
	describe('N8N_RUNNERS_ENABLED', () => {
		const envVar = 'N8N_RUNNERS_ENABLED';
		test.each([
			['false', true],
			['', true],
			['true', false],
			[undefined, true],
		])('should handle value: %s', (value, mustWarn) => {
			toTest(envVar, value, mustWarn);
		});
		test('should not warn when Code node is excluded', () => {
			process.env[envVar] = 'false';
			const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
				nodes: {
					exclude: ['n8n-nodes-base.code'],
				},
			});
			new deprecation_service_1.DeprecationService(logger, globalConfig, instanceSettings).warn();
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});
	describe('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', () => {
		const envVar = 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS';
		beforeEach(() => {
			process.env = { N8N_RUNNERS_ENABLED: 'true' };
			jest.spyOn(config_2.default, 'getEnv').mockImplementation((key) => {
				if (key === 'executions.mode') return 'queue';
				return undefined;
			});
		});
		describe('when executions.mode is not queue', () => {
			test.each([['main'], ['worker'], ['webhook']])(
				'should not warn for instanceType %s',
				(instanceType) => {
					jest.spyOn(config_2.default, 'getEnv').mockImplementation((key) => {
						if (key === 'executions.mode') return 'regular';
						return;
					});
					process.env[envVar] = 'false';
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						(0, jest_mock_extended_1.mock)({ instanceType }),
					);
					service.warn();
					expect(logger.warn).not.toHaveBeenCalled();
				},
			);
		});
		describe('when executions.mode is queue', () => {
			describe('when instanceType is worker', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should not warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						(0, jest_mock_extended_1.mock)({ instanceType: 'worker' }),
					);
					service.warn();
					expect(logger.warn).not.toHaveBeenCalled();
				});
			});
			describe('when instanceType is webhook', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should not warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						(0, jest_mock_extended_1.mock)({ instanceType: 'webhook' }),
					);
					service.warn();
					expect(logger.warn).not.toHaveBeenCalled();
				});
			});
			describe('when instanceType is main', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						instanceSettings,
					);
					service.warn();
					expect(logger.warn).toHaveBeenCalled();
				});
				test('should not warn when OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS is true', () => {
					process.env[envVar] = 'true';
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						instanceSettings,
					);
					service.warn();
					expect(logger.warn).not.toHaveBeenCalled();
				});
				test('should warn when OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS is undefined', () => {
					delete process.env[envVar];
					const service = new deprecation_service_1.DeprecationService(
						logger,
						globalConfig,
						instanceSettings,
					);
					service.warn();
					expect(logger.warn).toHaveBeenCalledTimes(1);
					const warningMessage = logger.warn.mock.calls[0][0];
					expect(warningMessage).toContain(envVar);
				});
			});
		});
	});
});
//# sourceMappingURL=deprecation.service.test.js.map
