import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';
import { Customer } from './entity/Customer';
import { CustomerContact } from './entity/CustomerContact';

describe('github issues > #8346 MySQL: Regression when using take, orderBy, and getMany on a joined relation', () => {
	let connections: DataSource[];
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

	it('should return customers ordered by contacts', () =>
		Promise.all(
			connections.map(async (connection) => {
				const [user1, user2] = await connection
					.getRepository(Customer)
					.save([{ name: 'userA' }, { name: 'userB' }]);
				await connection.getRepository(CustomerContact).save([
					{
						firstName: 'firstName1',
						lastName: 'lastName1',
						customer: user1,
					},
					{
						firstName: 'firstName2',
						lastName: 'lastName2',
						customer: user2,
					},
				]);

				const customerRepository = connection.getRepository(Customer);

				const results = await customerRepository
					.createQueryBuilder('customer')
					.leftJoinAndSelect('customer.contacts', 'contacts')
					.take(10)
					.orderBy('contacts.firstName', 'DESC')
					.getMany();

				expect(results[0].id).to.equal(user2.id);
				expect(results[1].id).to.equal(user1.id);
			}),
		));
});
