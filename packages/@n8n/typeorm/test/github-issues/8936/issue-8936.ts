import '../../utils/test-setup';
import { DataSource, QueryFailedError, QueryRunner, Repository, TableIndex } from '../../../src';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { User } from './entity/User';

describe('github issues > #8936 DropIndex with a TableIndex without name is not working', () => {
	let connections: DataSource[];

	const tableIndex: TableIndex = new TableIndex({
		columnNames: ['firstName', 'lastName'],
		isUnique: true,
	});

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should drop the index as expected', () => {
		// Create a clone because the createIndex will set the name
		const dropTableIndex: TableIndex = tableIndex.clone();

		return Promise.all(
			connections.map(async (connection) => {
				const queryRunner: QueryRunner = connection.createQueryRunner();
				const userRepository: Repository<User> = connection.getRepository(User);
				const tableName: string = userRepository.metadata.tableName;

				// Create the index so it exists when we delete it
				await queryRunner.createIndex(tableName, tableIndex);

				// Drop the index expecting it not to raise QueryFailed
				await queryRunner
					.dropIndex(tableName, dropTableIndex)
					.should.not.be.rejectedWith(QueryFailedError);

				await queryRunner.release();
			}),
		);
	});
});
