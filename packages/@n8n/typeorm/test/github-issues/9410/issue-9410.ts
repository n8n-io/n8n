import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('better-sqlite3 driver > enable wal', () => {
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

	it('github issues > #9410 The better-sqlite3 driver should support the enableWal flag', () =>
		Promise.all(
			connections.map(async (connection) => {
				const result = await connection.query('PRAGMA journal_mode');

				expect(result).to.eql([{ journal_mode: 'wal' }]);
			}),
		));
});
