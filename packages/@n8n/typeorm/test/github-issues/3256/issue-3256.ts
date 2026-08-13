import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('github issues > #3256 wrong subscriber methods being called', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				subscribers: [__dirname + '/subscriber/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('if entity was changed, subscriber should be take updated columns', () =>
		Promise.all(
			connections.map(async function (connection) {
				const post = new Post();
				post.id = 1;
				post.title = 'hello world';
				await connection.manager.save(post);

				post.inserted.should.be.equal(true);
				post.updated.should.be.equal(false);

				const loadedPost = await connection.getRepository(Post).findOneById(1);
				loadedPost!.title = 'updated world';
				await connection.manager.save(loadedPost);

				loadedPost!.inserted.should.be.equal(false);
				loadedPost!.updated.should.be.equal(true);
			}),
		));
});
