import { And, DataSource, IsNull, LessThan, MoreThan, Not } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { User } from './entities/User';
import { expect } from 'chai';

describe('github issues > #9316 specify how should interpret null and undefined values in conditions ', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [User],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should find users what money is not null and money is more than 10 and money is less than 100', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const foo = new User();
				foo.name = 'Foo';
				foo.money = null;

				const john = new User();
				john.name = 'John';
				john.money = 11;

				const jane = new User();
				jane.name = 'Jane';
				jane.money = 90;

				const bar = new User();
				bar.name = 'Bar';
				bar.money = 101;

				await dataSource.manager.save([foo, john, jane, bar]);

				const users = await dataSource.manager.find(User, {
					where: {
						money: And(Not(IsNull()), MoreThan(10), LessThan(100)),
					},
				});

				// assert users
				expect(users).to.have.length(2);

				expect(users.find((user) => user.name === 'John')).to.be.not.undefined;

				expect(users.find((user) => user.name === 'Jane')).to.be.not.undefined;
			}),
		);
	});
});
