import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > drop unique constraint', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'], // mysql and sap does not supports unique constraints
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should correctly drop unique constraint and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				table!.uniques.length.should.be.equal(2);

				// find composite unique constraint to delete
				const unique = table!.uniques.find((u) => u.columnNames.length === 2);
				await queryRunner.dropUniqueConstraint(table!, unique!);

				table = await queryRunner.getTable('post');
				table!.uniques.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.uniques.length.should.be.equal(2);

				await queryRunner.release();
			}),
		));
});
