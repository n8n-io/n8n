import 'reflect-metadata';
import { DataSource, Table } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > create and drop schema', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly create and drop schema and revert it', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				await queryRunner.createSchema('myTestSchema', true);
				let hasSchema = await queryRunner.hasSchema('myTestSchema');
				hasSchema.should.be.true;

				await queryRunner.dropSchema('myTestSchema');
				hasSchema = await queryRunner.hasSchema('myTestSchema');
				hasSchema.should.be.false;

				await queryRunner.executeMemoryDownSql();

				hasSchema = await queryRunner.hasSchema('myTestSchema');
				hasSchema.should.be.false;

				await queryRunner.release();
			}),
		));

	it('should safely handle potentially malicious database names', () =>
		Promise.all(
			connections.map(async (connection) => {
				// ARRANGE
				const queryRunner = connection.createQueryRunner();
				await queryRunner.createTable(
					new Table({
						name: 'injection_test_table',
						columns: [{ name: 'id', type: 'int', isPrimary: true }],
					}),
					true,
				);
				const maliciousName = "test'; DROP TABLE injection_test_table; --";

				// ACT
				const exists = await queryRunner.hasSchema(maliciousName);

				// ASSERT
				exists.should.be.false;
				const tableExists = await queryRunner.hasTable('injection_test_table');
				tableExists.should.be.true;

				// CLEANUP
				await queryRunner.release();
			}),
		));
});
