import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { ExampleEntity } from './entity/ExampleEntity';
import { expect } from 'chai';

describe('github issues > #10612', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [ExampleEntity],
			enabledDrivers: ['postgres'],
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('add table comment', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const sql = "SELECT obj_description('example'::regclass::oid, 'pg_class') AS table_comment";

				const result = await dataSource.manager.query(sql);
				expect(result).to.be.eql([{ table_comment: 'table comment' }]);
			}),
		);
	});

	it('should correctly change table comment and change', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();
				const table = await queryRunner.getTable('example');

				await queryRunner.changeTableComment(table!, 'new table comment');
				const sql = "SELECT obj_description('example'::regclass::oid, 'pg_class') AS table_comment";

				let result = await dataSource.manager.query(sql);
				expect(result).to.be.eql([{ table_comment: 'new table comment' }]);

				// revert changes
				await queryRunner.executeMemoryDownSql();

				result = await dataSource.manager.query(sql);
				expect(result).to.be.eql([{ table_comment: 'table comment' }]);

				await queryRunner.release();
			}),
		);
	});

	it('should correctly synchronize when table comment change', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const queryRunner = dataSource.createQueryRunner();

				const exampleMetadata = dataSource.getMetadata(ExampleEntity);
				exampleMetadata.comment = 'change table comment';

				await dataSource.synchronize();

				const sql = "SELECT obj_description('example'::regclass::oid, 'pg_class') AS table_comment";

				const result = await dataSource.manager.query(sql);
				expect(result).to.be.eql([{ table_comment: 'change table comment' }]);

				await queryRunner.release();
			}),
		);
	});
});
