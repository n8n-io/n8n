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

describe('query builder > relation-id > many-to-one > multiple-pk', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

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
				category2.code = 1;
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.id = 1;
				post1.authorId = 1;
				post1.title = 'About BMW';
				post1.category = category1;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.authorId = 1;
				post2.title = 'About Audi';
				post2.category = category1;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.id = 3;
				post3.authorId = 2;
				post3.title = 'About Boeing';
				post3.category = category2;
				await connection.manager.save(post3);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.getMany();

				expect(loadedPosts[0].categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPosts[1].categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPosts[2].categoryId).to.be.eql({ id: 2, code: 1 });

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.where('post.id = :id', { id: 1 })
					.andWhere('post.authorId = :authorId', { authorId: 1 })
					.getOne();

				expect(loadedPost!.categoryId).to.be.eql({ id: 1, code: 1 });
			}),
		));

	it('should load ids when only one entity have multiple primary keys', () =>
		Promise.all(
			connections.map(async (connection) => {
				const image1 = new Image();
				image1.name = 'Image #1';
				await connection.manager.save(image1);

				const image2 = new Image();
				image2.name = 'Image #2';
				await connection.manager.save(image2);

				const category1 = new Category();
				category1.id = 1;
				category1.code = 1;
				category1.name = 'cars';
				category1.image = image1;
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.id = 2;
				category2.code = 2;
				category2.name = 'airplanes';
				category2.image = image2;
				await connection.manager.save(category2);

				const loadedCategories = await connection.manager
					.createQueryBuilder(Category, 'category')
					.loadRelationIdAndMap('category.imageId', 'category.image')
					.addOrderBy('category.id')
					.getMany();

				expect(loadedCategories[0].imageId).to.be.equal(1);
				expect(loadedCategories[1].imageId).to.be.equal(2);

				const loadedCategory = await connection.manager
					.createQueryBuilder(Category, 'category')
					.loadRelationIdAndMap('category.imageId', 'category.image')
					.where('category.id = :id', { id: 1 })
					.andWhere('category.code = :code', { code: 1 })
					.getOne();

				expect(loadedCategory!.imageId).to.be.equal(1);
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
				category2.code = 1;
				category2.name = 'airplanes';
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.id = 1;
				post1.authorId = 1;
				post1.title = 'About BMW';
				post1.subcategory = category1;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.authorId = 1;
				post2.title = 'About Audi';
				post2.subcategory = category1;
				await connection.manager.save(post2);

				const post3 = new Post();
				post3.id = 3;
				post3.authorId = 2;
				post3.title = 'About Boeing';
				post3.subcategory = category2;
				await connection.manager.save(post3);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.subcategory')
					.getMany();

				expect(loadedPosts[0].categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPosts[1].categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPosts[2].categoryId).to.be.eql({ id: 2, code: 1 });

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.subcategory')
					.where('post.id = :id', { id: 1 })
					.andWhere('post.authorId = :authorId', { authorId: 1 })
					.getOne();

				expect(loadedPost!.categoryId).to.be.eql({ id: 1, code: 1 });
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

				const category1 = new Category();
				category1.id = 1;
				category1.code = 1;
				category1.name = 'cars';
				category1.image = image1;
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.id = 2;
				category2.code = 1;
				category2.name = 'airplanes';
				category2.image = image2;
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.id = 1;
				post1.authorId = 1;
				post1.title = 'About BMW';
				post1.category = category1;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.id = 2;
				post2.authorId = 1;
				post2.title = 'About Boeing';
				post2.category = category2;
				await connection.manager.save(post2);

				const loadedPosts = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.leftJoinAndSelect('post.category', 'category')
					.loadRelationIdAndMap('category.imageId', 'category.image')
					.getMany();

				expect(loadedPosts[0].categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPosts[0].category.imageId).to.be.equal(1);
				expect(loadedPosts[1].categoryId).to.be.eql({ id: 2, code: 1 });
				expect(loadedPosts[1].category.imageId).to.be.equal(2);

				const loadedPost = await connection.manager
					.createQueryBuilder(Post, 'post')
					.loadRelationIdAndMap('post.categoryId', 'post.category')
					.leftJoinAndSelect('post.category', 'category')
					.loadRelationIdAndMap('category.imageId', 'category.image')
					.where('post.id = :id', { id: 1 })
					.andWhere('post.authorId = :authorId', { authorId: 1 })
					.getOne();

				expect(loadedPost!.categoryId).to.be.eql({ id: 1, code: 1 });
				expect(loadedPost!.category.imageId).to.be.equal(1);
			}),
		));
});
