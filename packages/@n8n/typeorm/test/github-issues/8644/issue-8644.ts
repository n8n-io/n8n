import { DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Limit, MyTable } from './entity/my-table.entity';

describe('github issues > #8644 BUG - Special keyword column name for simple-enum in sqlite', () => {
	let connections: DataSource[];

	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['sqlite', 'sqlite-pooled'],
				schemaCreate: true,
				dropSchema: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('it should be able to set special keyword as column name for simple-enum types', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(MyTable);

				await repository.insert({ limit: Limit.Bar });
			}),
		));
});
