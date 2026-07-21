import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Migration } from '../../../src/migration/Migration';
import { QueryFailedError } from '../../../src/error/QueryFailedError';

describe('github issues > #2875 Option to run migrations in 1-transaction-per-migration mode', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
				schemaCreate: false,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should fail to run all necessary migrations when transaction is all', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.runMigrations({ transaction: 'all' })
					.should.be.rejectedWith(QueryFailedError, 'relation "users" does not exist');
			}),
		));

	it('should be able to run all necessary migrations when transaction is each', () =>
		Promise.all(
			connections.map(async (connection) => {
				const mymigr: Migration[] = await connection.runMigrations({
					transaction: 'each',
				});

				mymigr.length.should.be.equal(3);
				mymigr[0].name.should.be.equal('CreateUuidExtension0000000000001');
				mymigr[1].name.should.be.equal('CreateUsers0000000000002');
				mymigr[2].name.should.be.equal('InsertUser0000000000003');
			}),
		));
});
