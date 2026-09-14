import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Post } from './entity/Post';

describe('entity-listeners', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				dropSchema: true,
				schemaCreate: true,
			})),
	);
	after(() => closeTestingConnections(connections));

	it('beforeUpdate', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'post title';
				post.text = 'post text';
				await connection.manager.save(post);

				let loadedPost = await connection.getRepository(Post).findOneBy({ id: post.id });
				loadedPost!.title = 'post title   ';
				await connection.manager.save(loadedPost);

				loadedPost = await connection.getRepository(Post).findOneBy({ id: post.id });
				loadedPost!.title.should.be.equal('post title');
			}),
		));
});
