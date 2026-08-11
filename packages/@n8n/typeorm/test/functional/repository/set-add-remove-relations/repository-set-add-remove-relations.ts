import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';

// todo: fix this test later
describe.skip('repository > set/add/remove relation methods', function () {
	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------

	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	// -------------------------------------------------------------------------
	// Specifications
	// -------------------------------------------------------------------------

	it('add elements to many-to-many from owner side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newCategory1 = categoryRepository.create();
				newCategory1.name = 'Animals';
				await categoryRepository.save(newCategory1);

				// save a new category
				const newCategory2 = categoryRepository.create();
				newCategory2.name = 'Kids';
				await categoryRepository.save(newCategory2);

				// save a new post
				const newPost = postRepository.create();
				newPost.title = 'Super post';
				await postRepository.save(newPost);

				// add categories to a post
				// await postSpecificRepository.addToRelation(post => post.manyCategories, newPost.id, [newCategory1.id, newCategory2.id]);

				// load a post, want to have categories count
				const loadedPost = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							manyCategories: 'post.manyCategories',
						},
					},
				});

				expect(loadedPost!).not.to.be.null;
				expect(loadedPost!.manyCategories).not.to.be.undefined;
				expect(loadedPost!.manyCategories![0]).not.to.be.undefined;
				expect(loadedPost!.manyCategories![1]).not.to.be.undefined;
			}),
		));

	it('add elements to many-to-many from inverse side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new post
				const newPost1 = postRepository.create();
				newPost1.title = 'post #1';
				await postRepository.save(newPost1);

				// save a new post
				const newPost2 = postRepository.create();
				newPost2.title = 'post #2';
				await postRepository.save(newPost2);

				// save a new category
				const newCategory = categoryRepository.create();
				newCategory.name = 'Kids';
				await categoryRepository.save(newCategory);

				// add categories to a post
				// await categorySpecificRepository.addToRelation(category => category.manyPosts, newCategory.id, [newPost1.id, newPost2.id]);

				// load a post, want to have categories count
				const loadedCategory = await categoryRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'category',
						leftJoinAndSelect: { manyPosts: 'category.manyPosts' },
					},
				});

				expect(loadedCategory).not.to.be.null;
				expect(loadedCategory!.manyPosts).not.to.be.undefined;
				expect(loadedCategory!.manyPosts![0]).not.to.be.undefined;
				expect(loadedCategory!.manyPosts![1]).not.to.be.undefined;
			}),
		));

	it('remove elements to many-to-many from owner side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newCategory1 = categoryRepository.create();
				newCategory1.name = 'Animals';
				await categoryRepository.save(newCategory1);

				// save a new category
				const newCategory2 = categoryRepository.create();
				newCategory2.name = 'Kids';
				await categoryRepository.save(newCategory2);

				// save a new category
				const newCategory3 = categoryRepository.create();
				newCategory3.name = 'Adults';
				await categoryRepository.save(newCategory3);

				// save a new post with categories
				const newPost = postRepository.create();
				newPost.title = 'Super post';
				newPost.manyCategories = [newCategory1, newCategory2, newCategory3];
				await postRepository.save(newPost);

				// add categories to a post
				// await postSpecificRepository.removeFromRelation(post => post.manyCategories, newPost.id, [newCategory1.id, newCategory3.id]);

				// load a post, want to have categories count
				const loadedPost = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: {
							manyCategories: 'post.manyCategories',
						},
					},
				});

				expect(loadedPost!).not.to.be.null;
				expect(loadedPost!.manyCategories).not.to.be.undefined;
				loadedPost!.manyCategories.length.should.be.equal(1);
				loadedPost!.manyCategories![0].name.should.be.equal('Kids');
			}),
		));

	it('remove elements to many-to-many from inverse side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newPost1 = postRepository.create();
				newPost1.title = 'post #1';
				await postRepository.save(newPost1);

				// save a new category
				const newPost2 = postRepository.create();
				newPost2.title = 'post #2';
				await postRepository.save(newPost2);

				// save a new category
				const newPost3 = postRepository.create();
				newPost3.title = 'post #3';
				await postRepository.save(newPost3);

				// save a new post with categories
				const newCategory = categoryRepository.create();
				newCategory.name = 'SuperCategory';
				newCategory.manyPosts = [newPost1, newPost2, newPost3];
				await categoryRepository.save(newCategory);

				// add categories to a post
				// await categorySpecificRepository.removeFromRelation(post => post.manyPosts, newCategory.id, [newPost1.id, newPost3.id]);

				// load a post, want to have categories count
				const loadedCategory = await categoryRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'category',
						leftJoinAndSelect: { manyPosts: 'category.manyPosts' },
					},
				});

				expect(loadedCategory!).not.to.be.null;
				expect(loadedCategory!.manyPosts).not.to.be.undefined;
				loadedCategory!.manyPosts.length.should.be.equal(1);
				loadedCategory!.manyPosts[0].title.should.be.equal('post #2');
			}),
		));

	// todo: fix this test later
	it('set element to one-to-many relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newCategory1 = categoryRepository.create();
				newCategory1.name = 'Animals';
				await categoryRepository.save(newCategory1);

				// save a new post
				const newPost = postRepository.create();
				newPost.title = 'Super post';
				await postRepository.save(newPost);

				// add categories to a post
				// await postSpecificRepository.setRelation(post => post.categories, newPost.id, newCategory1.id);

				// load a post, want to have categories count
				const loadedPost = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: { categories: 'post.categories' },
					},
				});

				expect(loadedPost!).not.to.be.null;
				expect(loadedPost!.categories).not.to.be.undefined;
				expect(loadedPost!.categories![0]).not.to.be.undefined;
			}),
		));

	it('set element to many-to-one relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newPost = postRepository.create();
				newPost.title = 'post #1';
				await postRepository.save(newPost);

				// save a new category
				const newCategory = categoryRepository.create();
				newCategory.name = 'Kids';
				await categoryRepository.save(newCategory);

				// add categories to a post
				// await categorySpecificRepository.setRelation(category => category.post, newCategory.id, newPost.id);

				// load a post, want to have categories count
				const loadedCategory = await categoryRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'category',
						leftJoinAndSelect: { post: 'category.post' },
					},
				});

				expect(loadedCategory!).not.to.be.null;
				expect(loadedCategory!.post).not.to.be.undefined;
			}),
		));

	it('set element to NULL in one-to-many relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newCategory1 = categoryRepository.create();
				newCategory1.name = 'Animals';
				await categoryRepository.save(newCategory1);

				// save a new post
				const newPost = postRepository.create();
				newPost.title = 'Super post';
				newPost.categories = [newCategory1];
				await postRepository.save(newPost);

				// add categories to a post
				// await postSpecificRepository.setRelation(post => post.categories, newPost.id, null);

				// load a post, want to have categories count
				const loadedPost = await postRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'post',
						leftJoinAndSelect: { categories: 'post.categories' },
					},
				});

				expect(loadedPost!).not.to.be.null;
				expect(loadedPost!.categories).to.be.eql([]);
			}),
		));

	it('set element to NULL in many-to-one relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);
				const categoryRepository = connection.getRepository(Category);

				// save a new category
				const newPost = postRepository.create();
				newPost.title = 'post #1';
				await postRepository.save(newPost);

				// save a new category
				const newCategory = categoryRepository.create();
				newCategory.name = 'Kids';
				newCategory.post = newPost;
				await categoryRepository.save(newCategory);

				// add categories to a post
				// await categorySpecificRepository.setRelation(category => category.post, newCategory.id, null);

				// load a post, want to have categories count
				const loadedCategory = await categoryRepository.findOne({
					where: {
						id: 1,
					},
					join: {
						alias: 'category',
						leftJoinAndSelect: { post: 'category.post' },
					},
				});

				expect(loadedCategory).not.to.be.null;
				expect(loadedCategory!.post).to.be.undefined;
			}),
		));
});
