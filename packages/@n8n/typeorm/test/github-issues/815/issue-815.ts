import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('github issues > #815 @RelationId properties are not updated after entity saving', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should work perfectly with many-to-one relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.title = 'About relation id';
				await connection.manager.save(post);

				const category = new Category();
				category.firstId = 2;
				category.secondId = 3;
				category.name = 'relation-id-category';
				category.post = post;
				await connection.manager.save(category);

				expect(post).to.be.eql({
					id: 1,
					title: 'About relation id',
				});

				expect(category).to.be.eql({
					firstId: 2,
					secondId: 3,
					name: 'relation-id-category',
					post: {
						id: 1,
						title: 'About relation id',
					},
					postId: 1,
				});

				category.post = null;
				await connection.manager.save(category);

				expect(category).to.be.eql({
					firstId: 2,
					secondId: 3,
					name: 'relation-id-category',
					post: null,
					postId: null,
				});
			}),
		));

	it('should work perfectly with one-to-many relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.firstId = 2;
				category1.secondId = 3;
				category1.name = 'relation-id-category1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.firstId = 2;
				category2.secondId = 4;
				category2.name = 'relation-id-category2';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'About relation id';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				expect(category1).to.be.eql({
					firstId: 2,
					secondId: 3,
					name: 'relation-id-category1',
				});

				expect(category2).to.be.eql({
					firstId: 2,
					secondId: 4,
					name: 'relation-id-category2',
				});

				expect(post).to.be.eql({
					id: 1,
					title: 'About relation id',
					categories: [
						{
							firstId: 2,
							secondId: 3,
							name: 'relation-id-category1',
						},
						{
							firstId: 2,
							secondId: 4,
							name: 'relation-id-category2',
						},
					],
					categoryIds: [
						{
							firstId: 2,
							secondId: 3,
						},
						{
							firstId: 2,
							secondId: 4,
						},
					],
				});
			}),
		));

	it('should work perfectly with many-to-many relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post();
				post1.title = 'About relation id1';
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'About relation id2';
				await connection.manager.save(post2);

				const category1 = new Category();
				category1.firstId = 2;
				category1.secondId = 3;
				category1.manyPosts = [post1, post2];
				category1.name = 'relation-id-category1';

				const category2 = new Category();
				category2.firstId = 2;
				category2.secondId = 4;
				category2.name = 'relation-id-category2';
				category2.manyPosts = [post2];
				await connection.manager.save([category1, category2]);

				expect(post1).to.be.eql({
					id: 1,
					title: 'About relation id1',
				});

				expect(post2).to.be.eql({
					id: 2,
					title: 'About relation id2',
				});

				expect(category1).to.be.eql({
					firstId: 2,
					secondId: 3,
					name: 'relation-id-category1',
					manyPosts: [
						{
							id: 1,
							title: 'About relation id1',
						},
						{
							id: 2,
							title: 'About relation id2',
						},
					],
					manyPostIds: [1, 2],
				});

				expect(category2).to.be.eql({
					firstId: 2,
					secondId: 4,
					name: 'relation-id-category2',
					manyPosts: [
						{
							id: 2,
							title: 'About relation id2',
						},
					],
					manyPostIds: [2],
				});
			}),
		));

	it('should work perfectly with many-to-many relation (inverse side)', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.firstId = 2;
				category1.secondId = 3;
				category1.name = 'relation-id-category1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.firstId = 2;
				category2.secondId = 4;
				category2.name = 'relation-id-category2';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'About relation id';
				post.manyCategories = [category1, category2];
				await connection.manager.save(post);

				expect(category1).to.be.eql({
					firstId: 2,
					secondId: 3,
					name: 'relation-id-category1',
				});

				expect(category2).to.be.eql({
					firstId: 2,
					secondId: 4,
					name: 'relation-id-category2',
				});

				expect(post).to.be.eql({
					id: 1,
					title: 'About relation id',
					manyCategories: [
						{
							firstId: 2,
							secondId: 3,
							name: 'relation-id-category1',
						},
						{
							firstId: 2,
							secondId: 4,
							name: 'relation-id-category2',
						},
					],
					manyCategoryIds: [
						{
							firstId: 2,
							secondId: 3,
						},
						{
							firstId: 2,
							secondId: 4,
						},
					],
				});
			}),
		));
});
