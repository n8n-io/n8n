import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Foo } from './entity/Foo';
import { expect } from 'chai';

describe('github issues > #2499 Postgres DELETE query result is useless', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				// skip test for sqlite because sqlite doesn't return any data on delete
				// sqljs -- the same
				// mongodb requires another test and it is also doesn't return correct number
				// of removed documents (possibly a bug with mongodb itself)
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should return correct number of affected rows for mysql, mariadb, postgres', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(Foo);

				await repo.save({ id: 1, description: 'test1' });
				await repo.save({ id: 2, description: 'test2' });
				await repo.save({ id: 3, description: 'test3' });

				// number 4 doesn't exist
				const result = await repo.delete([1, 2, 3, 4]);

				expect(result.affected).to.eql(3);
			}),
		));
});
