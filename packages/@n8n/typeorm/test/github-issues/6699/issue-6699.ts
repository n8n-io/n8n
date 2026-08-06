import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';

describe('github issues > #6699 MaxListenersExceededWarning occurs on Postgres', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('queries in a transaction do not cause an EventEmitter memory leak', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.transaction(async (manager) => {
					const queryPromises = [...Array(10)].map(() => manager.query('SELECT pg_sleep(0.0001)'));

					const pgConnection = await manager.queryRunner!.connect();

					expect(pgConnection.listenerCount('error')).to.equal(1);

					// Wait for all of the queries to finish and drain the backlog
					await Promise.all(queryPromises);
				});
			}),
		));
});
