import 'reflect-metadata';
import { createTestingConnections, closeTestingConnections } from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { assert, expect } from 'chai';
import { PostgresQueryRunner } from '../../../src/driver/postgres/PostgresQueryRunner';
import { TableIndex } from '../../../src';
import { PostCategory } from './entity/PostCategory';
import { IndexMetadata } from '../../../src/metadata/IndexMetadata';

describe('github issues > #8459 Can not create indexes of materialized views', () => {
	const tableIndex: TableIndex = new TableIndex({
		columnNames: ['name'],
		name: 'name-idx',
	});

	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	after(() => closeTestingConnections(dataSources));

	it('should create a materialized view index at runtime', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const postgresQueryRunner: PostgresQueryRunner = <PostgresQueryRunner>(
					dataSource.createQueryRunner()
				);
				const view = await postgresQueryRunner.getView('post_category');
				assert.deepEqual(view!.indices[0], tableIndex);
			}),
		));

	it('should rename a materialized view unique index', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const postCatMetadata = dataSource.getMetadata(PostCategory);
				postCatMetadata.indices[0].name = 'renamed-ix';

				await dataSource.synchronize();

				const postgresQueryRunner: PostgresQueryRunner = <PostgresQueryRunner>(
					dataSource.createQueryRunner()
				);
				const view = await postgresQueryRunner.getView('post_category');
				await postgresQueryRunner.release();

				const index = view!.indices.find((i) => i.name === 'renamed-ix');

				expect(index).not.be.undefined;
			}),
		));

	it('should delete a materialized view index', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const postCatMetadata = dataSource.getMetadata(PostCategory);
				postCatMetadata.indices.splice(0, 1);

				await dataSource.synchronize();

				const postgresQueryRunner: PostgresQueryRunner = <PostgresQueryRunner>(
					dataSource.createQueryRunner()
				);
				const view = await postgresQueryRunner.getView('post_category');
				await postgresQueryRunner.release();
				view!.indices.length.should.be.equal(0);
			}),
		));

	it('should create a materialized view index', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const postCatMetadata = dataSource.getMetadata(PostCategory);
				const nameColumn = postCatMetadata.findColumnWithPropertyName('name')!;
				const indexMetadata = new IndexMetadata({
					entityMetadata: postCatMetadata,
					columns: [nameColumn],
					args: {
						target: PostCategory,
						synchronize: true,
						name: 'name-ix',
					},
				});
				indexMetadata.build(dataSource.namingStrategy);
				postCatMetadata.indices.push(indexMetadata);

				await dataSource.synchronize();

				const postgresQueryRunner: PostgresQueryRunner = <PostgresQueryRunner>(
					dataSource.createQueryRunner()
				);
				const view = await postgresQueryRunner.getView('post_category');
				await postgresQueryRunner.release();

				view!.indices.length.should.be.equal(1);

				postCatMetadata.indices.splice(postCatMetadata.indices.indexOf(indexMetadata), 1);
			}),
		));

	it('should create a materialized view unique index', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const postCatMetadata = dataSource.getMetadata(PostCategory);
				const nameColumn = postCatMetadata.findColumnWithPropertyName('name')!;
				const indexMetadata = new IndexMetadata({
					entityMetadata: postCatMetadata,
					columns: [nameColumn],
					args: {
						target: PostCategory,
						synchronize: true,
						name: 'name-ix',
						unique: true,
					},
				});
				indexMetadata.build(dataSource.namingStrategy);
				postCatMetadata.indices.push(indexMetadata);

				await dataSource.synchronize();

				const postgresQueryRunner: PostgresQueryRunner = <PostgresQueryRunner>(
					dataSource.createQueryRunner()
				);
				const view = await postgresQueryRunner.getView('post_category');
				await postgresQueryRunner.release();

				const index = view!.indices.find((i) => i.name === 'name-ix');

				expect(index?.isUnique).not.be.false;

				postCatMetadata.indices.splice(postCatMetadata.indices.indexOf(indexMetadata), 1);
			}),
		));
});
