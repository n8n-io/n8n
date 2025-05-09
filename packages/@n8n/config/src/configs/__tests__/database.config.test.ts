import { Container } from '@n8n/di';
import fs from 'fs';
import { mock } from 'jest-mock-extended';

import { DatabaseConfig } from '../database.config';

jest.mock('fs');
const mockFs = mock<typeof fs>();
fs.readFileSync = mockFs.readFileSync;

describe('DatabaseConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	test.each(['mariadb', 'mysqldb', 'postgresdb'] satisfies Array<DatabaseConfig['type']>)(
		'`isLegacySqlite` returns false if dbType is `%s`',
		(dbType) => {
			const databaseConfig = Container.get(DatabaseConfig);
			databaseConfig.sqlite.poolSize = 0;
			databaseConfig.type = dbType;
			expect(databaseConfig.isLegacySqlite).toBe(false);
		},
	);

	test('`isLegacySqlite` returns false if dbType is `sqlite` and `poolSize` > 0', () => {
		const databaseConfig = Container.get(DatabaseConfig);
		databaseConfig.sqlite.poolSize = 1;
		databaseConfig.type = 'sqlite';
		expect(databaseConfig.isLegacySqlite).toBe(false);
	});

	test('`isLegacySqlite` returns true if dbType is `sqlite` and `poolSize` is 0', () => {
		const databaseConfig = Container.get(DatabaseConfig);
		databaseConfig.sqlite.poolSize = 0;
		databaseConfig.type = 'sqlite';
		expect(databaseConfig.isLegacySqlite).toBe(true);
	});
});
