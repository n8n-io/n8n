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

describe('query builder > relation-id > many-to-many > multiple-pk', () => {
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
		it('should load ids when both entities have multiple primary keys', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 2;
					category2.name = 'BMW';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 1;
					category3.name = 'airplanes';
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.id = 4;
					category4.code = 2;
					category4.name = 'Boeing';
					await connection.manager.save(category4);

					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					post1.categories = [category1, category2];
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.title = 'About Boeing';
					post2.categories = [category3, category4];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPosts[0].categoryIds[1]).to.be.eql({
						id: 2,
						code: 2,
					});
					expect(loadedPosts[1].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[1].categoryIds[0]).to.be.eql({
						id: 3,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds[1]).to.be.eql({
						id: 4,
						code: 2,
					});

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories')
						.where('post.id = :id', { id: 1 })
						.andWhere('post.authorId = :authorId', { authorId: 1 })
						.getOne();

					expect(loadedPost!.categoryIds).to.not.be.eql([]);
					expect(loadedPost!.categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPost!.categoryIds[1]).to.be.eql({
						id: 2,
						code: 2,
					});
				}),
			));

		it('should load ids when only one entity have multiple primary key', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'Image #1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'Image #2';
					await connection.manager.save(image2);

					const image3 = new Image();
					image3.name = 'Image #3';
					await connection.manager.save(image3);

					const image4 = new Image();
					image4.name = 'Image #4';
					await connection.manager.save(image4);

					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					category1.images = [image1, image2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 2;
					category2.name = 'airplanes';
					category2.images = [image3, image4];
					await connection.manager.save(category2);

					const loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.imageIds', 'category.images')
						.addOrderBy('category.id')
						.getMany();

					expect(loadedCategories[0].imageIds).to.not.be.eql([]);
					expect(loadedCategories[0].imageIds[0]).to.be.equal(1);
					expect(loadedCategories[0].imageIds[1]).to.be.equal(2);
					expect(loadedCategories[1].imageIds).to.not.be.eql([]);
					expect(loadedCategories[1].imageIds[0]).to.be.equal(3);
					expect(loadedCategories[1].imageIds[1]).to.be.equal(4);

					const loadedCategory = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.imageIds', 'category.images')
						.where('category.id = :id', { id: 1 })
						.andWhere('category.code = :code', { code: 1 })
						.getOne();

					expect(loadedCategory!.imageIds).to.not.be.eql([]);
					expect(loadedCategory!.imageIds[0]).to.be.equal(1);
					expect(loadedCategory!.imageIds[1]).to.be.equal(2);
				}),
			));

		it('should load ids when both entities have multiple primary keys and additional condition used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.isRemoved = true;
					category2.name = 'BMW';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 1;
					category3.name = 'airplanes';
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.id = 4;
					category4.code = 2;
					category4.isRemoved = true;
					category4.name = 'Boeing';
					await connection.manager.save(category4);

					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					post1.categories = [category1, category2];
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.title = 'About Boeing';
					post2.categories = [category3, category4];
					await connection.manager.save(post2);

					let loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'category', (qb) =>
							qb.andWhere('category.id = :id AND category.code = :code', { id: 1, code: 1 }),
						)
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds).to.be.eql([]);

					loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'category', (qb) =>
							qb.andWhere('category.code = :code', {
								code: 1,
							}),
						)
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPosts[0].categoryIds[1]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[1].categoryIds[0]).to.be.eql({
						id: 3,
						code: 1,
					});

					loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'category', (qb) =>
							qb.andWhere('category.isRemoved = :isRemoved', {
								isRemoved: true,
							}),
						)
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[1].categoryIds[0]).to.be.eql({
						id: 4,
						code: 2,
					});

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories', 'category', (qb) =>
							qb.andWhere('category.isRemoved = :isRemoved', {
								isRemoved: true,
							}),
						)
						.where('post.id = :id', { id: 1 })
						.andWhere('post.authorId = :authorId', { authorId: 1 })
						.getOne();

					expect(loadedPost!.categoryIds).to.not.be.eql([]);
					expect(loadedPost!.categoryIds[0]).to.be.eql({
						id: 2,
						code: 1,
					});
				}),
			));

		it('should load ids when both entities have multiple primary keys and related entity does not have inverse side', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 2;
					category2.name = 'BMW';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 1;
					category3.name = 'airplanes';
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.id = 4;
					category4.code = 2;
					category4.name = 'Boeing';
					await connection.manager.save(category4);

					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					post1.subcategories = [category1, category2];
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.title = 'About Boeing';
					post2.subcategories = [category3, category4];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.subcategories')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPosts[0].categoryIds[1]).to.be.eql({
						id: 2,
						code: 2,
					});
					expect(loadedPosts[1].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[1].categoryIds[0]).to.be.eql({
						id: 3,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds[1]).to.be.eql({
						id: 4,
						code: 2,
					});

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.subcategories')
						.where('post.id = :id', { id: 1 })
						.andWhere('post.authorId = :authorId', { authorId: 1 })
						.getOne();

					expect(loadedPost!.categoryIds).to.not.be.eql([]);
					expect(loadedPost!.categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPost!.categoryIds[1]).to.be.eql({
						id: 2,
						code: 2,
					});
				}),
			));

		it('should load ids when loadRelationIdAndMap used on nested relation', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'Image #1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'Image #2';
					await connection.manager.save(image2);

					const image3 = new Image();
					image3.name = 'Image #3';
					await connection.manager.save(image3);

					const image4 = new Image();
					image4.name = 'Image #4';
					await connection.manager.save(image4);

					const image5 = new Image();
					image5.name = 'Image #5';
					await connection.manager.save(image5);

					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					category1.images = [image1, image2, image3];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.name = 'airplanes';
					category2.images = [image4, image5];
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 2;
					category3.name = 'Boeing';
					category3.images = [image5];
					await connection.manager.save(category3);

					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					post1.categories = [category1];
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.title = 'About Boeing';
					post2.categories = [category2, category3];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories')
						.leftJoinAndSelect('post.categories', 'category')
						.loadRelationIdAndMap('category.imageIds', 'category.images')
						.addOrderBy('post.id, category.id')
						.getMany();

					expect(loadedPosts[0].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[0].categoryIds.length).to.be.equal(1);
					expect(loadedPosts[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPosts[0].categories).to.not.be.eql([]);
					expect(loadedPosts[0].categories[0].imageIds).to.not.be.eql([]);
					expect(loadedPosts[0].categories[0].imageIds.length).to.be.equal(3);
					expect(loadedPosts[0].categories[0].imageIds[0]).to.be.equal(1);
					expect(loadedPosts[0].categories[0].imageIds[1]).to.be.equal(2);
					expect(loadedPosts[0].categories[0].imageIds[2]).to.be.equal(3);
					expect(loadedPosts[1].categoryIds).to.not.be.eql([]);
					expect(loadedPosts[1].categoryIds.length).to.be.equal(2);
					expect(loadedPosts[1].categoryIds[0]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedPosts[1].categoryIds[1]).to.be.eql({
						id: 3,
						code: 2,
					});
					expect(loadedPosts[1].categories).to.not.be.eql([]);
					expect(loadedPosts[1].categories.length).to.be.equal(2);
					expect(loadedPosts[1].categories[0].imageIds).to.not.be.eql([]);
					expect(loadedPosts[1].categories[0].imageIds.length).to.be.equal(2);
					expect(loadedPosts[1].categories[0].imageIds[0]).to.be.equal(4);
					expect(loadedPosts[1].categories[0].imageIds[1]).to.be.equal(5);
					expect(loadedPosts[1].categories[1].imageIds).to.not.be.eql([]);
					expect(loadedPosts[1].categories[1].imageIds.length).to.be.equal(1);
					expect(loadedPosts[1].categories[1].imageIds[0]).to.be.equal(5);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.loadRelationIdAndMap('post.categoryIds', 'post.categories')
						.leftJoinAndSelect('post.categories', 'category')
						.loadRelationIdAndMap('category.imageIds', 'category.images')
						.where('post.id = :id', { id: 1 })
						.andWhere('post.authorId = :authorId', { authorId: 1 })
						.getOne();

					expect(loadedPost!.categoryIds).to.not.be.eql([]);
					expect(loadedPost!.categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories[0].imageIds).to.not.be.eql([]);
					expect(loadedPost!.categories[0].imageIds.length).to.be.equal(3);
					expect(loadedPost!.categories[0].imageIds[0]).to.be.equal(1);
					expect(loadedPost!.categories[0].imageIds[1]).to.be.equal(2);
					expect(loadedPost!.categories[0].imageIds[2]).to.be.equal(3);
				}),
			));
	});

	describe('inverse side', () => {
		it('should load ids when both entities have multiple primary keys', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 2;
					post2.title = 'About Audi';
					await connection.manager.save(post2);

					const post3 = new Post();
					post3.id = 3;
					post3.authorId = 1;
					post3.title = 'About Boeing';
					await connection.manager.save(post3);

					const post4 = new Post();
					post4.id = 4;
					post4.authorId = 2;
					post4.title = 'About Airbus';
					await connection.manager.save(post4);

					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					category1.posts = [post1, post2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.name = 'airplanes';
					category2.posts = [post3, post4];
					await connection.manager.save(category2);

					const loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.addOrderBy('category.id')
						.getMany();

					expect(loadedCategories[0].postIds).to.not.be.eql([]);
					expect(loadedCategories[0].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedCategories[0].postIds[1]).to.be.eql({
						id: 2,
						authorId: 2,
					});
					expect(loadedCategories[1].postIds).to.not.be.eql([]);
					expect(loadedCategories[1].postIds[0]).to.be.eql({
						id: 3,
						authorId: 1,
					});
					expect(loadedCategories[1].postIds[1]).to.be.eql({
						id: 4,
						authorId: 2,
					});

					const loadedCategory = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.where('category.id = :id', { id: 1 })
						.andWhere('category.code = :code', { code: 1 })
						.getOne();

					expect(loadedCategory!.postIds).to.not.be.eql([]);
					expect(loadedCategory!.postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedCategory!.postIds[1]).to.be.eql({
						id: 2,
						authorId: 2,
					});
				}),
			));

		it('should load ids when only one entity have multiple primary key', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'category #1';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.name = 'category #2';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 2;
					category3.name = 'category #3';
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.id = 4;
					category4.code = 2;
					category4.name = 'category #4';
					await connection.manager.save(category4);

					const image1 = new Image();
					image1.name = 'Image #1';
					image1.categories = [category1, category2];
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'Image #2';
					image2.categories = [category3, category4];
					await connection.manager.save(image2);

					const loadedImages = await connection.manager
						.createQueryBuilder(Image, 'image')
						.loadRelationIdAndMap('image.categoryIds', 'image.categories')
						.addOrderBy('image.id')
						.getMany();

					expect(loadedImages[0].categoryIds).to.not.be.eql([]);
					expect(loadedImages[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedImages[0].categoryIds[1]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedImages[1].categoryIds).to.not.be.eql([]);
					expect(loadedImages[1].categoryIds[0]).to.be.eql({
						id: 3,
						code: 2,
					});
					expect(loadedImages[1].categoryIds[1]).to.be.eql({
						id: 4,
						code: 2,
					});

					const loadedImage = await connection.manager
						.createQueryBuilder(Image, 'image')
						.loadRelationIdAndMap('image.categoryIds', 'image.categories')
						.where('image.id = :id', { id: 1 })
						.getOne();

					expect(loadedImage!.categoryIds).to.not.be.eql([]);
					expect(loadedImage!.categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedImage!.categoryIds[1]).to.be.eql({
						id: 2,
						code: 1,
					});
				}),
			));

		it('should load ids when both entities have multiple primary keys and additional condition used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.isRemoved = true;
					post2.title = 'About Audi';
					await connection.manager.save(post2);

					const post3 = new Post();
					post3.id = 3;
					post3.authorId = 1;
					post3.title = 'About Boeing';
					await connection.manager.save(post3);

					const post4 = new Post();
					post4.id = 4;
					post4.authorId = 2;
					post4.isRemoved = true;
					post4.title = 'About Airbus';
					await connection.manager.save(post4);

					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					category1.posts = [post1, post2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.name = 'airplanes';
					category2.posts = [post3, post4];
					await connection.manager.save(category2);

					let loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts', 'post', (qb) =>
							qb.andWhere('post.id = :id AND post.authorId = :authorId', { id: 1, authorId: 1 }),
						)
						.addOrderBy('category.id')
						.getMany();

					expect(loadedCategories[0].postIds).to.not.be.eql([]);
					expect(loadedCategories[0].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedCategories[1].postIds).to.be.eql([]);

					loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts', 'post', (qb) =>
							qb.andWhere('post.authorId = :authorId', {
								authorId: 1,
							}),
						)
						.addOrderBy('category.id')
						.getMany();

					expect(loadedCategories[0].postIds).to.not.be.eql([]);
					expect(loadedCategories[0].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedCategories[0].postIds[1]).to.be.eql({
						id: 2,
						authorId: 1,
					});
					expect(loadedCategories[1].postIds).to.not.be.eql([]);
					expect(loadedCategories[1].postIds[0]).to.be.eql({
						id: 3,
						authorId: 1,
					});

					loadedCategories = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts', 'post', (qb) =>
							qb.andWhere('post.isRemoved = :isRemoved', {
								isRemoved: true,
							}),
						)
						.addOrderBy('category.id')
						.getMany();

					expect(loadedCategories[0].postIds).to.not.be.eql([]);
					expect(loadedCategories[0].postIds[0]).to.be.eql({
						id: 2,
						authorId: 1,
					});
					expect(loadedCategories[1].postIds).to.not.be.eql([]);
					expect(loadedCategories[1].postIds[0]).to.be.eql({
						id: 4,
						authorId: 2,
					});

					const loadedCategory = await connection.manager
						.createQueryBuilder(Category, 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts', 'post', (qb) =>
							qb.andWhere('post.isRemoved = :isRemoved', {
								isRemoved: true,
							}),
						)
						.where('category.id = :id', { id: 1 })
						.andWhere('category.code = :code', { code: 1 })
						.getOne();

					expect(loadedCategory!.postIds).to.not.be.eql([]);
					expect(loadedCategory!.postIds[0]).to.be.eql({
						id: 2,
						authorId: 1,
					});
				}),
			));

		it('should load ids when loadRelationIdAndMap used on nested relation', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post1 = new Post();
					post1.id = 1;
					post1.authorId = 1;
					post1.title = 'About BMW';
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.id = 2;
					post2.authorId = 1;
					post2.title = 'About Audi';
					await connection.manager.save(post2);

					const post3 = new Post();
					post3.id = 3;
					post3.authorId = 1;
					post3.title = 'About Boeing';
					await connection.manager.save(post3);

					const post4 = new Post();
					post4.id = 4;
					post4.authorId = 2;
					post4.title = 'About Airbus';
					await connection.manager.save(post4);

					const category1 = new Category();
					category1.id = 1;
					category1.code = 1;
					category1.name = 'cars';
					category1.posts = [post1, post2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.id = 2;
					category2.code = 1;
					category2.name = 'BMW';
					category2.posts = [post1];
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.id = 3;
					category3.code = 2;
					category3.name = 'airplanes';
					category3.posts = [post3, post4];
					await connection.manager.save(category3);

					const image1 = new Image();
					image1.name = 'Image #1';
					image1.categories = [category1, category2];
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'Image #2';
					image2.categories = [category3];
					await connection.manager.save(image2);

					const loadedImages = await connection.manager
						.createQueryBuilder(Image, 'image')
						.loadRelationIdAndMap('image.categoryIds', 'image.categories')
						.leftJoinAndSelect('image.categories', 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.orderBy('category.id')
						.getMany();

					expect(loadedImages[0].categoryIds).to.not.be.eql([]);
					expect(loadedImages[0].categoryIds.length).to.be.equal(2);
					expect(loadedImages[0].categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedImages[0].categoryIds[1]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedImages[0].categories).to.not.be.eql([]);
					expect(loadedImages[0].categories.length).to.be.equal(2);
					expect(loadedImages[0].categories[0].postIds).to.not.be.eql([]);
					expect(loadedImages[0].categories[0].postIds.length).to.be.equal(2);
					expect(loadedImages[0].categories[0].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedImages[0].categories[0].postIds[1]).to.be.eql({
						id: 2,
						authorId: 1,
					});
					expect(loadedImages[0].categories[1].postIds).to.not.be.eql([]);
					expect(loadedImages[0].categories[1].postIds.length).to.be.equal(1);
					expect(loadedImages[0].categories[1].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedImages[1].categoryIds).to.not.be.eql([]);
					expect(loadedImages[1].categoryIds.length).to.be.equal(1);
					expect(loadedImages[1].categoryIds[0]).to.be.eql({
						id: 3,
						code: 2,
					});
					expect(loadedImages[1].categories).to.not.be.eql([]);
					expect(loadedImages[1].categories[0].postIds).to.not.be.eql([]);
					expect(loadedImages[1].categories[0].postIds.length).to.be.equal(2);
					expect(loadedImages[1].categories[0].postIds[0]).to.be.eql({
						id: 3,
						authorId: 1,
					});
					expect(loadedImages[1].categories[0].postIds[1]).to.be.eql({
						id: 4,
						authorId: 2,
					});

					const loadedImage = await connection.manager
						.createQueryBuilder(Image, 'image')
						.loadRelationIdAndMap('image.categoryIds', 'image.categories')
						.leftJoinAndSelect('image.categories', 'category')
						.loadRelationIdAndMap('category.postIds', 'category.posts')
						.orderBy('category.id')
						.where('image.id = :id', { id: 1 })
						.getOne();

					expect(loadedImage!.categoryIds).to.not.be.eql([]);
					expect(loadedImage!.categoryIds.length).to.be.equal(2);
					expect(loadedImage!.categoryIds[0]).to.be.eql({
						id: 1,
						code: 1,
					});
					expect(loadedImage!.categoryIds[1]).to.be.eql({
						id: 2,
						code: 1,
					});
					expect(loadedImage!.categories).to.not.be.eql([]);
					expect(loadedImage!.categories.length).to.be.equal(2);
					expect(loadedImage!.categories[0].postIds).to.not.be.eql([]);
					expect(loadedImage!.categories[0].postIds.length).to.be.equal(2);
					expect(loadedImage!.categories[0].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
					expect(loadedImage!.categories[0].postIds[1]).to.be.eql({
						id: 2,
						authorId: 1,
					});
					expect(loadedImage!.categories[1].postIds).to.not.be.eql([]);
					expect(loadedImage!.categories[1].postIds.length).to.be.equal(1);
					expect(loadedImage!.categories[1].postIds[0]).to.be.eql({
						id: 1,
						authorId: 1,
					});
				}),
			));
	});
});
