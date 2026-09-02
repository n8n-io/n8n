import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src/data-source/DataSource';
import { Category } from './entity/Category';
import { Post } from './entity/Post';
import { Image } from './entity/Image';

describe('query builder > load-relation-count-and-map > one-to-many', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should load relation count', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'cars';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'airplanes';
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'about BMW';
				post1.categories = [category1, category2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'about Boeing';
				post2.categories = [category3];
				await connection.manager.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.addOrderBy('post.id')
					.getMany();

				expect(loadedPosts[0]!.categoryCount).to.be.equal(2);
				expect(loadedPosts[1]!.categoryCount).to.be.equal(1);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost!.categoryCount).to.be.equal(2);
			}),
		));

	it('should load relation count on nested relations', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.name = 'image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.name = 'image #2';
				await connection.manager.save(image2);

				const image3 = new Image();
				image3.name = 'image #3';
				await connection.manager.save(image3);

				const category1 = new Category();
				category1.name = 'cars';
				category1.images = [image1, image2];
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'airplanes';
				category3.images = [image3];
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'about BMW';
				post1.categories = [category1, category2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'about Boeing';
				post2.categories = [category3];
				await connection.manager.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.loadRelationCountAndMap('categories.imageCount', 'categories.images')
					.addOrderBy('post.id, categories.id')
					.getMany();

				expect(loadedPosts[0]!.categoryCount).to.be.equal(2);
				expect(loadedPosts[0]!.categories[0].imageCount).to.be.equal(2);
				expect(loadedPosts[0]!.categories[1].imageCount).to.be.equal(0);
				expect(loadedPosts[1]!.categoryCount).to.be.equal(1);
				expect(loadedPosts[1]!.categories[0].imageCount).to.be.equal(1);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.leftJoinAndSelect('post.categories', 'categories')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.loadRelationCountAndMap('categories.imageCount', 'categories.images')
					.where('post.id = :id', { id: 1 })
					.addOrderBy('post.id, categories.id')
					.getOne();

				expect(loadedPost!.categoryCount).to.be.equal(2);
				expect(loadedPost!.categories[0].imageCount).to.be.equal(2);
				expect(loadedPost!.categories[1].imageCount).to.be.equal(0);
			}),
		));

	it('should load relation count with additional conditions', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'cars';
				category1.isRemoved = true;
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'BMW';
				await connection.manager.save(category2);

				const category3 = new Category();
				category3.name = 'airplanes';
				await connection.manager.save(category3);

				const post1 = new Post();
				post1.title = 'about BMW';
				post1.categories = [category1, category2];
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.title = 'about Boeing';
				post2.categories = [category3];
				await connection.manager.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.loadRelationCountAndMap('post.removedCategoryCount', 'post.categories', 'rc', (qb) =>
						qb.andWhere('rc.isRemoved = :isRemoved', {
							isRemoved: true,
						}),
					)
					.addOrderBy('post.id')
					.getMany();

				expect(loadedPosts[0]!.categoryCount).to.be.equal(2);
				expect(loadedPosts[0]!.removedCategoryCount).to.be.equal(1);
				expect(loadedPosts[1]!.categoryCount).to.be.equal(1);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationCountAndMap('post.categoryCount', 'post.categories')
					.loadRelationCountAndMap('post.removedCategoryCount', 'post.categories', 'rc', (qb) =>
						qb.andWhere('rc.isRemoved = :isRemoved', {
							isRemoved: true,
						}),
					)
					.where('post.id = :id', { id: 1 })
					.getOne();

				expect(loadedPost!.categoryCount).to.be.equal(2);
				expect(loadedPost!.removedCategoryCount).to.be.equal(1);
			}),
		));
});
