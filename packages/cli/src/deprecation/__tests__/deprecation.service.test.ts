import { mockLogger } from '@test/mocking';

import { DeprecationService } from '../deprecation.service';

describe('DeprecationService', () => {
	const toTest = (envVar: string, value: string, inUse: boolean) => {
		process.env[envVar] = value;
		const deprecationService = new DeprecationService(mockLogger());

		deprecationService.warn();

		expect(deprecationService.isInUse(envVar)).toBe(inUse);
	};

	test.each([
		['N8N_BINARY_DATA_TTL', '1', true],
		['N8N_PERSISTED_BINARY_DATA_TTL', '1', true],
		['EXECUTIONS_DATA_PRUNE_TIMEOUT', '1', true],
		['N8N_CONFIG_FILES', '1', true],
		['N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN', '1', true],
	])('should detect when %s is in use', (envVar, value, inUse) => {
		toTest(envVar, value, inUse);
	});

	test.each([
		['default', true],
		['filesystem', false],
		['s3', false],
	])('should handle N8N_BINARY_DATA_MODE as %s', (mode, inUse) => {
		toTest('N8N_BINARY_DATA_MODE', mode, inUse);
	});

	test.each([
		['sqlite', false],
		['postgresdb', false],
		['mysqldb', true],
		['mariadb', true],
	])('should handle DB_TYPE as %s', (dbType, inUse) => {
		toTest('DB_TYPE', dbType, inUse);
	});
});
