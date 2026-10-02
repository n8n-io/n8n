import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src';
import { Post } from './entity/Post';

describe('database schema > custom constraint names > unique', () => {
	let dataSources: DataSource[];

	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should set custom constraint names', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				let metadata = dataSource.getMetadata(Post);

				// This drivers stores unique constraints as unique indices.

				const unique = metadata.uniques.find((it) => it.name === 'UQ_NAME');
				expect(unique).to.exist;
			}),
		));

	it('should load constraints with custom names', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				// This drivers stores unique constraints as unique indices.

				const unique = table!.uniques.find((it) => it.name === 'UQ_NAME');
				expect(unique).to.exist;
			}),
		));

	it('should not change constraint names when table renamed', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				await queryRunner.renameTable('post', 'post_renamed');

				const table = await queryRunner.getTable('post_renamed');

				await queryRunner.release();

				// This drivers stores unique constraints as unique indices.

				const unique = table!.uniques.find((it) => it.name === 'UQ_NAME');
				expect(unique).to.exist;
			}),
		));

	it('should not change constraint names when column renamed', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();

				let table = await queryRunner.getTable('post');

				const nameColumn = table!.findColumnByName('name')!;
				const changedNameColumn = nameColumn.clone();
				changedNameColumn.name = 'name_renamed';

				await queryRunner.changeColumns(table!, [
					{
						oldColumn: nameColumn,
						newColumn: changedNameColumn,
					},
				]);

				table = await queryRunner.getTable('post');

				await queryRunner.release();

				// This drivers stores unique constraints as unique indices.

				const unique = table!.uniques.find((it) => it.name === 'UQ_NAME');
				expect(unique).to.exist;
			}),
		));
});
