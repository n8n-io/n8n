import 'reflect-metadata';

import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';

import { DataSource } from '../../../src/data-source/DataSource';
import { Foo } from './entity/Foo';
import { QueryFailedError } from '../../../src';
import { expect } from 'chai';

describe('github issues > #2464 - ManyToMany onDelete option not working', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should not delete when onDelete is 'NO ACTION'", () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(Foo);

				await repo.save({ id: 1, bars: [{ description: 'test1' }] });

				try {
					await repo.delete(1);
					expect.fail();
				} catch (e) {
					e.should.be.instanceOf(QueryFailedError);
				}
			}),
		));

	it('should delete when onDelete is not set', () =>
		Promise.all(
			connections.map(async (connection) => {
				const repo = connection.getRepository(Foo);
				await repo.save({
					id: 1,
					otherBars: [{ description: 'test1' }],
				});
				await repo.delete(1);

				const foo = await repo.findOneBy({ id: 1 });
				expect(foo).to.be.null;
			}),
		));
});
