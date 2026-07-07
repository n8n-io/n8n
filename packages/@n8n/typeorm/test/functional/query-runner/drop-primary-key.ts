import 'reflect-metadata';
import { DataSource } from '../../../src/data-source/DataSource';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('query runner > drop primary key', () => {
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

	it('should correctly drop primary key and revert drop', () =>
		Promise.all(
			connections.map(async (connection) => {
				const queryRunner = connection.createQueryRunner();

				let table = await queryRunner.getTable('post');
				table!.findColumnByName('id')!.isPrimary.should.be.true;

				await queryRunner.dropPrimaryKey(table!);

				table = await queryRunner.getTable('post');
				table!.findColumnByName('id')!.isPrimary.should.be.false;

				await queryRunner.executeMemoryDownSql();

				table = await queryRunner.getTable('post');
				table!.findColumnByName('id')!.isPrimary.should.be.true;

				await queryRunner.release();
			}),
		));
});
