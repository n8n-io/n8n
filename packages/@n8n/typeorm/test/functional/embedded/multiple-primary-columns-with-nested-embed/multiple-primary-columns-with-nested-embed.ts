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
import { Subcounters } from './entity/Subcounters';

describe('embedded > multiple-primary-columns-with-nested-embed', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should insert, load, update and remove entities with embeddeds when primary column defined in main and in embedded entities', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				const post1 = new Post();
				post1.id = 1;
				post1.title = 'About cars';
				post1.counters = new Counters();
				post1.counters.code = 1;
				post1.counters.comments = 1;
				post1.counters.favorites = 2;
				post1.counters.likes = 3;
				post1.counters.subcounters = new Subcounters();
				post1.counters.subcounters.version = 1;
				post1.counters.subcounters.watches = 5;
				await connection.getRepository(Post).save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.title = 'About airplanes';
				post2.counters = new Counters();
				post2.counters.code = 2;
				post2.counters.comments = 2;
				post2.counters.favorites = 3;
				post2.counters.likes = 4;
				post2.counters.subcounters = new Subcounters();
				post2.counters.subcounters.version = 1;
				post2.counters.subcounters.watches = 10;
				await postRepository.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.orderBy('post.id')
					.getMany();

				expect(
					loadedPosts[0].should.be.eql({
						id: 1,
						title: 'About cars',
						counters: {
							code: 1,
							comments: 1,
							favorites: 2,
							likes: 3,
							subcounters: {
								version: 1,
								watches: 5,
							},
						},
					}),
				);
				expect(
					loadedPosts[1].should.be.eql({
						id: 2,
						title: 'About airplanes',
						counters: {
							code: 2,
							comments: 2,
							favorites: 3,
							likes: 4,
							subcounters: {
								version: 1,
								watches: 10,
							},
						},
					}),
				);

				const loadedPost = (await postRepository.findOneBy({
					id: 1,
					counters: { code: 1, subcounters: { version: 1 } },
				}))!;
				expect(
					loadedPost.should.be.eql({
						id: 1,
						title: 'About cars',
						counters: {
							code: 1,
							comments: 1,
							favorites: 2,
							likes: 3,
							subcounters: {
								version: 1,
								watches: 5,
							},
						},
					}),
				);

				loadedPost.counters.favorites += 1;
				loadedPost.counters.subcounters.watches += 1;
				await postRepository.save(loadedPost);

				const loadedPost2 = (await postRepository.findOneBy({
					id: 1,
					counters: { code: 1, subcounters: { version: 1 } },
				}))!;
				expect(
					loadedPost2.should.be.eql({
						id: 1,
						title: 'About cars',
						counters: {
							code: 1,
							comments: 1,
							favorites: 3,
							likes: 3,
							subcounters: {
								version: 1,
								watches: 6,
							},
						},
					}),
				);

				await postRepository.remove(loadedPost2);

				const loadedPosts2 = (await postRepository.find())!;
				expect(loadedPosts2.length).to.be.equal(1);
				expect(loadedPosts2[0].title).to.be.equal('About airplanes');
			}),
		));
});
