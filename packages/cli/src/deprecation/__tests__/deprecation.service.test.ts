import { captor } from 'jest-mock-extended';

import { mockLogger } from '@test/mocking';

import { DeprecationService } from '../deprecation.service';

describe('DeprecationService', () => {
	test('supports multiple warnings for the same environment variable', () => {
		// ARRANGE
		process.env.N8N_PARTIAL_EXECUTION_VERSION_DEFAULT = '1';
		const logger = mockLogger();
		const deprecationService = new DeprecationService(logger);

		const dataCaptor = captor();

		// ACT
		deprecationService.warn();

		// ASSERT
		expect(deprecationService.mustWarn('N8N_PARTIAL_EXECUTION_VERSION_DEFAULT')).toBe(true);

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(dataCaptor);
		expect(dataCaptor.value.trim()).toBe(
			`There are deprecations related to your environment variables. Please take the recommended actions to update your configuration:
 - N8N_PARTIAL_EXECUTION_VERSION_DEFAULT -> Version 1 of partial executions is deprecated and will be removed as early as v1.85.0
 - N8N_PARTIAL_EXECUTION_VERSION_DEFAULT -> This environment variable is internal and should not be set.`,
		);
	});

	const toTest = (envVar: string, value: string | undefined, mustWarn: boolean) => {
		if (value) {
			process.env[envVar] = value;
		} else {
			delete process.env[envVar];
		}

		const deprecationService = new DeprecationService(mockLogger());

		deprecationService.warn();

		expect(deprecationService.mustWarn(envVar)).toBe(mustWarn);
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
	])('should detect when %s is in use', (envVar, value, mustWarn) => {
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
			[undefined /* warnIfMissing */, true],
		])('should handle value: %s', (value, mustWarn) => {
			if (value === undefined) {
				delete process.env[envVar];
			} else {
				process.env[envVar] = value;
			}

			const deprecationService = new DeprecationService(mockLogger());
			deprecationService.warn();
			expect(deprecationService.mustWarn(envVar)).toBe(mustWarn);
		});
	});
});
