import { newWorkflow, newExecution } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnectionOptions, wrapMigration, type Migration as MigrationType } from '@n8n/db';
import { AddConstraintToExecutionMetadata1720101653148 } from '@n8n/db/src/migrations/common/1720101653148-AddConstraintToExecutionMetadata';
import { Container } from '@n8n/di';
import { DataSource as Connection } from '@n8n/typeorm';
import type { DataSourceOptions } from '@n8n/typeorm';
import { randomString } from 'n8n-workflow';

export const testDbPrefix = 'n8n_test_';

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (dbType: 'postgresdb' | 'mysqldb'): DataSourceOptions => {
	const globalConfig = Container.get(GlobalConfig);
	const type = dbType === 'postgresdb' ? 'postgres' : 'mysql';
	return {
		type,
		...Container.get(DbConnectionOptions).getOverrides(dbType),
		database: type,
		entityPrefix: globalConfig.database.tablePrefix,
		schema: dbType === 'postgresdb' ? globalConfig.database.postgresdb.schema : undefined,
	};
};

describe('AddConstraintToExecutionMetadata1720101653148', () => {
	describe('up', () => {
		beforeEach(async () => {
			const globalConfig = Container.get(GlobalConfig);
			const dbType = globalConfig.database.type;
			const testDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;

			if (dbType === 'postgresdb') {
				const bootstrapPostgres = await new Connection(
					getBootstrapDBOptions('postgresdb'),
				).initialize();
				await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
				await bootstrapPostgres.destroy();

				globalConfig.database.postgresdb.database = testDbName;
			} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
				const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysqldb')).initialize();
				await bootstrapMysql.query(`CREATE DATABASE ${testDbName} DEFAULT CHARACTER SET utf8mb4`);
				await bootstrapMysql.destroy();

				globalConfig.database.mysqldb.database = testDbName;
			}

			const connection = await init(
				AddConstraintToExecutionMetadata1720101653148 as unknown as MigrationType,
			);
			await migrate(connection);
			await connection.destroy();
		});

		let connection: Connection;

		afterEach(async () => {
			await connection.dropDatabase();
			await connection.destroy();
		});

		test.each([
			[
				// before
				[
					{ id: 1, executionId: 1, key: 'key1', value: 'value1' },
					{ id: 2, executionId: 1, key: 'key1', value: 'value2' },
				],
				// after
				[{ id: 2, executionId: 1, key: 'key1', value: 'value2' }],
			],
		])('AddConstraintToExecutionMetadata1720101653148', async (before, after) => {
			connection = await init();

			// 1. insert data

			const workflow = newWorkflow({ id: '1', nodes: [], connections: {} });
			//const workflow = {
			//	id: '1',
			//	name: 'test workflow',
			//	active: false,
			//	nodes: '[]',
			//	connections: '{}',
			//	versionId: 1,
			//};
			//console.log(workflow);

			// get all table names in MYSQL
			//const tableNames = await connection.driver.createQueryRunner('master').query(`
			//		SELECT table_name FROM information_schema.tables
			//	`);

			//console.log(JSON.stringify(tableNames, null, 2));

			await insert(connection, 'workflow_entity', workflow);
			const execution = newExecution({ id: '1', workflowId: workflow.id });
			await insert(connection, 'execution_entity', execution);

			for (const execution_metadata of before) {
				await insert(connection, 'execution_metadata', execution_metadata);
			}

			// 2. run migration
			await migrate(connection);

			// 3. check data
			const data = await get(connection, 'execution_metadata');

			expect(data).toEqual(after);
		});
	});

	describe('down', () => {
		beforeEach(async () => {
			const globalConfig = Container.get(GlobalConfig);
			const dbType = globalConfig.database.type;
			const testDbName = `${testDbPrefix}${randomString(6, 10).toLowerCase()}_${Date.now()}`;

			if (dbType === 'postgresdb') {
				const bootstrapPostgres = await new Connection(
					getBootstrapDBOptions('postgresdb'),
				).initialize();
				await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
				await bootstrapPostgres.destroy();

				globalConfig.database.postgresdb.database = testDbName;
			} else if (dbType === 'mysqldb' || dbType === 'mariadb') {
				const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysqldb')).initialize();
				await bootstrapMysql.query(`CREATE DATABASE ${testDbName} DEFAULT CHARACTER SET utf8mb4`);
				await bootstrapMysql.destroy();

				globalConfig.database.mysqldb.database = testDbName;
			}

			const connection = await init();
			await migrate(connection);
			await connection.destroy();
		});

		let connection: Connection;

		afterEach(async () => {
			await connection.dropDatabase();
			await connection.destroy();
		});

		test.each([
			[
				// before
				[
					{ id: 2, executionId: 1, key: 'key1', value: 'value1' },
					{ id: 5, executionId: 1, key: 'key2', value: 'value1' },
				],
				// after
				[
					{ id: 2, executionId: 1, key: 'key1', value: 'value1' },
					{ id: 5, executionId: 1, key: 'key2', value: 'value1' },
				],
			],
		])('AddConstraintToExecutionMetadata1720101653148', async (before, after) => {
			connection = await init();

			// 1. insert data
			const workflow = newWorkflow({ id: '1' });
			const execution = newExecution({ id: '1', workflowId: workflow.id });

			await insert(connection, 'workflow_entity', workflow);
			await insert(connection, 'execution_entity', execution);

			for (const execution_metadata of before) {
				await insert(connection, 'execution_metadata', execution_metadata);
			}

			// 2. run migration
			await connection.undoLastMigration();

			// 3. check data
			const data = await get(connection, 'execution_metadata');
			expect(data).toEqual(after);

			// 4. check unique constraint

			//await connection.runMigrations({ transaction: 'each' });
		});
	});
});

async function init(untilMigration?: MigrationType) {
	const connectionOptions = Container.get(DbConnectionOptions).getOptions();

	//
	// FILTER MIGRATIONS
	//
	if (untilMigration) {
		const migrations: MigrationType[] = [];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		for (const migration of Object.values(connectionOptions.migrations as any as MigrationType[])) {
			if (migration === untilMigration) {
				break;
			}
			migrations.push(migration);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(connectionOptions.migrations as any) = migrations;
	}

	const connection = new Connection(connectionOptions);
	Container.set(Connection, connection);
	await connection.initialize();

	return connection;
}

async function migrate(connection: Connection) {
	(connection.options.migrations as MigrationType[]).forEach(wrapMigration);
	(connection.options.migrations as MigrationType[]).forEach(wrapMigration);

	await connection.runMigrations({ transaction: 'each' });
}

async function insert(connection: Connection, tableName: string, data: Record<string, any>) {
	const e = connection.driver.escape;
	const dbType = connection.options.type;
	const prefix = dbType === 'sqlite' ? '' : 'test_';
	let i = 1;
	const query = `
			INSERT INTO ${e(prefix + tableName)} (${Object.keys(data)
				.map((c) => e(c))
				.join(', ')})
			VALUES (${Object.values(data)
				.map((_v) => (dbType === 'postgres' ? '$' + i++ : '?'))
				.join(', ')});
		`;

	//console.log(query);
	//console.log(Object.values(data));

	await connection.driver.createQueryRunner('master').query(
		query,
		Object.values(data).map((v) => {
			if (typeof v === 'string') {
				return v;
			} else if (typeof v === 'number') {
				return v;
			} else if (typeof v === 'boolean') {
				return v;
			} else if (v instanceof Date) {
				return v;
			} else if (v === null) {
				return null;
			} else if (Array.isArray(v)) {
				return JSON.stringify(v);
			} else if (typeof v === 'object') {
				return JSON.stringify(v);
			} else {
				console.error('not supported type', typeof v);
				return JSON.stringify(v);
			}
		}),
	);
}

async function get(connection: Connection, tableName: string) {
	const dbType = connection.options.type;
	const prefix = dbType === 'sqlite' ? '' : 'test_';
	return await connection.driver.createQueryRunner('master').query(`
			SELECT * FROM ${prefix + tableName}
		`);
}
