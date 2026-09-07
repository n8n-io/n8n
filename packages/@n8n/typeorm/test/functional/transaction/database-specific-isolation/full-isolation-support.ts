import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('transaction > transaction with full isolation support', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should execute all operations in a single transaction with READ UNCOMMITTED isolation level', () =>
		Promise.all(
			connections.map(async (connection) => {
				let postId: number | undefined = undefined,
					categoryId: number | undefined = undefined;

				await connection.manager.transaction('READ UNCOMMITTED', async (entityManager) => {
					const post = new Post();
					post.title = 'Post #1';
					await entityManager.save(post);

					const category = new Category();
					category.name = 'Category #1';
					await entityManager.save(category);

					postId = post.id;
					categoryId = category.id;
				});

				const post = await connection.manager.findOne(Post, {
					where: { title: 'Post #1' },
				});
				expect(post).not.to.be.null;
				post!.should.be.eql({
					id: postId,
					title: 'Post #1',
				});

				const category = await connection.manager.findOne(Category, {
					where: { name: 'Category #1' },
				});
				expect(category).not.to.be.null;
				category!.should.be.eql({
					id: categoryId,
					name: 'Category #1',
				});
			}),
		));

	it('should execute all operations in a single transaction with READ COMMITTED isolation level', () =>
		Promise.all(
			connections.map(async (connection) => {
				let postId: number | undefined = undefined,
					categoryId: number | undefined = undefined;

				await connection.manager.transaction('READ COMMITTED', async (entityManager) => {
					const post = new Post();
					post.title = 'Post #1';
					await entityManager.save(post);

					const category = new Category();
					category.name = 'Category #1';
					await entityManager.save(category);

					postId = post.id;
					categoryId = category.id;
				});

				const post = await connection.manager.findOne(Post, {
					where: { title: 'Post #1' },
				});
				expect(post).not.to.be.null;
				post!.should.be.eql({
					id: postId,
					title: 'Post #1',
				});

				const category = await connection.manager.findOne(Category, {
					where: { name: 'Category #1' },
				});
				expect(category).not.to.be.null;
				category!.should.be.eql({
					id: categoryId,
					name: 'Category #1',
				});
			}),
		));

	it('should execute all operations in a single transaction with REPEATABLE READ isolation level', () =>
		Promise.all(
			connections.map(async (connection) => {
				let postId: number | undefined = undefined,
					categoryId: number | undefined = undefined;

				await connection.manager.transaction('REPEATABLE READ', async (entityManager) => {
					const post = new Post();
					post.title = 'Post #1';
					await entityManager.save(post);

					const category = new Category();
					category.name = 'Category #1';
					await entityManager.save(category);

					postId = post.id;
					categoryId = category.id;
				});

				const post = await connection.manager.findOne(Post, {
					where: { title: 'Post #1' },
				});
				expect(post).not.to.be.null;
				post!.should.be.eql({
					id: postId,
					title: 'Post #1',
				});

				const category = await connection.manager.findOne(Category, {
					where: { name: 'Category #1' },
				});
				expect(category).not.to.be.null;
				category!.should.be.eql({
					id: categoryId,
					name: 'Category #1',
				});
			}),
		));

	it('should execute all operations in a single transaction with SERIALIZABLE isolation level', () =>
		Promise.all(
			connections.map(async (connection) => {
				let postId: number | undefined = undefined,
					categoryId: number | undefined = undefined;

				await connection.manager.transaction('SERIALIZABLE', async (entityManager) => {
					const post = new Post();
					post.title = 'Post #1';
					await entityManager.save(post);

					const category = new Category();
					category.name = 'Category #1';
					await entityManager.save(category);

					postId = post.id;
					categoryId = category.id;
				});

				const post = await connection.manager.findOne(Post, {
					where: { title: 'Post #1' },
				});
				expect(post).not.to.be.null;
				post!.should.be.eql({
					id: postId,
					title: 'Post #1',
				});

				const category = await connection.manager.findOne(Category, {
					where: { name: 'Category #1' },
				});
				expect(category).not.to.be.null;
				category!.should.be.eql({
					id: categoryId,
					name: 'Category #1',
				});
			}),
		));
});
