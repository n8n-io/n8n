import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Migration } from '../../../src/migration/Migration';
import { ForbiddenTransactionModeOverrideError } from '../../../src/error/ForbiddenTransactionModeOverrideError';

describe('github issues > #7087 Allow to specify transaction property for individual migrations', () => {
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

	it('should fail to run all necessary migrations when transaction is all and there are transaction overrides', () =>
		Promise.all(
			connections.map(async (connection) => {
				return connection
					.runMigrations({ transaction: 'all' })
					.should.be.rejectedWith(
						ForbiddenTransactionModeOverrideError,
						'Migrations "InsertUser0000000000002", "CreateIndex0000000000003" override the transaction mode, but the global transaction mode is "all"',
					);
			}),
		));

	it('should set correct transaction mode when transaction is each', () =>
		Promise.all(
			connections.map(async (connection) => {
				const migrations: Migration[] = await connection.runMigrations({
					transaction: 'each',
				});

				migrations.length.should.be.equal(3);
				migrations[0].name.should.be.equal('CreateUsers0000000000001');
				migrations[0].transaction!.should.be.true;
				migrations[1].name.should.be.equal('InsertUser0000000000002');
				migrations[1].transaction!.should.be.true;
				migrations[2].name.should.be.equal('CreateIndex0000000000003');
				migrations[2].transaction!.should.be.false;
			}),
		));

	it('should set correct transaction mode when transaction is none', () =>
		Promise.all(
			connections.map(async (connection) => {
				const migrations: Migration[] = await connection.runMigrations({
					transaction: 'none',
				});

				migrations.length.should.be.equal(3);
				migrations[0].name.should.be.equal('CreateUsers0000000000001');
				migrations[0].transaction!.should.be.false;
				migrations[1].name.should.be.equal('InsertUser0000000000002');
				migrations[1].transaction!.should.be.true;
				migrations[2].name.should.be.equal('CreateIndex0000000000003');
				migrations[2].transaction!.should.be.false;
			}),
		));
});
