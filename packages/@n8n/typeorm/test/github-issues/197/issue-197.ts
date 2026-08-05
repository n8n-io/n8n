import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { EntityMetadata } from '../../../src';
import { Person } from './entity/person';

describe('github issues > #197 Fails to drop indexes when removing fields', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: false,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('it should drop the column and the referenced index', () =>
		Promise.all(
			connections.map(async (connection) => {
				let entityMetadata: EntityMetadata = connection.getMetadata(Person);
				let idx: number = entityMetadata.columns.findIndex((x) => x.databaseName === 'firstname');
				entityMetadata.columns.splice(idx, 1);
				entityMetadata.indices = []; // clear the referenced index from metadata too

				await connection.synchronize(false);
			}),
		));
});
