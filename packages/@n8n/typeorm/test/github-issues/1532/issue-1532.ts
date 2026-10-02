import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { User } from './entity/User';

describe('github issues > #1532 Array type default value doesnt work. PostgreSQL', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				migrations: [],
				enabledDrivers: ['postgres'],
				schemaCreate: false,
				dropSchema: true,
				entities: [User],
			})),
	);
	after(() => closeTestingConnections(connections));

	it('can recognize model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));

	it('does not generate when no model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.driver.createSchemaBuilder().build();

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));
});
