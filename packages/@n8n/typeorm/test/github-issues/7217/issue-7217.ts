import 'reflect-metadata';
import { DataSource } from '../../../src';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { User } from './entity/UserEntity';

describe('github issues > #7217 Modifying enum fails migration if the enum is used in an array column', () => {
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

	it('should not generate queries when no model changes', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.driver.createSchemaBuilder().build();

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.equal(0);
				sqlInMemory.downQueries.length.should.be.equal(0);
			}),
		));

	it('should correctly change enum', () =>
		Promise.all(
			connections.map(async (connection) => {
				const metadata = connection.getMetadata(User);
				const columnMetadata = metadata.columns.find((column) => column.databaseName === 'roles');
				columnMetadata!.enum = ['PLAYER', 'FULL_GAME'];

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.greaterThan(0);
				sqlInMemory.downQueries.length.should.be.greaterThan(0);
			}),
		));
});
