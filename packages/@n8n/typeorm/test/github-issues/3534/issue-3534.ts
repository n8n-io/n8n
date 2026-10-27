import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import { Foo } from './entity/Foo';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

describe('github issues > #3534: store regexp', () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('allows entities with regexp columns', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repository = connection.getRepository(Foo);

				const foo = new Foo();
				foo.bar = /foo/i;
				const savedFoo = await repository.save(foo);
				expect(savedFoo.bar).to.instanceOf(RegExp);
				expect(savedFoo.bar.toString()).to.eq(/foo/i.toString());
				const storedFoo = await repository.findOneByOrFail({
					id: foo.id,
				});
				expect(storedFoo.bar).to.instanceOf(RegExp);
				expect(storedFoo.bar.toString()).to.eq(/foo/i.toString());
			}),
		));
});
