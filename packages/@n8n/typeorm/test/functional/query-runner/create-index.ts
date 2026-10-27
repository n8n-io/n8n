import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Table } from '../../../src/schema-builder/table/Table';
import { TableIndex } from '../../../src/schema-builder/table/TableIndex';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('query runner > create index', () => {
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

	it('should correctly create index and revert creation', () =>
		Promise.all(
			connections.map(async (connection) => {
				let numericType = 'int';
				if (DriverUtils.isSQLiteFamily(connection.driver)) {
					numericType = 'integer';
				}

				let stringType = 'varchar';

				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'question',
						columns: [
							{
								name: 'id',
								type: numericType,
								isPrimary: true,
							},
							{
								name: 'name',
								type: stringType,
							},
							{
								name: 'description',
								type: stringType,
							},
						],
					}),
					true,
				);

				// clear sqls in memory to avoid removing tables when down queries executed.
				queryRunner.clearSqlMemory();

				const index = new TableIndex({
					columnNames: ['name', 'description'],
				});
				await queryRunner.createIndex('question', index);

				const uniqueIndex = new TableIndex({
					columnNames: ['description'],
					isUnique: true,
				});
				await queryRunner.createIndex('question', uniqueIndex);

				let table = await queryRunner.getTable('question');

				table!.indices.length.should.be.equal(2);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('question');
				table!.indices.length.should.be.equal(0);
				table!.uniques.length.should.be.equal(0);

				await queryRunner.release();
			}),
		));
});
