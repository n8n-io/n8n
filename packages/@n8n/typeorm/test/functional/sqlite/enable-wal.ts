import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('sqlite driver > enable wal', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				driverSpecific: {
					enableWAL: true,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should set the journal mode as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				// if we come this far, test was successful as a connection was established
				const result = await connection.query('PRAGMA journal_mode');

				expect(result).to.eql([{ journal_mode: 'wal' }]);
			}),
		));
});
