import { captor } from 'jest-mock-extended';

import { mockLogger } from '@test/mocking';

import { DeprecationService } from '../deprecation.service';

// Ignore environment variables coming in from the environment when running
// this test suite.
process.env = {};

describe('DeprecationService', () => {
	const logger = mockLogger();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('N8N_PARTIAL_EXECUTION_VERSION_DEFAULT', () => {
		beforeAll(() => {
			process.env.N8N_PARTIAL_EXECUTION_VERSION_DEFAULT = '1';
		});

		afterAll(() => {
			delete process.env.N8N_PARTIAL_EXECUTION_VERSION_DEFAULT;
		});

		test('supports multiple warnings for the same environment variable', () => {
			// ARRANGE
			process.env.N8N_PARTIAL_EXECUTION_VERSION_DEFAULT = '1';
			const deprecationService = new DeprecationService(logger);

			const dataCaptor = captor();

			// ACT
			deprecationService.warn();

			// ASSERT
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(dataCaptor);
			expect(dataCaptor.value.match(/N8N_PARTIAL_EXECUTION_VERSION_DEFAULT/g)).toHaveLength(2);
		});
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

			const deprecationService = new DeprecationService(logger);

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
			[undefined /* warnIfMissing */, true],
		])('should handle value: %s', (value, mustWarn) => {
			toTest(envVar, value, mustWarn);
		});
	});
});
