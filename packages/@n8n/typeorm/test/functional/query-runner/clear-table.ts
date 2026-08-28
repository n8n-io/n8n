import 'reflect-metadata';
import { expect } from 'chai';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { Post } from './entity/Post';

describe('query runner > clear table', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	const createTestPost = (): Post => {
		const post = new Post();
		post.id = 999;
		post.version = 1;
		post.name = 'victim';
		post.text = 'data';
		post.tag = 'test';
		return post;
	};

	it('should safely handle SQL injection in table name for SQLite', () =>
		Promise.all(
			connections
				.filter(
					(connection) =>
						connection.options.type === 'sqlite' || connection.options.type === 'sqlite-pooled',
				)
				.map(async (connection) => {
					// ARRANGE
					const queryRunner = connection.createQueryRunner();
					const post = createTestPost();
					await connection.manager.save(post);

					let victimCount = await connection.manager.count(Post);
					expect(victimCount).to.equal(1);

					// SQLite uses double quotes - try to inject DELETE statement
					const maliciousTableName = 'post"; DELETE FROM "post';

					// ACT
					try {
						await queryRunner.clearTable(maliciousTableName);
					} catch (error) {
						// Expected to fail - the important thing is
						// that it doesn't execute the injected SQL
					}

					// ASSERT
					victimCount = await connection.manager.count(Post);
					expect(victimCount).to.equal(
						1,
						'Victim data was deleted - SQL injection vulnerability detected!',
					);

					// CLEANUP
					await connection.manager.delete(Post, {});
					await queryRunner.release();
				}),
		));

	it('should safely handle SQL injection in table name for Postgres', () =>
		Promise.all(
			connections
				.filter((connection) => connection.options.type === 'postgres')
				.map(async (connection) => {
					// ARRANGE
					const queryRunner = connection.createQueryRunner();
					const post = createTestPost();
					await connection.manager.save(post);

					let victimCount = await connection.manager.count(Post);
					expect(victimCount).to.equal(1);

					// Postgres uses double quotes - try to inject TRUNCATE statement
					const maliciousTableName = 'post"; TRUNCATE TABLE "post';

					// ACT
					try {
						await queryRunner.clearTable(maliciousTableName);
					} catch (error) {
						// Expected to fail - the important thing is
						// that it doesn't execute the injected SQL
					}

					// ASSERT
					victimCount = await connection.manager.count(Post);
					expect(victimCount).to.equal(
						1,
						'Victim data was deleted - SQL injection vulnerability detected!',
					);

					// CLEANUP
					await connection.manager.delete(Post, {});
					await queryRunner.release();
				}),
		));
});
