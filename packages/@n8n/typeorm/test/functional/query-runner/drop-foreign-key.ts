import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > drop foreign key', () => {
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

	it('should correctly drop foreign key and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('student');
				table!.foreignKeys.length.should.be.equal(2);

				await queryRunner.dropForeignKey(table!, table!.foreignKeys[0]);

				table = await queryRunner.getTable('student');
				table!.foreignKeys.length.should.be.equal(1);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('student');
				table!.foreignKeys.length.should.be.equal(2);

				await queryRunner.release();
			}),
		));
});
