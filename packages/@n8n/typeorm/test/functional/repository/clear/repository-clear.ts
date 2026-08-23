import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('repository > clear method', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should remove everything', () =>
		Promise.all(
			connections.map(async (connection) => {
				// save dummy data
				for (let i = 0; i < 100; i++) {
					const post = new Post();
					post.id = i;
					post.title = 'post #' + i;
					await connection.manager.save(post);
				}

				// check if they all are saved
				const loadedPosts = await connection.manager.find(Post);
				loadedPosts.should.be.instanceOf(Array);
				loadedPosts.length.should.be.equal(100);

				await connection.getRepository(Post).clear();

				// check find method
				const loadedPostsAfterClear = await connection.manager.find(Post);
				loadedPostsAfterClear.should.be.instanceOf(Array);
				loadedPostsAfterClear.length.should.be.equal(0);
			}),
		));

	it('called from entity managed should remove everything as well', () =>
		Promise.all(
			connections.map(async (connection) => {
				// save dummy data
				for (let i = 0; i < 100; i++) {
					const post = new Post();
					post.id = i;
					post.title = 'post #' + i;
					await connection.manager.save(post);
				}

				// check if they all are saved
				const loadedPosts = await connection.manager.find(Post);
				loadedPosts.should.be.instanceOf(Array);
				loadedPosts.length.should.be.equal(100);

				await connection.manager.clear(Post);

				// check find method
				const loadedPostsAfterClear = await connection.manager.find(Post);
				loadedPostsAfterClear.should.be.instanceOf(Array);
				loadedPostsAfterClear.length.should.be.equal(0);
			}),
		));
});
