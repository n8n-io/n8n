import 'reflect-metadata';
import { Post } from './entity/Post';
import { Counters } from './entity/Counters';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';

describe('embedded > prefix functionality', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should insert, load, update and remove entities with embeddeds properly', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				const post = new Post();
				post.id = 1;
				post.title = 'Hello post';
				post.text = 'This is text about the post';
				post.counters = new Counters();
				post.counters.comments = 5;
				post.counters.favorites = 2;
				post.counters.likes = 1;

				await postRepository.save(post);

				// now load it
				const loadedPost = (await postRepository.findOneBy({ id: 1 }))!;
				loadedPost.id.should.be.equal(1);
				loadedPost.title.should.be.equal('Hello post');
				loadedPost.text.should.be.equal('This is text about the post');
				loadedPost.counters.should.be.eql({
					comments: 5,
					favorites: 2,
					likes: 1,
				});
			}),
		));
});
