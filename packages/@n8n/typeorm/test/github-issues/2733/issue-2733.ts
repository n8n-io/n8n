import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';

describe('github issues > #2733 should correctly handle function calls with upercase letters as default values', () => {
	let connections: DataSource[];

	it('MSSQL, Sqljs, Sqlite', async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/MSSQLDummy{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
			enabledDrivers: ['sqlite', 'sqlite-pooled'],
		});
		await reloadTestingDatabases(connections);
		await Promise.all(
			connections.map(async (connection) => {
				const schemaBuilder = connection.driver.createSchemaBuilder();
				const syncQueries = await schemaBuilder.log();
				expect(syncQueries.downQueries).to.be.eql([]);
				expect(syncQueries.upQueries).to.be.eql([]);
			}),
		);
		await closeTestingConnections(connections);
	});
	it('Postgres', async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/PostgresDummy{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
			enabledDrivers: ['postgres'],
		});
		await reloadTestingDatabases(connections);
		await Promise.all(
			connections.map(async (connection) => {
				const schemaBuilder = connection.driver.createSchemaBuilder();
				const syncQueries = await schemaBuilder.log();
				expect(syncQueries.downQueries).to.be.eql([]);
				expect(syncQueries.upQueries).to.be.eql([]);
			}),
		);
		await closeTestingConnections(connections);
	});
});
