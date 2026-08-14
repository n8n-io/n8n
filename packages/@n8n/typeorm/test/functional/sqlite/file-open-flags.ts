import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
const sqlite3 = require('sqlite3');

describe('sqlite driver > file open flags', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				name: 'file:./temp/sqlitedb-memory.db?mode=memory',
				entities: [],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				driverSpecific: {
					flags:
						sqlite3.OPEN_URI |
						sqlite3.OPEN_SHAREDCACHE |
						sqlite3.OPEN_READWRITE |
						sqlite3.OPEN_CREATE,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should open a DB with flags as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				// if we come this far, test was successful as a connection was established
				const result = await connection.query('PRAGMA journal_mode');

				expect(result).to.eql([{ journal_mode: 'wal' }]);
			}),
		));
});
