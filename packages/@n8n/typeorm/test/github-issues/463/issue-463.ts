import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #463 saving empty string array', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not return array with single empty string if empty array was saved', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.names = [];
				await connection.getRepository(Post).save(post);
				const loadedPost = await connection.getRepository(Post).findOneBy({ identifier: 1 });
				loadedPost!.names.length.should.be.eql(0);
			}),
		));
});
