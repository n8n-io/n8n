import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { expect } from 'chai';

describe('persistence > many-to-one bi-directional relation', function () {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should save a category with a post attached', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				await connection.manager.save(post);

				const category = new Category(1, 'Hello Category');
				category.post = post;
				await connection.manager.save(category);

				const loadedCategory = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory).not.to.be.undefined;
				loadedCategory!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});
			}),
		));

	it('should save a category and a new post by cascades', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				const category = new Category(1, 'Hello Category');
				category.post = post;
				await connection.manager.save(category);

				const loadedCategory = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory).not.to.be.undefined;
				loadedCategory!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});
			}),
		));

	it('should update exist post by cascades when category is saved', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				await connection.manager.save(post);

				// update exist post from newly created category
				const category = new Category(1, 'Hello Category');
				category.post = post;
				post.title = 'Updated post';
				await connection.manager.save(category);

				// save once again, just for fun
				await connection.manager.save(category);

				const loadedCategory1 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory1).not.to.be.undefined;
				loadedCategory1!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Updated post' },
				});

				// update post from loaded category
				(loadedCategory1!.post as Post).title = 'Again Updated post';
				await connection.manager.save(loadedCategory1);

				const loadedCategory2 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory2).not.to.be.undefined;
				loadedCategory2!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Again Updated post' },
				});
			}),
		));

	it('should NOT remove exist post by cascades when category is saved without a post (post is set to undefined)', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				await connection.manager.save(post);

				// update exist post from newly created category
				const category = new Category(1, 'Hello Category');
				category.post = post;
				await connection.manager.save(category);

				// load and check if it was correctly saved
				const loadedCategory1 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory1).not.to.be.undefined;
				loadedCategory1!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});

				// remove post from loaded category
				loadedCategory1!.post = undefined;
				await connection.manager.save(loadedCategory1);

				const loadedCategory2 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory2).not.to.be.undefined;
				loadedCategory2!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});

				const loadedPost = await connection.manager.findOne(Post, {
					where: {
						id: 1,
					},
				});
				expect(loadedPost).not.to.be.undefined;
				loadedPost!.should.be.eql({ id: 1, title: 'Hello Post' });
			}),
		));

	it('should unset exist post when its set to null', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				await connection.manager.save(post);

				// update exist post from newly created category
				const category = new Category(1, 'Hello Category');
				category.post = post;
				await connection.manager.save(category);

				const loadedCategory1 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory1).not.to.be.undefined;
				loadedCategory1!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});

				// remove post from loaded category
				loadedCategory1!.post = null;
				await connection.manager.save(loadedCategory1);

				const loadedCategory2 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory2).not.to.be.undefined;
				loadedCategory2!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: null,
				});
			}),
		));

	it("should set category's post to NULL when post is removed from the database (database ON DELETE)", () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post(1, 'Hello Post');
				await connection.manager.save(post);

				// update exist post from newly created category
				const category = new Category(1, 'Hello Category');
				category.post = post;
				await connection.manager.save(category);

				const loadedCategory1 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory1).not.to.be.undefined;
				loadedCategory1!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post' },
				});

				// remove post from loaded category
				await connection.manager.remove(post);

				// now lets load category and make sure post isn't set there
				const loadedCategory2 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory2).not.to.be.undefined;
				loadedCategory2!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: null,
				});
			}),
		));

	it('should work when relation id is directly set into relation (without related object)', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post1 = new Post(1, 'Hello Post #1');
				await connection.manager.save(post1);

				const post2 = new Post(2, 'Hello Post #2');
				await connection.manager.save(post2);

				// update exist post from newly created category
				const category = new Category(1, 'Hello Category');
				category.post = 1;
				await connection.manager.save(category);

				// check if category is saved with post set
				const loadedCategory1 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory1).not.to.be.undefined;
				loadedCategory1!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 1, title: 'Hello Post #1' },
				});

				// now update a category with another post
				category.post = 2;
				await connection.manager.save(category);

				// and check again if category is saved with new post
				const loadedCategory2 = await connection.manager.findOne(Category, {
					where: {
						id: 1,
					},
					relations: {
						post: true,
					},
				});
				expect(loadedCategory2).not.to.be.undefined;
				loadedCategory2!.should.be.eql({
					id: 1,
					name: 'Hello Category',
					post: { id: 2, title: 'Hello Post #2' },
				});
			}),
		));
});
