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
import { Image } from './entity/Image';
import { PostCategory } from './entity/PostCategory';

describe('query builder > relation-id > many-to-one > basic-functionality', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load ids when loadRelationIdAndMap used', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'cars';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const categoryByName1 = new Category();
				categoryByName1.name = 'BMW';
				await connection.manager.save(categoryByName1);

				const categoryByName2 = new Category();
				categoryByName2.name = 'Boeing';
				await connection.manager.save(categoryByName2);

				const post1 = new Post();
				post1.title = 'about BWM';
				post1.category = category1;
				post1.categoryByName = categoryByName1;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'about Boeing';
				post2.category = category2;
				post2.categoryByName = categoryByName2;
				await connection.manager.save(post2);

				let loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.loadRelationIdAndMap('post.categoryName', 'post.categoryByName')
					.addOrderBy('post.id')
					.getMany();

				expect(loadedPosts![0].categoryId).to.not.be.undefined;
				expect(loadedPosts![0].categoryId).to.be.equal(1);
				expect(loadedPosts![0].categoryName).to.not.be.undefined;
				expect(loadedPosts![0].categoryName).to.be.equal('BMW');
				expect(loadedPosts![1].categoryId).to.not.be.undefined;
				expect(loadedPosts![1].categoryId).to.be.equal(2);
				expect(loadedPosts![1].categoryName).to.not.be.undefined;
				expect(loadedPosts![1].categoryName).to.be.equal('Boeing');

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.loadRelationIdAndMap('post.categoryName', 'post.categoryByName')
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost!.categoryId).to.not.be.undefined;
				expect(loadedPost!.categoryId).to.be.equal(1);
				expect(loadedPost!.categoryName).to.not.be.undefined;
				expect(loadedPost!.categoryName).to.be.equal('BMW');
			}),
		));

	it('should load ids when loadRelationIdAndMap used and target entity has multiple primary keys', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'cars';
				await connection.manager.save(category);

				const post = new Post();
				post.title = 'about cars';
				await connection.manager.save(post);

				const postCategory = new PostCategory();
				postCategory.category = category;
				postCategory.post = post;
				await connection.manager.save(postCategory);

				let loadedPostCategory = await connection.manager
					.createQueryBuilder(PostCategory, 'postCategory')
					.loadRelationIdAndMap('postCategory.postId', 'postCategory.post')
					.loadRelationIdAndMap('postCategory.categoryId', 'postCategory.category')
					.getOne();

				expect(loadedPostCategory!.categoryId).to.not.be.undefined;
				expect(loadedPostCategory!.categoryId).to.be.equal(1);
				expect(loadedPostCategory!.postId).to.not.be.undefined;
				expect(loadedPostCategory!.postId).to.be.equal(1);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on nested relation and target entity has multiple primary keys', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'cars';
				await connection.manager.save(category);

				const post = new Post();
				post.title = 'about cars';
				await connection.manager.save(post);

				const image = new Image();
				image.name = 'image #1';
				await connection.manager.save(image);

				const postCategory = new PostCategory();
				postCategory.category = category;
				postCategory.post = post;
				postCategory.image = image;
				await connection.manager.save(postCategory);

				let loadedPostCategory = await connection.manager
					.createQueryBuilder(PostCategory, 'postCategory')
					.loadRelationIdAndMap('postCategory.imageId', 'postCategory.image')
					.getOne();
				expect(loadedPostCategory!.imageId).to.not.be.undefined;
				expect(loadedPostCategory!.imageId).to.be.equal(1);
			}),
		));
});
