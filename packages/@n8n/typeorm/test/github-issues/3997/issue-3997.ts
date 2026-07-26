import 'reflect-metadata';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Photo } from './entity/Photo';
import { User } from './entity/User';

describe('github issues > #3997 synchronize=true always failing when using decimal column type with a foreign key constraint', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
				schemaCreate: false,
				dropSchema: true,
				entities: [User, Photo],
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
