import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Author } from './entity/Author';
import { Post } from './entity/Post';
import { CheckedUser, User } from './entity/User';
import { CreatePostTable1656926770819 } from './migration/1656926770819-CreatePostTable';
import { CreateAuthorTable1656939116999 } from './migration/1656939116999-CreateAuthorTable';
import { AddAuthorIdColumn1656939646470 } from './migration/1656939646470-AddAuthorIdColumn';
import { CreateUserTable1657066872930 } from './migration/1657066872930-CreateUserTable';
import { CreateUniqueConstraintToUser1657067039714 } from './migration/1657067039714-CreateUniqueConstraintToUser';
import { CreateCheckedUserTable1657067039715 } from './migration/1657067039715-CreateCheckedUserTable';
import { CreateCheckConstraintToUser1657067039716 } from './migration/1657067039716-CreateCheckConstraintToUser';
import { expect } from 'chai';

describe('github issues > #9176 The names of foreign keys created by queryRunner.createForeignKey and schema:sync are different with SQLite', () => {
	describe('github issues > #9176 foreign keys', () => {
		let dataSources: DataSource[];
		before(
			async () =>
				(dataSources = await createTestingConnections({
					entities: [Author, Post],
					enabledDrivers: ['sqlite', 'sqlite-pooled'],
					migrations: [
						CreatePostTable1656926770819,
						CreateAuthorTable1656939116999,
						AddAuthorIdColumn1656939646470,
					],
					schemaCreate: false,
					dropSchema: true,
				})),
		);
		after(() => closeTestingConnections(dataSources));

		it('should not generate queries when created foreign key with queryRunnner.createForeignKey', () =>
			Promise.all(
				dataSources.map(async (dataSource) => {
					await dataSource.runMigrations();
					const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

					expect(sqlInMemory.upQueries).to.empty;
					expect(sqlInMemory.downQueries).to.empty;
				}),
			));
	});

	describe('github issues > #9176 unique constraint', () => {
		let dataSources: DataSource[];
		before(
			async () =>
				(dataSources = await createTestingConnections({
					entities: [User],
					enabledDrivers: ['sqlite', 'sqlite-pooled'],
					migrations: [CreateUserTable1657066872930, CreateUniqueConstraintToUser1657067039714],
					schemaCreate: false,
					dropSchema: true,
				})),
		);
		after(() => closeTestingConnections(dataSources));

		it('should not generate queries when created unique constraint with queryRunnner.createUniqueConstraint', () =>
			Promise.all(
				dataSources.map(async (dataSource) => {
					await dataSource.runMigrations();
					const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

					expect(sqlInMemory.upQueries).to.empty;
					expect(sqlInMemory.downQueries).to.empty;
				}),
			));
	});

	describe('github issues > #9176 check constraint', () => {
		let dataSources: DataSource[];
		before(
			async () =>
				(dataSources = await createTestingConnections({
					entities: [CheckedUser],
					enabledDrivers: ['sqlite', 'sqlite-pooled'],
					migrations: [
						CreateCheckedUserTable1657067039715,
						CreateCheckConstraintToUser1657067039716,
					],
					schemaCreate: false,
					dropSchema: true,
				})),
		);
		after(() => closeTestingConnections(dataSources));

		it('should not generate queries when created check constraint with queryRunnner.createCheckConstraint', () =>
			Promise.all(
				dataSources.map(async (dataSource) => {
					await dataSource.runMigrations();
					const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

					expect(sqlInMemory.upQueries).to.empty;
					expect(sqlInMemory.downQueries).to.empty;
				}),
			));
	});
});
