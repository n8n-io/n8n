import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Migration } from '../../../src/migration/Migration';

describe('github issues > #2875 runMigrations() function is not returning a list of migrated files', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				migrations: [__dirname + '/migration/*.js'],
				enabledDrivers: ['postgres'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should be able to run all necessary migrations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const mymigr: Migration[] = await connection.runMigrations();

				mymigr.length.should.be.equal(1);
				mymigr[0].name.should.be.equal('InitUsers1530542855524');
			}),
		));
});
