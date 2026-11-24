import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../../utils/test-utils';
import { DataSource } from '../../../../../../src/data-source/DataSource';
import { Tag } from './entity/Tag';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { Image } from './entity/Image';

describe('query builder > relation-id > many-to-many > basic-functionality', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not load ids when RelationId decorator is not specified', () =>
		Promise.all(
			connections.map(async (connection) => {
				const tag = new Tag();
				tag.name = 'kids';
				await connection.manager.save(tag);

				const category1 = new Category();
				category1.name = 'kids';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'future';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'cars';
				await connection.manager.save(category3);

				const post = new Post();
				post.title = 'about kids';
				post.categories = [category1, category2];
				post.tag = tag;
				await connection.manager.save(post);

				const post2 = new Post();
				post2.title = 'about BMW';
				post2.categories = [category3];
				post2.tag = tag;
				await connection.manager.save(post2);

				let loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.tag', 'tag')
					.leftJoinAndSelect('post.categories', 'categories')
					.addOrderBy('post.id, tag.id, categories.id')
					.getMany();

				expect(loadedPosts![0].tag).to.not.be.undefined;
				expect(loadedPosts![0].tagId).to.be.undefined;
				expect(loadedPosts![0].categories).to.not.be.eql([]);
				expect(loadedPosts![0].categoryIds).to.be.undefined;
				expect(loadedPosts![1].tag).to.not.be.undefined;
				expect(loadedPosts![1].tagId).to.be.undefined;
				expect(loadedPosts![1].categories).to.not.be.eql([]);
				expect(loadedPosts![1].categoryIds).to.be.undefined;

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.tag', 'tag')
					.leftJoinAndSelect('post.categories', 'categories')
					.addOrderBy('post.id, tag.id, categories.id')
					.where('post.id = :id', { id: post.id })
					.getOne();

				expect(loadedPost!.tag).to.not.be.undefined;
				expect(loadedPost!.tagId).to.be.undefined;
				expect(loadedPost!.categories).to.not.be.eql([]);
				expect(loadedPost!.categoryIds).to.be.undefined;
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany owner side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'kids';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'future';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about kids';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				const post2 = new Post();
				post2.title = 'about kids';
				post2.categories = [category1, category2];
				await connection.manager.save(post2);

				let loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryIds', 'post.categories')
					.getMany();

				expect(loadedPosts![0].categoryIds).to.not.be.undefined;
				expect(loadedPosts![0].categoryIds[0]).to.be.equal(1);
				expect(loadedPosts![0].categoryIds[1]).to.be.equal(2);
				expect(loadedPosts![1].categoryIds).to.not.be.undefined;
				expect(loadedPosts![1].categoryIds[0]).to.be.equal(1);
				expect(loadedPosts![1].categoryIds[1]).to.be.equal(2);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryIds', 'post.categories')
					.where('post.id = :id', { id: post.id })
					.getOne();

				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
				expect(loadedPost!.categoryIds[1]).to.be.equal(2);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany owner side without inverse side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'kids';

				const category2 = new Category();
				category2.name = 'future';

				await connection.manager.save(category1);
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about kids';
				post.subcategories = [category1, category2];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryIds', 'post.subcategories')
					.where('post.id = :id', { id: post.id })
					.getOne();

				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
				expect(loadedPost!.categoryIds[1]).to.be.equal(2);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany inverse side', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'cars';
				await connection.manager.save(category);

				const post1 = new Post();
				post1.title = 'about BMW';
				post1.categories = [category];

				const post2 = new Post();
				post2.title = 'about Audi';
				post2.categories = [category];

				await connection.manager.save(post1);
				await connection.manager.save(post2);

				let loadedCategory = await connection.manager
					.createQueryBuilder(Category, 'category')
					.loadRelationIdAndMap('category.postIds', 'category.posts')
					.where('category.id = :id', { id: category.id })
					.getOne();

				expect(loadedCategory!.postIds).to.not.be.undefined;
				expect(loadedCategory!.postIds[0]).to.be.equal(1);
				expect(loadedCategory!.postIds[1]).to.be.equal(2);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany owning side with additional condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'kids';

				const category2 = new Category();
				category2.name = 'future';

				await connection.manager.save(category1);
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about kids';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'categories', (qb) =>
						qb.andWhere('categories.id = :categoryId', {
							categoryId: 1,
						}),
					)
					.getOne();

				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds.length).to.be.equal(1);
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany owning side without inverse side and with additional condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'kids';

				const category2 = new Category();
				category2.name = 'future';

				await connection.manager.save(category1);
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about kids';
				post.subcategories = [category1, category2];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryIds', 'post.subcategories', 'subCategories', (qb) =>
						qb.andWhere('subCategories.id = :categoryId', {
							categoryId: 1,
						}),
					)
					.getOne();

				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds.length).to.be.equal(1);
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on ManyToMany inverse side with additional condition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category = new Category();
				category.name = 'cars';
				await connection.manager.save(category);

				const post1 = new Post();
				post1.title = 'about BMW';
				post1.categories = [category];

				const post2 = new Post();
				post2.title = 'about Audi';
				post2.categories = [category];

				await connection.manager.save(post1);
				await connection.manager.save(post2);

				let loadedCategory = await connection.manager
					.createQueryBuilder(Category, 'category')
					.loadRelationIdAndMap('category.postIds', 'category.posts', 'posts', (qb) =>
						qb.andWhere('posts.id = :postId', { postId: 1 }),
					)
					.where('category.id = :id', { id: category.id })
					.getOne();

				expect(loadedCategory!.postIds).to.not.be.undefined;
				expect(loadedCategory!.postIds.length).to.be.equal(1);
				expect(loadedCategory!.postIds[0]).to.be.equal(1);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on nested relation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.name = 'photo1';

				const image2 = new Image();
				image2.name = 'photo2';

				await connection.manager.save(image1);
				await connection.manager.save(image2);

				const category1 = new Category();
				category1.name = 'cars';
				category1.images = [image1, image2];
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about BMW';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.loadRelationIdAndMap('post.categoryIds', 'post.categories')
					.loadRelationIdAndMap('categories.imageIds', 'categories.images')
					.where('post.id = :id', { id: post.id })
					.addOrderBy('post.id, categories.id')
					.getOne();

				expect(loadedPost!.categories).to.not.be.eql([]);
				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds.length).to.be.equal(2);
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
				expect(loadedPost!.categoryIds[1]).to.be.equal(2);
				expect(loadedPost!.categories[0].imageIds).to.not.be.eql([]);
				expect(loadedPost!.categories[0].imageIds.length).to.be.equal(2);
				expect(loadedPost!.categories[0].imageIds[0]).to.be.equal(1);
				expect(loadedPost!.categories[0].imageIds[1]).to.be.equal(2);
			}),
		));

	it('should load ids when loadRelationIdAndMap used on nested relation with additional conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.name = 'photo1';

				const image2 = new Image();
				image2.name = 'photo2';

				await connection.manager.save(image1);
				await connection.manager.save(image2);

				const category1 = new Category();
				category1.name = 'cars';
				category1.images = [image1, image2];
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const post = new Post();
				post.title = 'about BMW';
				post.categories = [category1, category2];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'categories2', (qb) =>
						qb.andWhere('categories2.id = :categoryId', {
							categoryId: 1,
						}),
					)
					.loadRelationIdAndMap('categories.imageIds', 'categories.images', 'images', (qb) =>
						qb.andWhere('images.id = :imageId', { imageId: 1 }),
					)
					.where('post.id = :id', { id: post.id })
					.addOrderBy('post.id, categories.id')
					.getOne();

				expect(loadedPost!.categories).to.not.be.eql([]);
				expect(loadedPost!.categoryIds).to.not.be.undefined;
				expect(loadedPost!.categoryIds.length).to.be.equal(1);
				expect(loadedPost!.categoryIds[0]).to.be.equal(1);
				expect(loadedPost!.categories[0].imageIds).to.not.be.eql([]);
				expect(loadedPost!.categories[0].imageIds.length).to.be.equal(1);
				expect(loadedPost!.categories[0].imageIds[0]).to.be.equal(1);
			}),
		));

	it('should not load ids of nested relations when loadRelationIdAndMap used on inherit relation and parent relation was not found', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.name = 'photo1';

				const image2 = new Image();
				image2.name = 'photo2';

				await connection.manager.save(image1);
				await connection.manager.save(image2);

				const category1 = new Category();
				category1.name = 'cars';
				category1.images = [image1, image2];
				await connection.manager.save(category1);

				const post = new Post();
				post.title = 'about BMW';
				post.categories = [category1];
				await connection.manager.save(post);

				let loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories', 'categories.id = :categoryId')
					.loadRelationIdAndMap('categories.imageIds', 'categories.images')
					.where('post.id = :id', { id: post.id })
					.setParameter('categoryId', 2)
					.addOrderBy('post.id, categories.id')
					.getOne();

				expect(loadedPost!.categories).to.be.eql([]);
			}),
		));
});
