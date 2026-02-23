import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';

import { RemovedDatabaseTypesRule } from '../removed-database-types.rule';

describe('RemovedDatabaseTypesRule', () => {
	let rule: RemovedDatabaseTypesRule;
	let globalConfig: GlobalConfig;

	beforeEach(() => {
		globalConfig = mockInstance(GlobalConfig);
		rule = new RemovedDatabaseTypesRule(globalConfig);
	});

	describe('detect()', () => {
		it('should not be affected when using PostgreSQL', async () => {
			globalConfig.database.type = 'postgresdb';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when using MySQL', async () => {
			globalConfig.database.type = 'mysqldb';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('MySQL database type removed');
		});

		it('should be affected when using MariaDB', async () => {
			globalConfig.database.type = 'mariadb';

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('MariaDB database type removed');
		});
	});
});
