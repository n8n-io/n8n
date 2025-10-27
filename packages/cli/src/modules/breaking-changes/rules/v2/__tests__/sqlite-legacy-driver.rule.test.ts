import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';

import { SqliteLegacyDriverRule } from '../sqlite-legacy-driver.rule';

describe('SqliteLegacyDriverRule', () => {
	let rule: SqliteLegacyDriverRule;
	let globalConfig: GlobalConfig;

	beforeEach(() => {
		globalConfig = mockInstance(GlobalConfig, {
			database: {
				type: 'postgresdb',
				sqlite: {
					poolSize: 0,
				},
			},
		});
		rule = new SqliteLegacyDriverRule(globalConfig);
	});

	describe('detect()', () => {
		it('should not be affected when using PostgreSQL', async () => {
			globalConfig.database.type = 'postgresdb';

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should not be affected when using SQLite with poolSize >= 1', async () => {
			globalConfig.database.type = 'sqlite';
			globalConfig.database.sqlite.poolSize = 3;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when using SQLite with poolSize < 1', async () => {
			globalConfig.database.type = 'sqlite';
			globalConfig.database.sqlite.poolSize = 0;

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(2);
			expect(result.instanceIssues[0].title).toBe('SQLite legacy driver removed');
		});
	});
});
