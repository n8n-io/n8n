import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { SomeEntity, CreationMechanism } from './entity/SomeEntity';

describe('github issues > #3076 Postgres enum in schema with default is recreated in every new generated migration', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				migrations: [],
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				entities: [SomeEntity],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('should recognize model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));

	it('should not generate queries when no model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.driver.createSchemaBuilder().build();

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));

	it('should handle `enumName` default change', () =>
		Promise.all(
			connections.map(async (connection) => {
				const entityMetadata = connection.getMetadata(SomeEntity);
				const columnMetadata = entityMetadata.columns.find(
					(column) => column.databaseName === 'creationMechanism',
				);
				columnMetadata!.default = CreationMechanism.SOURCE_B;

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));
});
