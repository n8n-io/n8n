import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src';
import { Foo } from './entity/Foo';
import { Bar } from './entity/Bar';
import { expect } from 'chai';

describe('query builder > composite primary', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Foo, Bar],
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should find entity by another entity with a composite key', () =>
		Promise.all(
			connections.map(async (connection) => {
				const foo = new Foo();
				foo.id1 = 1;
				foo.id2 = 2;
				await connection.manager.save(foo);

				const bar = new Bar();
				bar.id = 1;
				bar.foo = foo;
				await connection.manager.save(bar);

				const loadedBar = await connection.manager.getRepository(Bar).findOne({
					where: {
						foo,
					},
				});

				expect(loadedBar!.id).to.be.equal(bar.id);
			}),
		));
});
