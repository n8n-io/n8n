import { Container } from '@n8n/di';

import { DatabaseConfig } from '../database.config';

describe('DatabaseConfig', () => {
	beforeEach(() => {
		Container.reset();
		jest.clearAllMocks();
	});

	test.each(['sqlite', 'mariadb', 'mysqldb', 'postgresdb'] satisfies Array<DatabaseConfig['type']>)(
		'`isLegacySqlite` returns false if dbType is `%s`',
		(dbType) => {
			const databaseConfig = Container.get(DatabaseConfig);
			databaseConfig.type = dbType;
			expect(databaseConfig.isLegacySqlite).toBe(false);
		},
	);
});
