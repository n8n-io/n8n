import 'reflect-metadata';
import { DataSource } from '../../../src';

import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';

import { Post as Post1 } from './entity/post_with_null_1.entity';
import { Post as Post2 } from './entity/post_with_null_2.entity';

describe('github issues > #6950 postgres: Inappropiate migration generated for `default: null`', () => {
	describe('null default', () => {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					schemaCreate: false,
					dropSchema: true,
					entities: [Post1],
				})),
		);
		after(() => closeTestingConnections(connections));

		it('can recognize model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sqlInMemory = await connection.driver.createSchemaBuilder().log();
					sqlInMemory.upQueries.length.should.be.greaterThan(0);
					sqlInMemory.downQueries.length.should.be.greaterThan(0);
				}),
			));

		it('does not generate when no model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.driver.createSchemaBuilder().build();

					const sqlInMemory = await connection.driver.createSchemaBuilder().log();

					sqlInMemory.upQueries.length.should.be.equal(0);
					sqlInMemory.downQueries.length.should.be.equal(0);
				}),
			));
	});

	describe('null default and nullable', () => {
		let connections: DataSource[];
		before(
			async () =>
				(connections = await createTestingConnections({
					schemaCreate: false,
					dropSchema: true,
					entities: [Post2],
				})),
		);
		after(() => closeTestingConnections(connections));

		it('can recognize model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					const sqlInMemory = await connection.driver.createSchemaBuilder().log();
					sqlInMemory.upQueries.length.should.be.greaterThan(0);
					sqlInMemory.downQueries.length.should.be.greaterThan(0);
				}),
			));

		it('does not generate when no model changes', () =>
			Promise.all(
				connections.map(async (connection) => {
					await connection.driver.createSchemaBuilder().build();

					const sqlInMemory = await connection.driver.createSchemaBuilder().log();

					sqlInMemory.upQueries.length.should.be.equal(0);
					sqlInMemory.downQueries.length.should.be.equal(0);
				}),
			));
	});
});
