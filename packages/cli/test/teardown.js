'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
require('tsconfig-paths/register');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
exports.default = async () => {
	try {
		const { type: dbType } = di_1.Container.get(config_1.GlobalConfig).database;
		if (dbType !== 'postgresdb' && dbType !== 'mysqldb') return;
		const connection = new typeorm_1.DataSource(
			backend_test_utils_1.testDb.getBootstrapDBOptions(dbType),
		);
		await connection.initialize();
		const query =
			dbType === 'postgresdb' ? 'SELECT datname as "Database" FROM pg_database' : 'SHOW DATABASES';
		const results = await connection.query(query);
		const databases = results
			.filter(({ Database: dbName }) => dbName.startsWith(backend_test_utils_1.testDb.testDbPrefix))
			.map(({ Database: dbName }) => dbName);
		const promises = databases.map(async (dbName) => {
			try {
				await connection.query(`DROP DATABASE ${dbName};`);
			} catch (error) {
				if (!error.message?.includes('does not exist')) {
					console.warn(`Failed to drop test database ${dbName}:`, error.message);
				}
			}
		});
		await Promise.all(promises);
		await connection.destroy();
	} catch (error) {
		console.warn('Test teardown failed:', error.message);
	}
};
//# sourceMappingURL=teardown.js.map
