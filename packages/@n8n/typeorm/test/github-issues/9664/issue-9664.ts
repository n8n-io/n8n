import { JsonContains, DataSource } from '../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Address } from './entities/Address';
import { expect } from 'chai';

describe('github issues > #9664 add JsonContains operator ', () => {
	let dataSources: DataSource[];

	before(async () => {
		dataSources = await createTestingConnections({
			entities: [Address],
			enabledDrivers: ['postgres'],
			schemaCreate: true,
			dropSchema: true,
		});
	});

	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should find addresses in json field by name', async () => {
		await Promise.all(
			dataSources.map(async (dataSource) => {
				const address1 = new Address();
				address1.country = {
					code: 1,
					name: 'United States',
				};
				address1.city = {
					id: 1,
					name: 'New York',
				};

				const address2 = new Address();
				address2.country = {
					code: 2,
					name: 'Germany',
				};
				address2.city = {
					id: 2,
					name: 'Berlin',
				};

				await dataSource.manager.save([address1, address2]);

				const addressesByName = await dataSource.manager.find(Address, {
					where: {
						city: JsonContains({ name: 'Berlin' }),
					},
				});

				const emptyAddressesResult = await dataSource.manager.find(Address, {
					where: {
						city: JsonContains({
							name: 'Berl',
						}),
					},
				});

				// check than operator find correctl
				expect(addressesByName).to.have.length(1);

				expect(addressesByName.find((address) => address.city.name === 'Berlin')).to.be.not
					.undefined;

				// check than operator find correctly empty result
				expect(emptyAddressesResult).to.have.length(0);
			}),
		);
	});
});
