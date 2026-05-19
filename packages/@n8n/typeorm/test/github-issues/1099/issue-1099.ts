import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { Animal } from './entity/Animal';

describe('github issues > #1099 BUG - QueryBuilder MySQL skip sql is wrong', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('drivers which does not support offset without limit should throw an exception, other drivers must work fine', () =>
		Promise.all(
			connections.map(async (connection) => {
				let animals = ['cat', 'dog', 'bear', 'snake'];
				for (let animal of animals) {
					await connection.getRepository(Animal).save({ name: animal });
				}

				const qb = connection
					.getRepository(Animal)
					.createQueryBuilder('a')
					.leftJoinAndSelect('a.categories', 'categories')
					.orderBy('a.id')
					.skip(1);

				await qb.getManyAndCount().should.eventually.be.eql([
					[
						{ id: 2, name: 'dog', categories: [] },
						{ id: 3, name: 'bear', categories: [] },
						{ id: 4, name: 'snake', categories: [] },
					],
					4,
				]);
			}),
		));
});
