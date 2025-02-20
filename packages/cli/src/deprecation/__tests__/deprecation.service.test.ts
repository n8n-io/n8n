import { mockLogger } from '@test/mocking';

import { DeprecationService } from '../deprecation.service';

describe('DeprecationService', () => {
	const toTest = (envVar: string, value: string, mustWarn: boolean) => {
		process.env[envVar] = value;
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
