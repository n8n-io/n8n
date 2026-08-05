import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource, Table } from '../../../src';
import { DriverUtils } from '../../../src/driver/DriverUtils';

describe('github issues > #3379 Migration will keep create and drop indexes if index name is the same across tables', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should not recreate indices', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let postTableName: string = 'post';

				if (connection.driver.options.type === 'postgres') {
					postTableName = 'testSchema.post';
					await queryRunner.createSchema('testSchema', true);
				}

				await queryRunner.createTable(
					new Table({
						name: postTableName,
						columns: [
							{
								name: 'id',
								type: DriverUtils.isSQLiteFamily(connection.driver) ? 'integer' : 'int',
								isPrimary: true,
								isGenerated: true,
								generationStrategy: 'increment',
							},
							{
								name: 'name',
								type: 'varchar',
							},
						],
						indices: [{ name: 'name_index', columnNames: ['name'] }],
					}),
					true,
				);

				// Only MySQL and SQLServer allows non unique index names

				await queryRunner.release();

				const sqlInMemory = await connection.driver.createSchemaBuilder().log();
				sqlInMemory.upQueries.length.should.be.equal(0);
			}),
		));
});
