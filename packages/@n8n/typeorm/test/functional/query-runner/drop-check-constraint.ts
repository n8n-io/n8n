import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > drop check constraint', () => {
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

	it('should correctly drop check constraint and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				table!.checks.length.should.be.equal(1);

				await queryRunner.dropCheckConstraint(table!, table!.checks[0]);

				table = await queryRunner.getTable('post');
				table!.checks.length.should.be.equal(0);

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.checks.length.should.be.equal(1);

				await queryRunner.release();
			}),
		));
});
