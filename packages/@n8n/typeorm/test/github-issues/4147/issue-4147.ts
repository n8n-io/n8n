import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { EntitySchema } from '../../../src';
import { Post, PostSchema } from './entity/Post';

describe('github issues > #4147 `SQLITE_ERROR: near "-": syntax error` when use sqlite, simple-enum', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [new EntitySchema<Post>(PostSchema)],
				dropSchema: true,
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not error while synchronizing when using simple-enum with sqlite', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.synchronize();
				await connection.synchronize();
			}),
		));
});
