import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #493 pagination should work with string primary keys', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly with string primary keys', () =>
		Promise.all(
			connections.map(async (connection) => {
				for (let i = 0; i < 10; i++) {
					const post = new Post();
					post.id = 'post #' + i;
					post.title = 'Hello Post #' + i;
					await connection.manager.save(post);
				}

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.take(5)
					.skip(0)
					.orderBy('post.id')
					.getMany();

				loadedPosts.length.should.be.equal(5);
				loadedPosts[0]!.id.should.be.equal('post #0');
				loadedPosts[1]!.id.should.be.equal('post #1');
				loadedPosts[2]!.id.should.be.equal('post #2');
				loadedPosts[3]!.id.should.be.equal('post #3');
				loadedPosts[4]!.id.should.be.equal('post #4');
			}),
		));
});
