import 'reflect-metadata';
import { DataSource, Table } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { TableCheck } from '../../../src/schema-builder/table/TableCheck';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('query runner > create check constraint', () => {
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

	it('should correctly create check constraint and revert creation', () =>
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
							{
								name: 'version',
								type: numericType,
							},
						],
					}),
					true,
				);

				// clear sqls in memory to avoid removing tables when down queries executed.
				queryRunner.clearSqlMemory();

				const driver = connection.driver;
				const check1 = new TableCheck({
					expression: `${driver.escape(
						'name',
					)} <> 'asd' AND ${driver.escape('description')} <> 'test'`,
				});
				const check2 = new TableCheck({
					expression: `(${driver.escape('id')} < 0 AND ${driver.escape(
						'version',
					)} < 9999) OR (${driver.escape('id')} > 9999 AND ${driver.escape('version')} < 888)`,
				});
				const check3 = new TableCheck({
					expression: `${driver.escape('id')} + ${driver.escape('version')} > 0`,
				});
				await queryRunner.createCheckConstraint('question', check1);
				await queryRunner.createCheckConstraint('question', check2);
				await queryRunner.createCheckConstraint('question', check3);

				let table = await queryRunner.getTable('question');
				table!.checks.length.should.be.equal(3);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('question');
				table!.checks.length.should.be.equal(0);

				await queryRunner.release();
			}),
		));
});
