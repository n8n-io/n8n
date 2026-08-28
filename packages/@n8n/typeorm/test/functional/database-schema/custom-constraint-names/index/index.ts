import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { DataSource } from '../../../../../src';
import { Post } from './entity/Post';

describe('database schema > custom constraint names > index', () => {
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

				const nameIndex = metadata.indices.find((it) => it.name === 'IDX_NAME');
				const headerIndex = metadata.indices.find((it) => it.name === 'IDX_HEADER');

				expect(nameIndex).to.exist;
				expect(headerIndex).to.exist;
			}),
		));

	it('should load constraints with custom names', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				const table = await queryRunner.getTable('post');
				await queryRunner.release();

				const nameIndex = table!.indices.find((it) => it.name === 'IDX_NAME');
				const headerIndex = table!.indices.find((it) => it.name === 'IDX_HEADER');

				expect(nameIndex).to.exist;
				expect(headerIndex).to.exist;
			}),
		));

	it('should not change constraint names when table renamed', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				await queryRunner.renameTable('post', 'post_renamed');

				const table = await queryRunner.getTable('post_renamed');

				await queryRunner.release();

				const nameIndex = table!.indices.find((it) => it.name === 'IDX_NAME');
				const headerIndex = table!.indices.find((it) => it.name === 'IDX_HEADER');

				expect(nameIndex).to.exist;
				expect(headerIndex).to.exist;
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

				const nameIndex = table!.indices.find((it) => it.name === 'IDX_NAME');
				const headerIndex = table!.indices.find((it) => it.name === 'IDX_HEADER');

				expect(nameIndex).to.exist;
				expect(headerIndex).to.exist;
			}),
		));
});
