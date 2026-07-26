import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { ChildEntity1, ChildEntity2 } from './entity/Test';

describe("github issues > #7523 Do not create duplicate CREATE TYPE migration query when same 'enumName's are exists", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				entities: [ChildEntity1, ChildEntity2],
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
});
