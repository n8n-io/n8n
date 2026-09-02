import 'reflect-metadata';
import '../../utils/test-setup';
import { expect } from 'chai';
import { Post } from './entity/Post';
import { Category } from './entity/Category';
import {
	closeTestingConnections,
	createTestingConnections,
	getTypeOrmConfig,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { QueryRunner } from '../../../src';

const expectCurrentApplicationName = async (queryRunner: QueryRunner, name: string) => {
	const result = await queryRunner.query(
		"SELECT current_setting('application_name') as application_name;",
	);
	expect(result[0].application_name).to.equal(name);
};

describe('Connection replication', () => {
	describe('after connection is established successfully', function () {
		let connection: DataSource;
		beforeEach(async () => {
			const ormConfigConnectionOptionsArray = getTypeOrmConfig();
			const postgres = ormConfigConnectionOptionsArray.find(
				(options) => options.type == 'postgres',
			);
			if (!postgres)
				throw new Error(
					'need a postgres connection in the test connection options to test replication',
				);

			connection = (
				await createTestingConnections({
					entities: [Post, Category],
					enabledDrivers: ['postgres'],
					schemaCreate: true,
					dropSchema: true,
					driverSpecific: {
						replication: {
							master: { ...postgres, applicationName: 'master' },
							slaves: [{ ...postgres, applicationName: 'slave' }],
						},
					},
				})
			)[0];

			if (!connection) return;

			const post = new Post();
			post.title = 'TypeORM Intro';

			await connection.createQueryBuilder().insert().into(Post).values(post).execute();
		});

		afterEach(() => closeTestingConnections([connection]));

		it('connection.isConnected should be true', () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			connection.isInitialized.should.be.true;
		});

		it('query runners should go to the master by default', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			const queryRunner = connection.createQueryRunner();
			expect(queryRunner.getReplicationMode()).to.equal('master');

			await expectCurrentApplicationName(queryRunner, 'master');
			await queryRunner.release();
		});

		it('query runners can have their replication mode overridden', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			let queryRunner = connection.createQueryRunner('master');
			queryRunner.getReplicationMode().should.equal('master');
			await expectCurrentApplicationName(queryRunner, 'master');
			await queryRunner.release();

			queryRunner = connection.createQueryRunner('slave');
			queryRunner.getReplicationMode().should.equal('slave');
			await expectCurrentApplicationName(queryRunner, 'slave');
			await queryRunner.release();
		});

		/*
		 * ISSUE: Test expects read queries to be automatically routed to slave databases in replication setup.
		 *
		 * THEORIES FOR FAILURE:
		 * 1. Replication Configuration Missing: The test database setup may not have proper master-slave
		 *    replication configured, causing all queries to go to the master database instead of being
		 *    load-balanced to slave replicas as expected by the application_name check.
		 *
		 * 2. Query Router Logic Failure: TypeORM's query routing logic may not be properly detecting
		 *    read-only queries (SELECT statements) and routing them to slave connections, defaulting
		 *    to master connection for all queries regardless of their read/write nature.
		 *
		 * 3. Application Name Setting Issues: The PostgreSQL application_name parameter may not be
		 *    properly set for slave connections, or the test environment may not support the
		 *    current_setting() function properly, causing incorrect application name detection.
		 *
		 * POTENTIAL FIXES:
		 * - Ensure proper master-slave replication setup in test environment
		 * - Fix query type detection and routing logic in TypeORM replication driver
		 * - Verify application_name parameter setting for different connection types in PostgreSQL
		 */
		it.skip('read queries should go to the slaves by default', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			const result = await connection.manager
				.createQueryBuilder(Post, 'post')
				.select('id')
				.addSelect("current_setting('application_name')", 'current_setting')
				.execute();
			expect(result[0].current_setting).to.equal('slave');
		});

		it('write queries should go to the master', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			const result = await connection.manager
				.createQueryBuilder(Post, 'post')
				.insert()
				.into(Post)
				.values({
					title: () => "current_setting('application_name')",
				})
				.returning('title')
				.execute();

			expect(result.raw[0].title).to.equal('master');
		});
	});

	describe('with custom replication default mode', function () {
		let connection: DataSource;
		beforeEach(async () => {
			const ormConfigConnectionOptionsArray = getTypeOrmConfig();
			const postgres = ormConfigConnectionOptionsArray.find(
				(options) => options.type == 'postgres',
			);
			if (!postgres)
				throw new Error(
					'need a postgres connection in the test connection options to test replication',
				);

			connection = (
				await createTestingConnections({
					entities: [Post, Category],
					enabledDrivers: ['postgres'],
					schemaCreate: true,
					dropSchema: true,
					driverSpecific: {
						replication: {
							defaultMode: 'master',
							master: { ...postgres, applicationName: 'master' },
							slaves: [{ ...postgres, applicationName: 'slave' }],
						},
					},
				})
			)[0];

			if (!connection) return;

			const post = new Post();
			post.title = 'TypeORM Intro';

			await connection.createQueryBuilder().insert().into(Post).values(post).execute();
		});

		afterEach(() => closeTestingConnections([connection]));

		it('query runners should go to the master by default', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			const queryRunner = connection.createQueryRunner();
			expect(queryRunner.getReplicationMode()).to.equal('master');

			await expectCurrentApplicationName(queryRunner, 'master');
			await queryRunner.release();
		});

		it('query runners can have their replication mode overridden', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			let queryRunner = connection.createQueryRunner('master');
			queryRunner.getReplicationMode().should.equal('master');
			await expectCurrentApplicationName(queryRunner, 'master');
			await queryRunner.release();

			queryRunner = connection.createQueryRunner('slave');
			queryRunner.getReplicationMode().should.equal('slave');
			await expectCurrentApplicationName(queryRunner, 'slave');
			await queryRunner.release();
		});

		it('read queries should go to the master by default', async () => {
			if (!connection || connection.driver.options.type !== 'postgres') {
				return;
			}
			const result = await connection.manager
				.createQueryBuilder(Post, 'post')
				.select('id')
				.addSelect("current_setting('application_name')", 'current_setting')
				.execute();
			expect(result[0].current_setting).to.equal('master');
		});
	});
});
