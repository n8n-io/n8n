import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { Post } from './entity/Post';
import { DataSource } from '../../../../../src/data-source/DataSource';

describe('persistence > persistence options > chunks', () => {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				__dirname,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it('should save objects in chunks', () =>
		Promise.all(
			connections.map(async (connection) => {
				const posts: Post[] = [];
				for (let i = 0; i < 25000; i++) {
					// CI falls on Node 4 with 100000 rows
					const post = new Post();
					post.title = 'Bakhrom ' + i;
					post.description = 'Hello' + i;
					posts.push(post);
				}
				await connection.manager.save(posts, { chunk: 5000 }); // CI falls on Node 4 with 10000 chunks
			}),
		));
});
