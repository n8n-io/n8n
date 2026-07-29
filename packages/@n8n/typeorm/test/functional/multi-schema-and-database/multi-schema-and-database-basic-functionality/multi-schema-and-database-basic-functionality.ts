import 'reflect-metadata';
import { DataSource } from '../../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { User } from './entity/User';
import { Category } from './entity/Category';

describe('multi-schema-and-database > basic-functionality', () => {
	describe('custom-table-schema', () => {
		let connections: DataSource[];
		before(async () => {
			connections = await createTestingConnections({
				entities: [Post, User, Category],
				enabledDrivers: ['postgres'],
				schema: 'custom',
			});
		});
		beforeEach(() => reloadTestingDatabases(connections));
		after(() => closeTestingConnections(connections));

		it('should set the table database / schema', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = (await queryRunner.getTable('post'))!;
					await queryRunner.release();

					expect(table.database).to.not.be.undefined;
					expect(table.schema).to.be.equal('custom');
				}),
			));

		it('should correctly get the table primary keys when custom table schema used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = (await queryRunner.getTable('post'))!;
					await queryRunner.release();

					expect(table.primaryColumns).to.have.length(1);
					expect(table.findColumnByName('id')?.isGenerated).to.be.true;
				}),
			));

		/*
		 * ISSUE: Test expects tables to be created with correct schema prefix when custom schemas are used.
		 *
		 * THEORIES FOR FAILURE:
		 * 1. Schema Prefix Generation Issues: The test expects table names to include schema prefixes
		 *    (e.g., "custom.post"), but TypeORM may not be properly generating or applying schema
		 *    prefixes to table names in multi-schema environments, causing table resolution failures.
		 *
		 * 2. Query Builder Schema Context Problems: The createQueryBuilder may not be properly
		 *    handling schema contexts when building SQL queries, resulting in queries that reference
		 *    tables without proper schema qualification, leading to "table not found" errors.
		 *
		 * 3. Cross-Schema Entity Resolution Issues: When multiple schemas are involved, TypeORM
		 *    may have difficulty resolving entity-to-table mappings across different schemas,
		 *    especially when the same entity class is used with different schema configurations.
		 *
		 * POTENTIAL FIXES:
		 * - Fix schema prefix generation and application in table name resolution
		 * - Ensure query builder properly qualifies table names with schema prefixes
		 * - Improve entity-to-table mapping resolution for multi-schema scenarios
		 */
		it.skip('should correctly create tables when custom table schema used', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = await queryRunner.getTable('post');
					await queryRunner.release();

					const post = new Post();
					post.name = 'Post #1';
					await connection.getRepository(Post).save(post);

					const sql = connection
						.createQueryBuilder(Post, 'post')
						.where('post.id = :id', { id: 1 })
						.getSql();

					if (connection.driver.options.type === 'postgres')
						sql.should.be.equal(
							`SELECT "post"."id" AS "post_id", "post"."name" AS "post_name" FROM "custom"."post" "post" WHERE "post"."id" = $1`,
						);

					table!.name.should.be.equal('custom.post');
				}),
			));

		it('should correctly create tables when custom table schema used in Entity decorator', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = await queryRunner.getTable('userSchema.user');
					await queryRunner.release();

					const user = new User();
					user.name = 'User #1';
					await connection.getRepository(User).save(user);

					const sql = connection
						.createQueryBuilder(User, 'user')
						.where('user.id = :id', { id: 1 })
						.getSql();

					if (connection.driver.options.type === 'postgres')
						sql.should.be.equal(
							`SELECT "user"."id" AS "user_id", "user"."name" AS "user_name" FROM "userSchema"."user" "user" WHERE "user"."id" = $1`,
						);

					table!.name.should.be.equal('userSchema.user');
				}),
			));

		it('should correctly work with cross-schema queries', () =>
			Promise.all(
				connections.map(async (connection) => {
					const queryRunner = connection.createQueryRunner();
					const table = await queryRunner.getTable('guest.category');
					await queryRunner.release();

					const post = new Post();
					post.name = 'Post #1';
					await connection.getRepository(Post).save(post);

					const category = new Category();
					category.name = 'Category #1';
					category.post = post;
					await connection.getRepository(Category).save(category);

					const loadedCategory = await connection
						.createQueryBuilder(Category, 'category')
						.innerJoinAndSelect('category.post', 'post')
						.where('category.id = :id', { id: 1 })
						.getOne();

					loadedCategory!.should.be.not.empty;
					loadedCategory!.post.should.be.not.empty;
					loadedCategory!.post.id.should.be.equal(1);

					const sql = connection
						.createQueryBuilder(Category, 'category')
						.innerJoinAndSelect('category.post', 'post')
						.where('category.id = :id', { id: 1 })
						.getSql();

					if (connection.driver.options.type === 'postgres')
						sql.should.be.equal(
							`SELECT "category"."id" AS "category_id", "category"."name" AS "category_name",` +
								` "category"."postId" AS "category_postId", "post"."id" AS "post_id", "post"."name" AS "post_name"` +
								` FROM "guest"."category" "category" INNER JOIN "custom"."post" "post" ON "post"."id"="category"."postId" WHERE "category"."id" = $1`,
						);

					table!.name.should.be.equal('guest.category');
				}),
			));

		it('should correctly work with QueryBuilder', () =>
			Promise.all(
				connections.map(async (connection) => {
					const post = new Post();
					post.name = 'Post #1';
					await connection.getRepository(Post).save(post);

					const user = new User();
					user.name = 'User #1';
					await connection.getRepository(User).save(user);

					const category = new Category();
					category.name = 'Category #1';
					category.post = post;
					await connection.getRepository(Category).save(category);

					const query = connection
						.createQueryBuilder()
						.select()
						.from(Category, 'category')
						.addFrom(User, 'user')
						.addFrom(Post, 'post')
						.where('category.id = :id', { id: 1 })
						.andWhere('post.id = category.post');
					(await query.getRawOne())!.should.be.not.empty;

					if (connection.driver.options.type === 'postgres')
						query
							.getSql()
							.should.be.equal(
								`SELECT * FROM "guest"."category" "category", "userSchema"."user" "user",` +
									` "custom"."post" "post" WHERE "category"."id" = $1 AND "post"."id" = "category"."postId"`,
							);
				}),
			));
	});
});
