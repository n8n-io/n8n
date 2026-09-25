import 'reflect-metadata';
import { expect } from 'chai';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';

describe('github issues > #4701 Duplicate migrations are executed.', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				migrations: [__dirname + '/migration/*.js'],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should throw error if there're duplicate migrations", () =>
		Promise.all(
			connections.map(async (connection) => {
				await expect(connection.runMigrations()).to.be.rejectedWith(
					Error,
					'Duplicate migrations: ExampleMigrationOne1567759789051',
				);
			}),
		));
});
