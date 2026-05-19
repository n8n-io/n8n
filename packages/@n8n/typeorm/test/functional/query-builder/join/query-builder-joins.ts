import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Tag } from './entity/Tag';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { Image } from './entity/Image';
import { User } from './entity/User';

describe('query builder > joins', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('leftJoinAndSelect', () => {
		it('should load data for all relation types', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const image3 = new Image();
					image3.name = 'image3';
					await connection.manager.save(image3);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.name = 'airplanes';
					category3.images = [image3];
					await connection.manager.save(category3);

					const post1 = new Post();
					post1.title = 'about BMW';
					post1.categories = [category1, category2];
					post1.tag = tag;
					post1.author = user;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'about Boeing';
					post2.categories = [category3];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tag', 'tag')
						.leftJoinAndSelect('post.author', 'author')
						.leftJoinAndSelect('post.categories', 'categories')
						.leftJoinAndSelect('categories.images', 'images')
						.getMany();

					expect(loadedPosts![0].tag).to.not.be.undefined;
					expect(loadedPosts![0].tag.id).to.be.equal(1);
					expect(loadedPosts![0].categories).to.not.be.eql([]);
					expect(loadedPosts![0].categories.length).to.be.equal(2);
					expect(loadedPosts![0].categories[0].images).to.not.be.eql([]);
					expect(loadedPosts![0].categories[0].images.length).to.be.equal(2);
					expect(loadedPosts![0].categories[0].images.map((image) => image.id)).to.have.members([
						1, 2,
					]);
					expect(loadedPosts![0].author).to.not.be.undefined;
					expect(loadedPosts![0].author.id).to.be.equal(1);
					expect(loadedPosts![1].categories).to.not.be.eql([]);
					expect(loadedPosts![1].categories.length).to.be.equal(1);
					expect(loadedPosts![1].categories[0].images).to.not.be.eql([]);
					expect(loadedPosts![1].categories[0].images.length).to.be.equal(1);
					expect(loadedPosts![1].categories[0].images[0].id).to.be.equal(3);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tag', 'tag')
						.leftJoinAndSelect('post.author', 'author')
						.leftJoinAndSelect('post.categories', 'categories')
						.leftJoinAndSelect('categories.images', 'images')
						.where('post.id = :id', { id: 1 })
						.orderBy('post.id, categories.id')
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag instanceof Tag).to.be.true;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.categories[0] instanceof Category).to.be.true;
					expect(loadedPost!.categories[0].id).to.be.equal(1);
					expect(loadedPost!.categories[1].id).to.be.equal(2);
					expect(loadedPost!.categories[0].images[0] instanceof Image).to.be.true;
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images.map((image) => image.id)).to.have.members([1, 2]);
					expect(loadedPost!.categories[1].images).to.be.eql([]);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author instanceof User).to.be.true;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load data when additional condition used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category1, category2];
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categories', 'categories', 'categories.id = :categoryId')
						.leftJoinAndSelect('categories.images', 'images', 'images.id = :imageId')
						.where('post.id = :id', { id: post.id })
						.setParameters({ categoryId: 1, imageId: 2 })
						.getOne();

					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(1);
					expect(loadedPost!.categories[0].id).to.be.equal(1);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(1);
					expect(loadedPost!.categories[0].images[0].id).to.be.equal(2);
				}),
			));

		it('should load data when join tables does not have direct relation', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category = new Category();
					category.name = 'cars';
					await connection.manager.save(category);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category];
					await connection.manager.save(post);

					const loadedRawPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect(
							'post_categories_category',
							'categoriesJunction',
							'categoriesJunction.postId = post.id',
						)
						.leftJoinAndSelect(
							Category,
							'categories',
							'categories.id = categoriesJunction.categoryId',
						)
						.where('post.id = :id', { id: post.id })
						.getRawOne();

					expect(loadedRawPost!['categories_id']).to.be.equal(1);
				}),
			));
	});

	describe('innerJoinAndSelect', () => {
		it('should load only exist data for all relation types', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category1, category2];
					post.tag = tag;
					post.author = user;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndSelect('post.tag', 'tag')
						.innerJoinAndSelect('post.author', 'author')
						.innerJoinAndSelect('post.categories', 'categories')
						.innerJoinAndSelect('categories.images', 'images')
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(1);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load data when additional condition used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category1, category2];
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndSelect('post.categories', 'categories', 'categories.id = :categoryId')
						.innerJoinAndSelect('categories.images', 'images', 'images.id = :imageId')
						.where('post.id = :id', { id: post.id })
						.setParameters({ categoryId: 1, imageId: 2 })
						.getOne();

					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(1);
					expect(loadedPost!.categories[0].id).to.be.equal(1);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(1);
					expect(loadedPost!.categories[0].images[0].id).to.be.equal(2);
				}),
			));

		it('should not return any result when related data does not exist', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post = new Post();
					post.title = 'about BMW';
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndSelect('post.tag', 'tag')
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!).to.be.null;
				}),
			));
	});

	describe('leftJoinAndMap', () => {
		it('should load and map selected data when entity used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.tag = tag;
					post.author = user;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapOne('post.tag', Tag, 'tag', 'tag.id = :tagId')
						.leftJoinAndMapOne('post.author', User, 'user', 'user.id = :userId')
						.leftJoinAndMapMany(
							'post.categories',
							Category,
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.leftJoinAndMapMany('categories.images', Image, 'image', 'image.id IN (:...imageIds)')
						.where('post.id = :id', { id: post.id })
						.setParameters({
							tagId: 1,
							userId: 1,
							categoryIds: [1, 2],
							imageIds: [1, 2],
						})
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images.map((image) => image.id)).to.have.members([1, 2]);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when table name used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.tag = tag;
					post.author = user;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapOne('post.tag', 'tag', 'tag', 'tag.id = :tagId')
						.leftJoinAndMapOne('post.author', 'user', 'user', 'user.id = :userId')
						.leftJoinAndMapMany(
							'post.categories',
							'category',
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.leftJoinAndMapMany('categories.images', 'image', 'image', 'image.id IN (:...imageIds)')
						.where('post.id = :id', { id: post.id })
						.setParameters({
							tagId: 1,
							userId: 1,
							categoryIds: [1, 2],
							imageIds: [1, 2],
						})
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images.map((image) => image.id)).to.have.members([1, 2]);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when query builder used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const post = new Post();
					post.title = 'about China';
					post.tag = tag;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapOne(
							'post.tag',
							(qb) => qb.from(Tag, 'tag'),
							'tag',
							'tag.id = post.tagId',
							undefined,
							Tag,
						)
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when data will given from same entity but with different conditions', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.name = 'bmw';
					await connection.manager.save(category3);

					const post = new Post();
					post.title = 'about BMW';
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapMany(
							'post.categories',
							Category,
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.leftJoinAndMapMany(
							'post.subcategories',
							Category,
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.where('post.id = :id', { id: post.id })
						.setParameters({
							categoryIds: [1, 2],
							subcategoryIds: [3],
						})
						.getOne();

					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.subcategories).to.not.be.eql([]);
					expect(loadedPost!.subcategories.length).to.be.equal(1);
				}),
			));

		it('should load and map selected data when data will given from same property but with different conditions', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const image3 = new Image();
					image3.name = 'image3';
					image3.isRemoved = true;
					await connection.manager.save(image3);

					const image4 = new Image();
					image4.name = 'image4';
					image4.isRemoved = true;
					await connection.manager.save(image4);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2, image3, image4];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					category2.images = [image1, image2, image3, image4];
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.name = 'bmw';
					category3.isRemoved = true;
					category3.images = [image1, image3];
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.name = 'citroen';
					category4.isRemoved = true;
					category4.images = [image2, image4];
					await connection.manager.save(category4);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category1, category2, category3];
					await connection.manager.save(post);

					const post2 = new Post();
					post2.title = 'about Citroen';
					post2.categories = [category1, category4];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapMany(
							'post.removedCategories',
							'post.categories',
							'rc',
							'rc.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'rc.removedImages',
							'rc.images',
							'removedImages',
							'removedImages.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'post.subcategories',
							'post.categories',
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.leftJoinAndMapOne(
							'subcategories.titleImage',
							'subcategories.images',
							'titleImage',
							'titleImage.id = :titleImageId',
						)
						.setParameters({
							isRemoved: true,
							subcategoryIds: [1, 2],
							titleImageId: 1,
						})
						.getMany();

					expect(loadedPosts![0].removedCategories).to.not.be.eql([]);
					expect(loadedPosts![0].removedCategories.length).to.be.equal(1);
					expect(loadedPosts![0].removedCategories[0].id).to.be.equal(3);
					expect(loadedPosts![0].removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPosts![0].removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPosts![0].removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPosts![0].removedCategories[0].removedImages[0].id).to.be.equal(3);
					expect(loadedPosts![0].subcategories).to.not.be.eql([]);
					expect(loadedPosts![0].subcategories.length).to.be.equal(2);
					expect(loadedPosts![0].subcategories[0].titleImage.id).to.be.equal(1);
					expect(loadedPosts![1].removedCategories).to.not.be.eql([]);
					expect(loadedPosts![1].removedCategories.length).to.be.equal(1);
					expect(loadedPosts![1].removedCategories[0].id).to.be.equal(4);
					expect(loadedPosts![1].removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPosts![1].removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPosts![1].removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPosts![1].removedCategories[0].removedImages[0].id).to.be.equal(4);
					expect(loadedPosts![1].subcategories).to.not.be.eql([]);
					expect(loadedPosts![1].subcategories.length).to.be.equal(1);
					expect(loadedPosts![1].subcategories[0].titleImage.id).to.be.equal(1);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapMany(
							'post.removedCategories',
							'post.categories',
							'rc',
							'rc.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'rc.removedImages',
							'rc.images',
							'removedImages',
							'removedImages.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'post.subcategories',
							'post.categories',
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.leftJoinAndMapOne(
							'subcategories.titleImage',
							'subcategories.images',
							'titleImage',
							'titleImage.id = :titleImageId',
						)
						.setParameters({
							isRemoved: true,
							subcategoryIds: [1, 2],
							titleImageId: 1,
						})
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!.removedCategories).to.not.be.eql([]);
					expect(loadedPost!.removedCategories.length).to.be.equal(1);
					expect(loadedPost!.removedCategories[0].id).to.be.equal(3);
					expect(loadedPost!.removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPost!.removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPost!.removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPost!.removedCategories[0].removedImages[0].id).to.be.equal(3);
					expect(loadedPost!.subcategories).to.not.be.eql([]);
					expect(loadedPost!.subcategories.length).to.be.equal(2);
					expect(loadedPost!.subcategories[0].titleImage.id).to.be.equal(1);
				}),
			));
	});

	describe('innerJoinAndMap', () => {
		it('should load and map selected data when entity used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.tag = tag;
					post.author = user;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapOne('post.tag', Tag, 'tag', 'tag.id = :tagId')
						.innerJoinAndMapOne('post.author', User, 'user', 'user.id = :userId')
						.innerJoinAndMapMany(
							'post.categories',
							Category,
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.innerJoinAndMapMany('categories.images', Image, 'image', 'image.id IN (:...imageIds)')
						.where('post.id = :id', { id: post.id })
						.setParameters({
							tagId: 1,
							userId: 1,
							categoryIds: [1, 2],
							imageIds: [1, 2],
						})
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images.map((image) => image.id)).to.have.members([1, 2]);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when table name used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const user = new User();
					user.name = 'Alex Messer';
					await connection.manager.save(user);

					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const post = new Post();
					post.title = 'about BMW';
					post.tag = tag;
					post.author = user;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapOne('post.tag', 'tag', 'tag', 'tag.id = :tagId')
						.innerJoinAndMapOne('post.author', 'user', 'user', 'user.id = :userId')
						.innerJoinAndMapMany(
							'post.categories',
							'category',
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.innerJoinAndMapMany(
							'categories.images',
							'image',
							'image',
							'image.id IN (:...imageIds)',
						)
						.where('post.id = :id', { id: post.id })
						.setParameters({
							tagId: 1,
							userId: 1,
							categoryIds: [1, 2],
							imageIds: [1, 2],
						})
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images).to.not.be.eql([]);
					expect(loadedPost!.categories[0].images.length).to.be.equal(2);
					expect(loadedPost!.categories[0].images.map((image) => image.id)).to.have.members([1, 2]);
					expect(loadedPost!.author).to.not.be.undefined;
					expect(loadedPost!.author.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when query builder used as join argument', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag = new Tag();
					tag.name = 'audi';
					await connection.manager.save(tag);

					const post = new Post();
					post.title = 'about China';
					post.tag = tag;
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapOne(
							'post.tag',
							(qb) => qb.from(Tag, 'tag'),
							'tag',
							'tag.id = post.tagId',
							undefined,
							Tag,
						)
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
				}),
			));

		it('should load and map selected data when data will given from same entity but with different conditions', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.name = 'bmw';
					await connection.manager.save(category3);

					const post = new Post();
					post.title = 'about BMW';
					await connection.manager.save(post);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapMany(
							'post.categories',
							Category,
							'categories',
							'categories.id IN (:...categoryIds)',
						)
						.innerJoinAndMapMany(
							'post.subcategories',
							Category,
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.where('post.id = :id', { id: post.id })
						.setParameters({
							categoryIds: [1, 2],
							subcategoryIds: [3],
						})
						.getOne();

					expect(loadedPost!.categories).to.not.be.eql([]);
					expect(loadedPost!.categories.length).to.be.equal(2);
					expect(loadedPost!.subcategories).to.not.be.eql([]);
					expect(loadedPost!.subcategories.length).to.be.equal(1);
				}),
			));

		it('should load and map selected data when data will given from same property but with different conditions', () =>
			Promise.all(
				connections.map(async (connection) => {
					const image1 = new Image();
					image1.name = 'image1';
					await connection.manager.save(image1);

					const image2 = new Image();
					image2.name = 'image2';
					await connection.manager.save(image2);

					const image3 = new Image();
					image3.name = 'image3';
					image3.isRemoved = true;
					await connection.manager.save(image3);

					const image4 = new Image();
					image4.name = 'image4';
					image4.isRemoved = true;
					await connection.manager.save(image4);

					const category1 = new Category();
					category1.name = 'cars';
					category1.images = [image1, image2, image3, image4];
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'germany';
					category2.images = [image1, image2, image3, image4];
					await connection.manager.save(category2);

					const category3 = new Category();
					category3.name = 'bmw';
					category3.isRemoved = true;
					category3.images = [image1, image3];
					await connection.manager.save(category3);

					const category4 = new Category();
					category4.name = 'citroen';
					category4.isRemoved = true;
					category4.images = [image2, image4];
					await connection.manager.save(category4);

					const post = new Post();
					post.title = 'about BMW';
					post.categories = [category1, category2, category3];
					await connection.manager.save(post);

					const post2 = new Post();
					post2.title = 'about Citroen';
					post2.categories = [category1, category4];
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndMapMany(
							'post.removedCategories',
							'post.categories',
							'rc',
							'rc.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'rc.removedImages',
							'rc.images',
							'removedImages',
							'removedImages.isRemoved = :isRemoved',
						)
						.leftJoinAndMapMany(
							'post.subcategories',
							'post.categories',
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.leftJoinAndMapOne(
							'subcategories.titleImage',
							'subcategories.images',
							'titleImage',
							'titleImage.id = :titleImageId',
						)
						.setParameters({
							isRemoved: true,
							subcategoryIds: [1, 2],
							titleImageId: 1,
						})
						.getMany();

					expect(loadedPosts![0].removedCategories).to.not.be.eql([]);
					expect(loadedPosts![0].removedCategories.length).to.be.equal(1);
					expect(loadedPosts![0].removedCategories[0].id).to.be.equal(3);
					expect(loadedPosts![0].removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPosts![0].removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPosts![0].removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPosts![0].removedCategories[0].removedImages[0].id).to.be.equal(3);
					expect(loadedPosts![0].subcategories).to.not.be.eql([]);
					expect(loadedPosts![0].subcategories.length).to.be.equal(2);
					expect(loadedPosts![0].subcategories[0].titleImage.id).to.be.equal(1);
					expect(loadedPosts![1].removedCategories).to.not.be.eql([]);
					expect(loadedPosts![1].removedCategories.length).to.be.equal(1);
					expect(loadedPosts![1].removedCategories[0].id).to.be.equal(4);
					expect(loadedPosts![1].removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPosts![1].removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPosts![1].removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPosts![1].removedCategories[0].removedImages[0].id).to.be.equal(4);
					expect(loadedPosts![1].subcategories).to.not.be.eql([]);
					expect(loadedPosts![1].subcategories.length).to.be.equal(1);
					expect(loadedPosts![1].subcategories[0].titleImage.id).to.be.equal(1);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapMany(
							'post.removedCategories',
							'post.categories',
							'rc',
							'rc.isRemoved = :isRemoved',
						)
						.innerJoinAndMapMany(
							'rc.removedImages',
							'rc.images',
							'removedImages',
							'removedImages.isRemoved = :isRemoved',
						)
						.innerJoinAndMapMany(
							'post.subcategories',
							'post.categories',
							'subcategories',
							'subcategories.id IN (:...subcategoryIds)',
						)
						.innerJoinAndMapOne(
							'subcategories.titleImage',
							'subcategories.images',
							'titleImage',
							'titleImage.id = :titleImageId',
						)
						.setParameters({
							isRemoved: true,
							subcategoryIds: [1, 2],
							titleImageId: 1,
						})
						.where('post.id = :id', { id: post.id })
						.getOne();

					expect(loadedPost!.removedCategories).to.not.be.eql([]);
					expect(loadedPost!.removedCategories.length).to.be.equal(1);
					expect(loadedPost!.removedCategories[0].id).to.be.equal(3);
					expect(loadedPost!.removedCategories[0] instanceof Category).to.be.true;
					expect(loadedPost!.removedCategories[0].removedImages.length).to.be.equal(1);
					expect(loadedPost!.removedCategories[0].removedImages[0] instanceof Image).to.be.true;
					expect(loadedPost!.removedCategories[0].removedImages[0].id).to.be.equal(3);
					expect(loadedPost!.subcategories).to.not.be.eql([]);
					expect(loadedPost!.subcategories.length).to.be.equal(2);
					expect(loadedPost!.subcategories[0].titleImage.id).to.be.equal(1);
				}),
			));

		it('should not return any result when related data does not exist', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post = new Post();
					post.title = 'about BMW';
					await connection.manager.save(post);

					const loadedPost1 = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapOne('post.author', User, 'user', 'user.id = :userId')
						.where('post.id = :id', { id: 1 })
						.setParameters({ userId: 1 })
						.getOne();

					expect(loadedPost1!).to.be.null;

					const loadedPost2 = await connection.manager
						.createQueryBuilder(Post, 'post')
						.innerJoinAndMapMany(
							'post.categories',
							Category,
							'categories',
							'categories.id = :categoryId',
						)
						.where('post.id = :id', { id: 1 })
						.setParameters({ categoryId: 1 })
						.getOne();

					expect(loadedPost2!).to.be.null;
				}),
			));
	});
});
