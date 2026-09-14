import 'reflect-metadata';
import { Post } from './entity/Post';
import { Counters } from './entity/Counters';
import { DataSource } from '../../../../src/data-source/DataSource';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';

describe('embedded > basic functionality', () => {
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
				post.title = 'Hello post';
				post.text = 'This is text about the post';
				post.counters = new Counters();
				post.counters.comments = 5;
				post.counters.favorites = 2;
				post.counters.likes = 1;

				await postRepository.save(post);

				// now load it
				const loadedPost = (await postRepository.findOneBy({
					id: post.id,
				}))!;
				loadedPost.title.should.be.equal('Hello post');
				loadedPost.text.should.be.equal('This is text about the post');
				loadedPost.counters.should.be.eql({
					comments: 5,
					favorites: 2,
					likes: 1,
				});

				// now update the post
				loadedPost.counters.favorites += 1;

				await postRepository.save(loadedPost);

				// now check it
				const loadedPost2 = (await postRepository.findOneBy({
					id: post.id,
				}))!;
				loadedPost2.title.should.be.equal('Hello post');
				loadedPost2.text.should.be.equal('This is text about the post');
				loadedPost2.counters.should.be.eql({
					comments: 5,
					favorites: 3,
					likes: 1,
				});

				await postRepository.remove(loadedPost2);

				// now check it
				const loadedPost3 = (await postRepository.findOneBy({
					id: post.id,
				}))!;
				expect(loadedPost3).to.be.null;
			}),
		));
});
