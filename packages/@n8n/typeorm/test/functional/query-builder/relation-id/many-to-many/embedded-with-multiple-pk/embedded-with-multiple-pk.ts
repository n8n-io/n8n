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

describe('query builder > relation-id > many-to-many > embedded-with-multiple-pk', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('owner side', () => {
		it('should load ids when loadRelationIdAndMap used on embedded table and each table have primary key', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user1 = new User();
					user1.id = 1;
					user1.name = 'Alice';
					await connection.manager.save(user1);

					const user2 = new User();
					user2.id = 2;
					user2.name = 'Bob';
					await connection.manager.save(user2);

					const user3 = new User();
					user3.id = 3;
					user3.name = 'Clara';
					await connection.manager.save(user3);

					const category1 = new Category();
					category1.id = 1;
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.name = 'BMW';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.name = 'airplanes';
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.id = 4;
					category4.name = 'Boeing';
					await connection.manager.save(category4);

					const post1 = new Post();
					post1.id = 1;
					post1.title = 'About BMW';
					post1.counters = new Counters();
					post1.counters.code = 111;
					post1.counters.likes = 1;
					post1.counters.comments = 2;
					post1.counters.favorites = 3;
					post1.counters.categories = [category1, category2];
					post1.counters.subcntrs = new Subcounters();
					post1.counters.subcntrs.version = 1;
					post1.counters.subcntrs.watches = 2;
					post1.counters.subcntrs.watchedUsers = [user1, user2];
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.title = 'About Boeing';
					post2.counters = new Counters();
					post2.counters.code = 222;
					post2.counters.likes = 3;
					post2.counters.comments = 4;
					post2.counters.favorites = 5;
					post2.counters.categories = [category3, category4];
					post2.counters.subcntrs = new Subcounters();
					post2.counters.subcntrs.version = 1;
					post2.counters.subcntrs.watches = 1;
					post2.counters.subcntrs.watchedUsers = [user3];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.counters.categoryIds', 'post.counters.categories')
						.loadRelationIdAndMap(
							'post.counters.subcntrs.watchedUserIds',
							'post.counters.subcntrs.watchedUsers',
						)
						.orderBy('post.id')
						.getMany();

					expect(
						loadedPosts[0].should.be.eql({
							id: 1,
							title: 'About BMW',
							counters: {
								code: 111,
								likes: 1,
								comments: 2,
								favorites: 3,
								categoryIds: [
									{ id: 1, name: 'cars' },
									{ id: 2, name: 'BMW' },
								],
								subcntrs: {
									version: 1,
									watches: 2,
									watchedUserIds: [
										{ id: 1, name: 'Alice' },
										{ id: 2, name: 'Bob' },
									],
								},
							},
						}),
					);
					expect(
						loadedPosts[1].should.be.eql({
							id: 2,
							title: 'About Boeing',
							counters: {
								code: 222,
								likes: 3,
								comments: 4,
								favorites: 5,
								categoryIds: [
									{ id: 3, name: 'airplanes' },
									{ id: 4, name: 'Boeing' },
								],
								subcntrs: {
									version: 1,
									watches: 1,
									watchedUserIds: [{ id: 3, name: 'Clara' }],
								},
							},
						}),
					);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.counters.categoryIds', 'post.counters.categories')
						.loadRelationIdAndMap(
							'post.counters.subcntrs.watchedUserIds',
							'post.counters.subcntrs.watchedUsers',
						)
						.where('post.id = :id', { id: 1 })
						.andWhere('post.counters.code = :code', { code: 111 })
						.andWhere('post.counters.subcntrs.version = :version', {
							version: 1,
						})
						.getOne();

					expect(
						loadedPost!.should.be.eql({
							id: 1,
							title: 'About BMW',
							counters: {
								code: 111,
								likes: 1,
								comments: 2,
								favorites: 3,
								categoryIds: [
									{ id: 1, name: 'cars' },
									{ id: 2, name: 'BMW' },
								],
								subcntrs: {
									version: 1,
									watches: 2,
									watchedUserIds: [
										{ id: 1, name: 'Alice' },
										{ id: 2, name: 'Bob' },
									],
								},
							},
						}),
					);
				}),
			));
	});

	describe('inverse side', () => {
		it('should load ids when loadRelationIdAndMap used on embedded table and each table have primary key', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post1 = new Post();
					post1.id = 1;
					post1.title = 'About BMW';
					post1.counters = new Counters();
					post1.counters.code = 111;
					post1.counters.likes = 1;
					post1.counters.comments = 2;
					post1.counters.favorites = 3;
					post1.counters.subcntrs = new Subcounters();
					post1.counters.subcntrs.version = 1;
					post1.counters.subcntrs.watches = 2;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.title = 'About Audi';
					post2.counters = new Counters();
					post2.counters.code = 222;
					post2.counters.likes = 3;
					post2.counters.comments = 4;
					post2.counters.favorites = 5;
					post2.counters.subcntrs = new Subcounters();
					post2.counters.subcntrs.version = 1;
					post2.counters.subcntrs.watches = 5;
					await connection.manager.save(post2);

					const post3 = new Post();
					post3.id = 3;
					post3.title = 'About Boeing';
					post3.counters = new Counters();
					post3.counters.code = 333;
					post3.counters.likes = 6;
					post3.counters.comments = 7;
					post3.counters.favorites = 8;
					post3.counters.subcntrs = new Subcounters();
					post3.counters.subcntrs.version = 2;
					post3.counters.subcntrs.watches = 10;
					await connection.manager.save(post3);

					const post4 = new Post();
					post4.id = 4;
					post4.title = 'About Airbus';
					post4.counters = new Counters();
					post4.counters.code = 444;
					post4.counters.likes = 9;
					post4.counters.comments = 10;
					post4.counters.favorites = 11;
					post4.counters.subcntrs = new Subcounters();
					post4.counters.subcntrs.version = 3;
					post4.counters.subcntrs.watches = 10;
					await connection.manager.save(post4);

					const category1 = new Category();
					category1.id = 1;
					category1.name = 'cars';
					category1.posts = [post1, post2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.name = 'airplanes';
					category2.posts = [post3, post4];
					await connection.manager.save(category2);

					const user1 = new User();
					user1.id = 1;
					user1.name = 'Alice';
					user1.posts = [post1, post2];
					await connection.manager.save(user1);

					const user2 = new User();
					user2.id = 2;
					user2.name = 'Bob';
					user2.posts = [post3, post4];
					await connection.manager.save(user2);

					const loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.orderBy('category.id')
						.getMany();

					expect(loadedCategories[0].postIds).to.not.be.eql([]);
					expect(loadedCategories[0].postIds.length).to.be.equal(2);
					expect(loadedCategories[0].postIds[0]).to.be.eql({
						id: 1,
						counters: { code: 111, subcntrs: { version: 1 } },
					});
					expect(loadedCategories[0].postIds[1]).to.be.eql({
						id: 2,
						counters: { code: 222, subcntrs: { version: 1 } },
					});
					expect(loadedCategories[1].postIds).to.not.be.eql([]);
					expect(loadedCategories[1].postIds.length).to.be.equal(2);
					expect(loadedCategories[1].postIds[0]).to.be.eql({
						id: 3,
						counters: { code: 333, subcntrs: { version: 2 } },
					});
					expect(loadedCategories[1].postIds[1]).to.be.eql({
						id: 4,
						counters: { code: 444, subcntrs: { version: 3 } },
					});

					const loadedCategory = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.where('category.id = :id', { id: 1 })
						.andWhere('category.name = :name', { name: 'cars' })
						.getOne();

					expect(loadedCategory!.postIds).to.not.be.eql([]);
					expect(loadedCategory!.postIds.length).to.be.equal(2);
					expect(loadedCategory!.postIds[0]).to.be.eql({
						id: 1,
						counters: { code: 111, subcntrs: { version: 1 } },
					});
					expect(loadedCategory!.postIds[1]).to.be.eql({
						id: 2,
						counters: { code: 222, subcntrs: { version: 1 } },
					});

					const loadedUsers = await connection.manager
						.createQueryBuilder(User, 'user')
						.loadRelationIdAndMap('user.postIds', 'user.posts')
						.orderBy('user.id')
						.getMany();

					expect(loadedUsers[0].postIds).to.not.be.eql([]);
					expect(loadedUsers[0].postIds.length).to.be.equal(2);
					expect(loadedUsers[0].postIds[0]).to.be.eql({
						id: 1,
						counters: { code: 111, subcntrs: { version: 1 } },
					});
					expect(loadedUsers[0].postIds[1]).to.be.eql({
						id: 2,
						counters: { code: 222, subcntrs: { version: 1 } },
					});
					expect(loadedUsers[1].postIds).to.not.be.eql([]);
					expect(loadedUsers[1].postIds.length).to.be.equal(2);
					expect(loadedUsers[1].postIds[0]).to.be.eql({
						id: 3,
						counters: { code: 333, subcntrs: { version: 2 } },
					});
					expect(loadedUsers[1].postIds[1]).to.be.eql({
						id: 4,
						counters: { code: 444, subcntrs: { version: 3 } },
					});

					const loadedUser = await connection.manager
						.createQueryBuilder(User, 'user')
						.loadRelationIdAndMap('user.postIds', 'user.posts')
						.where('user.id = :id', { id: 1 })
						.andWhere('user.name = :name', { name: 'Alice' })
						.getOne();

					expect(loadedUser!.postIds).to.not.be.eql([]);
					expect(loadedUser!.postIds.length).to.be.equal(2);
					expect(loadedUser!.postIds[0]).to.be.eql({
						id: 1,
						counters: { code: 111, subcntrs: { version: 1 } },
					});
					expect(loadedUser!.postIds[1]).to.be.eql({
						id: 2,
						counters: { code: 222, subcntrs: { version: 1 } },
					});
				}),
			));
	});
});
