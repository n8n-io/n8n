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

describe("github issues > #175 ManyToMany relation doesn't put an empty array when the relation is empty", () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return post with categories if they are attached to the post', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const postWithCategories = new Post();
				postWithCategories.title = 'post with categories';
				postWithCategories.categories = [category1, category2];
				await connection.manager.save(postWithCategories);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.where('post.title = :title', {
						title: 'post with categories',
					})
					.addOrderBy('categories.id')
					.getOne();

				expect(loadedPost).not.to.be.null;
				loadedPost!.should.be.eql({
					id: 1,
					title: 'post with categories',
					categories: [
						{
							id: 1,
							name: 'category #1',
						},
						{
							id: 2,
							name: 'category #2',
						},
					],
				});
			}),
		));

	it('should return post with categories even if post with empty categories was saved', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const postWithoutCategories = new Post();
				postWithoutCategories.title = 'post without categories';
				postWithoutCategories.categories = [];
				await connection.manager.save(postWithoutCategories);

				const justPost = new Post();
				justPost.title = 'just post';

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.where('post.title = :title', {
						title: 'post without categories',
					})
					.getOne();

				expect(loadedPost).not.to.be.null;
				loadedPost!.should.be.eql({
					id: 1,
					title: 'post without categories',
					categories: [],
				});
			}),
		));

	it('should return post with categories even if post was saved without categories set', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'category #1';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'category #2';
				await connection.manager.save(category2);

				const justPost = new Post();
				justPost.title = 'just post';
				await connection.manager.save(justPost);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.secondaryCategories', 'secondaryCategories')
					.where('post.title = :title', { title: 'just post' })
					.getOne();

				expect(loadedPost).not.to.be.null;
				loadedPost!.should.be.eql({
					id: 1,
					title: 'just post',
					secondaryCategories: [],
				});
			}),
		));
});
