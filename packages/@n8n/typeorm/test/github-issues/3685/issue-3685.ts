import { expect } from 'chai';
import { Brackets, DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { User } from './entity/user';

describe('github issues > #3685 Brackets syntax failed when use where with object literal', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				dropSchema: true,
				schemaCreate: true,
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => connections && closeTestingConnections(connections));

	it('should accept objects in .where method (github issue #3685)', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.manager.save(
					Object.assign(new User(), {
						firstName: 'Jean',
						lastName: 'Doe',
					}),
				);

				await connection.manager.save(
					Object.assign(new User(), {
						firstName: 'John',
						lastName: 'Doe',
					}),
				);

				await connection.manager.save(
					Object.assign(new User(), {
						firstName: 'John',
						lastName: 'Dupont',
					}),
				);

				await connection.manager.save(
					Object.assign(new User(), {
						firstName: 'Fred',
						lastName: 'Doe',
					}),
				);

				const qb = connection
					.createQueryBuilder(User, 'u')
					.where(
						new Brackets((qb) => {
							qb.where({ firstName: 'John' }).orWhere('u.firstName = :firstName', {
								firstName: 'Jean',
							});
						}),
					)
					.andWhere('u.lastName = :lastName', { lastName: 'Doe' })
					.orderBy({
						'u.firstName': 'ASC',
						'u.lastName': 'ASC',
					});

				const results = await qb.getMany();

				expect(results.length).to.equal(2);

				expect(results[0].firstName).to.equal('Jean');
				expect(results[0].lastName).to.equal('Doe');

				expect(results[1].firstName).to.equal('John');
				expect(results[1].lastName).to.equal('Doe');
			}),
		));
});
