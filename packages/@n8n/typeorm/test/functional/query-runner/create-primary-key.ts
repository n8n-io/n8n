import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Table } from '../../../src/schema-builder/table/Table';

describe('query runner > create primary key', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly create primary key and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'category',
						columns: [
							{
								name: 'id',
								type: 'int',
							},
							{
								name: 'name',
								type: 'varchar',
							},
						],
					}),
					true,
				);

				await queryRunner.createTable(
					new Table({
						name: 'person',
						columns: [
							{
								name: 'id',
								type: 'int',
							},
							{
								name: 'userId',
								type: 'int',
							},
							{
								name: 'name',
								type: 'varchar',
							},
						],
					}),
					true,
				);

				// clear sqls in memory to avoid removing tables when down queries executed.
				queryRunner.clearSqlMemory();

				await queryRunner.createPrimaryKey('category', ['id']);
				await queryRunner.createPrimaryKey('person', ['id', 'userId']);

				let categoryTable = await queryRunner.getTable('category');
				categoryTable!.findColumnByName('id')!.isPrimary.should.be.true;

				let personTable = await queryRunner.getTable('person');
				personTable!.findColumnByName('id')!.isPrimary.should.be.true;
				personTable!.findColumnByName('userId')!.isPrimary.should.be.true;

				await queryRunner.executeMemoryDownSql();

				categoryTable = await queryRunner.getTable('category');
				categoryTable!.findColumnByName('id')!.isPrimary.should.be.false;

				personTable = await queryRunner.getTable('person');
				personTable!.findColumnByName('id')!.isPrimary.should.be.false;
				personTable!.findColumnByName('userId')!.isPrimary.should.be.false;

				await queryRunner.release();
			}),
		));
});
