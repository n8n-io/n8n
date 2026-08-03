import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import { Tag } from './entity/Tag';

describe('relations > custom-referenced-column-name', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	describe('many-to-one', () => {
		it('should load related entity when relation use custom referenced column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.category = category1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.category = category2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].categoryName).to.not.be.undefined;
					expect(loadedPosts![0].categoryName).to.be.equal('cars');
					expect(loadedPosts![1].categoryName).to.not.be.undefined;
					expect(loadedPosts![1].categoryName).to.be.equal('airplanes');

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.categoryName).to.not.be.undefined;
					expect(loadedPost!.categoryName).to.be.equal('cars');
				}),
			));

		it('should load related entity when relation defined with empty join column', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.categoryWithEmptyJoinCol = category1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.categoryWithEmptyJoinCol = category2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categoryWithEmptyJoinCol', 'categoryWithEmptyJoinCol')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].categoryWithEmptyJoinCol.id).to.be.equal(1);
					expect(loadedPosts![1].categoryWithEmptyJoinCol.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.leftJoinAndSelect('post.categoryWithEmptyJoinCol', 'categoryWithEmptyJoinCol')
						.getOne();

					expect(loadedPost!.categoryWithEmptyJoinCol.id).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without reference column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.categoryWithoutRefColName = category1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.categoryWithoutRefColName = category2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].categoryId).to.be.equal(1);
					expect(loadedPosts![1].categoryId).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.categoryId).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.categoryWithoutColName = category1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.categoryWithoutColName = category2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categoryWithoutColName', 'categoryWithoutColName')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].categoryWithoutColName.id).to.be.equal(1);
					expect(loadedPosts![1].categoryWithoutColName.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categoryWithoutColName', 'categoryWithoutColName')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.categoryWithoutColName.id).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without reference column name and relation does not have relation column in entity', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.categoryWithoutRefColName2 = category1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.categoryWithoutRefColName2 = category2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categoryWithoutRefColName2', 'categoryWithoutRefColName2')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].categoryWithoutRefColName2).to.not.be.undefined;
					expect(loadedPosts![0].categoryWithoutRefColName2.id).to.be.equal(1);
					expect(loadedPosts![1].categoryWithoutRefColName2).to.not.be.undefined;
					expect(loadedPosts![1].categoryWithoutRefColName2.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.categoryWithoutRefColName2', 'categoryWithoutRefColName2')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.categoryWithoutRefColName2).to.not.be.undefined;
					expect(loadedPost!.categoryWithoutRefColName2.id).to.be.equal(1);
				}),
			));

		it('should persist relation when relation sets via join column', () =>
			Promise.all(
				connections.map(async (connection) => {
					const category1 = new Category();
					category1.name = 'cars';
					await connection.manager.save(category1);

					const category2 = new Category();
					category2.name = 'airplanes';
					await connection.manager.save(category2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.categoryName = 'cars';
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.categoryName = 'airplanes';
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.category', 'category')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].category).to.not.be.undefined;
					expect(loadedPosts![0].category.id).to.be.equal(1);
					expect(loadedPosts![1].category).to.not.be.undefined;
					expect(loadedPosts![1].category.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.category', 'category')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.category).to.not.be.undefined;
					expect(loadedPost!.category.id).to.be.equal(1);
				}),
			));
	});

	describe('one-to-one', () => {
		it('should load related entity when relation use custom referenced column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'Post #1';
					post1.tag = tag1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'Post #2';
					post2.tag = tag2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tagName).to.not.be.undefined;
					expect(loadedPosts![0].tagName).to.be.equal('tag #1');
					expect(loadedPosts![1].tagName).to.not.be.undefined;
					expect(loadedPosts![1].tagName).to.be.equal('tag #2');

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tagName).to.not.be.undefined;
					expect(loadedPost!.tagName).to.be.equal('tag #1');
				}),
			));

		it('should load related entity when relation defined without column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.tagWithEmptyJoinCol = tag1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.tagWithEmptyJoinCol = tag2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithEmptyJoinCol', 'tagWithEmptyJoinCol')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tagWithEmptyJoinCol.id).to.be.equal(1);
					expect(loadedPosts![1].tagWithEmptyJoinCol.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithEmptyJoinCol', 'tagWithEmptyJoinCol')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tagWithEmptyJoinCol.id).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without reference column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.tagWithoutRefColName = tag1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.tagWithoutRefColName = tag2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tagId).to.be.equal(1);
					expect(loadedPosts![1].tagId).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tagId).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without column name', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.tagWithoutColName = tag1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.tagWithoutColName = tag2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithoutColName', 'tagWithoutColName')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tagWithoutColName.id).to.be.equal(1);
					expect(loadedPosts![1].tagWithoutColName.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithoutColName', 'tagWithoutColName')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tagWithoutColName.id).to.be.equal(1);
				}),
			));

		it('should load related entity when relation defined without reference column name and relation does not have relation column in entity', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'About BMW';
					post1.tagWithoutRefColName2 = tag1;
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'About Boeing';
					post2.tagWithoutRefColName2 = tag2;
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithoutRefColName2', 'tagWithoutRefColName2')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tagWithoutRefColName2).to.not.be.undefined;
					expect(loadedPosts![0].tagWithoutRefColName2.id).to.be.equal(1);
					expect(loadedPosts![1].tagWithoutRefColName2).to.not.be.undefined;
					expect(loadedPosts![1].tagWithoutRefColName2.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tagWithoutRefColName2', 'tagWithoutRefColName2')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tagWithoutRefColName2).to.not.be.undefined;
					expect(loadedPost!.tagWithoutRefColName2.id).to.be.equal(1);
				}),
			));

		it('should persist relation when relation sets via join column', () =>
			Promise.all(
				connections.map(async (connection) => {
					const tag1 = new Tag();
					tag1.name = 'tag #1';
					await connection.manager.save(tag1);

					const tag2 = new Tag();
					tag2.name = 'tag #2';
					await connection.manager.save(tag2);

					const post1 = new Post();
					post1.title = 'Post #1';
					post1.tagName = 'tag #1';
					await connection.manager.save(post1);

					const post2 = new Post();
					post2.title = 'Post #2';
					post2.tagName = 'tag #2';
					await connection.manager.save(post2);

					const loadedPosts = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tag', 'tag')
						.addOrderBy('post.id')
						.getMany();

					expect(loadedPosts![0].tag).to.not.be.undefined;
					expect(loadedPosts![0].tag.id).to.be.equal(1);
					expect(loadedPosts![1].tag).to.not.be.undefined;
					expect(loadedPosts![1].tag.id).to.be.equal(2);

					const loadedPost = await connection.manager
						.createQueryBuilder(Post, 'post')
						.leftJoinAndSelect('post.tag', 'category')
						.where('post.id = :id', { id: 1 })
						.getOne();

					expect(loadedPost!.tag).to.not.be.undefined;
					expect(loadedPost!.tag.id).to.be.equal(1);
				}),
			));
	});
});
