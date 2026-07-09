import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { InstanceType } from '@n8n/constants';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { DeprecationService } from '../deprecation.service';

describe('DeprecationService', () => {
	const logger = mock<Logger>();
	const globalConfig = mockInstance(GlobalConfig, {
		nodes: { exclude: [] },
		executions: { mode: 'regular' },
	});
	const instanceSettings = mockInstance(InstanceSettings, {
		instanceType: 'main',
		isDocker: true,
	});
	const deprecationService = new DeprecationService(logger, globalConfig, instanceSettings);

	beforeEach(() => {
		// Ignore environment variables coming in from the environment when running
		// this test suite.
		process.env = {};

		vi.resetAllMocks();
	});

	const toTest = (envVar: string, value: string | undefined, mustWarn: boolean) => {
		const originalEnv = process.env[envVar];
		try {
			// ARRANGE
			if (value) {
				process.env[envVar] = value;
			} else {
				delete process.env[envVar];
			}

			// ACT
			deprecationService.warn();

			// ASSERT
			if (mustWarn) {
				expect(logger.warn).toHaveBeenCalledTimes(1);
				expect(logger.warn.mock.lastCall?.[0]).toMatch(envVar);
			} else {
				expect(logger.warn.mock.lastCall?.[0] ?? '').not.toMatch(envVar);
			}
		} finally {
			// CLEANUP
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
		['N8N_RUNNERS_ENABLED', '1', true],
		['WEBHOOK_URL', 'https://example.com/', true],
		['N8N_DEFAULT_BINARY_DATA_MODE', 'default', true],
		['N8N_DEFAULT_BINARY_DATA_MODE', 'filesystem', false],
	])('should detect when %s is `%s`', (envVar, value, mustWarn) => {
		toTest(envVar, value, mustWarn);
	});

	describe('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS', () => {
		const envVar = 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS';

		beforeEach(() => {
			process.env = {};
		});

		describe('when executions.mode is not queue', () => {
			test.each<[InstanceType]>([['main'], ['worker'], ['webhook']])(
				'should not warn for instanceType %s',
				(instanceType) => {
					process.env[envVar] = 'false';
					const service = new DeprecationService(
						logger,
						globalConfig,
						mock<InstanceSettings>({ instanceType, isDocker: true }),
					);
					service.warn();
					expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(envVar);
				},
			);
		});

		describe('when executions.mode is queue', () => {
			const globalConfig = mockInstance(GlobalConfig, {
				nodes: { exclude: [] },
				executions: { mode: 'queue' },
			});

			describe('when instanceType is worker', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should not warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new DeprecationService(
						logger,
						globalConfig,
						mock<InstanceSettings>({ instanceType: 'worker', isDocker: true }),
					);
					service.warn();
					expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(envVar);
				});
			});

			describe('when instanceType is webhook', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should not warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new DeprecationService(
						logger,
						globalConfig,
						mock<InstanceSettings>({ instanceType: 'webhook', isDocker: true }),
					);
					service.warn();
					expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(envVar);
				});
			});

			describe('when instanceType is main', () => {
				test.each([
					['false', 'false'],
					['empty string', ''],
				])(`should warn when ${envVar} is %s`, (_description, envValue) => {
					process.env[envVar] = envValue;
					const service = new DeprecationService(logger, globalConfig, instanceSettings);
					service.warn();
					expect(logger.warn.mock.lastCall?.[0] ?? '').toContain(envVar);
				});

				test('should not warn when OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS is true', () => {
					process.env[envVar] = 'true';

					const service = new DeprecationService(logger, globalConfig, instanceSettings);
					service.warn();

					expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(envVar);
				});

				test('should warn when OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS is undefined', () => {
					delete process.env[envVar];

					const service = new DeprecationService(logger, globalConfig, instanceSettings);
					service.warn();

					expect(logger.warn).toHaveBeenCalledTimes(1);
					const warningMessage = logger.warn.mock.calls[0][0];
					expect(warningMessage).toContain(envVar);
				});
			});
		});
	});

	describe('default-flip warnings', () => {
		test.each([
			'N8N_UNVERIFIED_PACKAGES_ENABLED',
			'N8N_RUNNERS_TASK_TIMEOUT',
			'N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES',
			'N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES',
		])('should warn when %s is unset', (envVar) => {
			delete process.env[envVar];
			deprecationService.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').toContain(envVar);
		});

		test.each([
			['N8N_UNVERIFIED_PACKAGES_ENABLED', 'false'],
			['N8N_RUNNERS_TASK_TIMEOUT', '120'],
			['N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES', '1048576'],
			['N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES', '100'],
		])('should not warn when %s is set explicitly', (envVar, value) => {
			process.env[envVar] = value;
			deprecationService.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(envVar);
		});
	});

	describe('running outside a container', () => {
		const message = 'Running n8n outside a container is deprecated';

		test('should warn when not running in a container', () => {
			const service = new DeprecationService(
				logger,
				globalConfig,
				mock<InstanceSettings>({ instanceType: 'main', isDocker: false }),
			);
			service.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').toContain(message);
		});

		test('should not warn when running in a container', () => {
			const service = new DeprecationService(
				logger,
				globalConfig,
				mock<InstanceSettings>({ instanceType: 'main', isDocker: true }),
			);
			service.warn();
			expect(logger.warn.mock.lastCall?.[0] ?? '').not.toContain(message);
		});
	});
});
