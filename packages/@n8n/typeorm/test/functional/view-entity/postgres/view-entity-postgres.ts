import { expect } from 'chai';
import 'reflect-metadata';
import { Category } from './entity/Category';
import { DataSource } from '../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { Post } from './entity/Post';
import { PostCategory } from './entity/PostCategory';
import { PostByCategory } from './entity/PostByCategory';

describe('view entity > postgres', () => {
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

	it('should create entity view from string definition', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				const postCategory = await queryRunner.getView('post_category');
				expect(postCategory).to.be.exist;
				await queryRunner.release();
			}),
		));

	it('should not return data without refreshing the materialized view', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				const category1 = new Category();
				category1.name = 'Cars';
				await queryRunner.manager.save(category1);

				const post1 = new Post();
				post1.name = 'About BMW';
				post1.categoryId = category1.id;
				await queryRunner.manager.save(post1);

				const emptyResult = await queryRunner.manager.find(PostByCategory);
				emptyResult.length.should.be.equal(0);

				await queryRunner.query('REFRESH MATERIALIZED VIEW post_by_category');
				const resultWithData = await queryRunner.manager.find(PostByCategory);
				resultWithData.length.should.be.equal(1);

				expect(resultWithData[0].categoryName).to.eq(category1.name);
				expect(Number(resultWithData[0].postCount)).to.eq(1);

				await queryRunner.release();
			}),
		));

	it('should correctly return data from View', () =>
		Promise.all(
			connections.map(async (connection) => {
				const category1 = new Category();
				category1.name = 'Cars';
				await connection.manager.save(category1);

				const category2 = new Category();
				category2.name = 'Airplanes';
				await connection.manager.save(category2);

				const post1 = new Post();
				post1.name = 'About BMW';
				post1.categoryId = category1.id;
				await connection.manager.save(post1);

				const post2 = new Post();
				post2.name = 'About Boeing';
				post2.categoryId = category2.id;
				await connection.manager.save(post2);

				const postCategories = await connection.manager.find(PostCategory);
				postCategories.length.should.be.equal(2);

				postCategories[0].id.should.be.equal(1);
				postCategories[0].postName.should.be.equal('About BMW');
				postCategories[0].categoryName.should.be.equal('CARS');

				postCategories[1].id.should.be.equal(2);
				postCategories[1].postName.should.be.equal('About Boeing');
				postCategories[1].categoryName.should.be.equal('AIRPLANES');
			}),
		));
});
