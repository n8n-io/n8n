import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('sqlite driver > busy-timeout', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				driverSpecific: {
					busyTimeout: 2000,
				},
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should set the busy_timeout as expected', () =>
		Promise.all(
			connections.map(async (connection) => {
				const result = await connection.query('PRAGMA busy_timeout');
				expect(result).to.eql([{ timeout: 2000 }]);
			}),
		));
});
