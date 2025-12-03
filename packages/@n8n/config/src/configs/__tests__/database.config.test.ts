import { Container } from '@n8n/di';

import { DatabaseConfig } from '../database.config';

describe('DatabaseConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	test('`isLegacySqlite` defaults to true', () => {
		const databaseConfig = Container.get(DatabaseConfig);
		expect(databaseConfig.isLegacySqlite).toBe(true);
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
