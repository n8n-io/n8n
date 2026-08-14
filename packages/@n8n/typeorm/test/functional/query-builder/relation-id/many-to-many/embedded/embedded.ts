import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../../utils/test-utils';
import { DataSource } from '../../../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { Counters } from './entity/Counters';
import { User } from './entity/User';
import { Subcounters } from './entity/Subcounters';

describe('query builder > relation-id > many-to-many > embedded', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load ids when loadRelationIdAndMap used on embedded and nested embedded tables', () =>
		Promise.all(
			connections.map(async (connection) => {
				const user1 = new User();
				user1.name = 'Alice';
				await connection.manager.save(user1);

				const user2 = new User();
				user2.name = 'Bob';
				await connection.manager.save(user2);

				const user3 = new User();
				user3.name = 'Clara';
				await connection.manager.save(user3);

				const category1 = new Category();
				category1.name = 'cars';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'airplanes';
				await connection.manager.save(category3);

				const category4 = new Category();
				category4.name = 'Boeing';
				await connection.manager.save(category4);

				const post1 = new Post();
				post1.title = 'About BMW';
				post1.counters = new Counters();
				post1.counters.likes = 1;
				post1.counters.comments = 2;
				post1.counters.favorites = 3;
				post1.counters.categories = [category1, category2];
				post1.counters.subcounters = new Subcounters();
				post1.counters.subcounters.version = 1;
				post1.counters.subcounters.watches = 2;
				post1.counters.subcounters.watchedUsers = [user1, user2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'About Boeing';
				post2.counters = new Counters();
				post2.counters.likes = 3;
				post2.counters.comments = 4;
				post2.counters.favorites = 5;
				post2.counters.categories = [category3, category4];
				post2.counters.subcounters = new Subcounters();
				post2.counters.subcounters.version = 1;
				post2.counters.subcounters.watches = 1;
				post2.counters.subcounters.watchedUsers = [user3];
				await connection.manager.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.counters.categoryIds', 'post.counters.categories')
					.loadRelationIdAndMap(
						'post.counters.subcounters.watchedUserIds',
						'post.counters.subcounters.watchedUsers',
					)
					.orderBy('post.id')
					.getMany();

				expect(
					loadedPosts[0].should.be.eql({
						title: 'About BMW',
						counters: {
							likes: 1,
							comments: 2,
							favorites: 3,
							categoryIds: [1, 2],
							subcounters: {
								id: 1,
								version: 1,
								watches: 2,
								watchedUserIds: [1, 2],
							},
						},
					}),
				);
				expect(
					loadedPosts[1].should.be.eql({
						title: 'About Boeing',
						counters: {
							likes: 3,
							comments: 4,
							favorites: 5,
							categoryIds: [3, 4],
							subcounters: {
								id: 2,
								version: 1,
								watches: 1,
								watchedUserIds: [3],
							},
						},
					}),
				);
			}),
		));
});
