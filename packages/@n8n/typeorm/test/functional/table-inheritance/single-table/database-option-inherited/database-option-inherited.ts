import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src';

describe('table-inheritance > single-table > database-option-inherited', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
			})),
	);

	// Running sequentially since all SQLite connections are
	// attaching to the same DB and might cause SQLITE_BUSY
	beforeEach(() => reloadTestingDatabases(connections, false));
	after(() => closeTestingConnections(connections));

	it('should correctly inherit database option', () =>
		Promise.all(
			connections.map(async (connection) => {
				connection.entityMetadatas.forEach((metadata) => metadata.database!.should.equal('test'));
			}),
		));
});
