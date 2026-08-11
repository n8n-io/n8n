import 'reflect-metadata';
import {
	createTestingConnections,
	closeTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src/data-source/DataSource';
import { expect } from 'chai';

import { Address, LatLong, User } from './entity/User';

describe('github issues > #9272 Fix select on deeply nested embedded entities, using Repository API', () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres', 'sqlite', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should be able to pass select options for deeply nested embedded entities', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				// Arrange
				const testUser = new User();
				testUser.firstName = 'Timber';
				testUser.lastName = 'Saw';
				testUser.age = 25;

				const latLong = new LatLong();
				latLong.latitude = -23;
				latLong.longitude = -46;

				const address = new Address();
				address.latLong = latLong;

				testUser.address = address;

				await dataSource.manager.save(User, testUser);

				// Act
				const usersWithLatitudeOnly = await dataSource.manager.find(User, {
					select: {
						id: true,
						address: {
							latLong: {
								latitude: true,
							},
						},
					},
				});

				// Assert
				expect(usersWithLatitudeOnly).to.have.length(1);

				const [user] = usersWithLatitudeOnly;

				user.should.haveOwnProperty('id');
				user.should.haveOwnProperty('address');
				user.should.not.haveOwnProperty('firstName');
				user.should.not.haveOwnProperty('lastName');
				user.should.not.haveOwnProperty('age');

				user.address.latLong.should.haveOwnProperty('latitude');
				user.address.latLong.should.not.haveOwnProperty('longitude');

				user.address.latLong.latitude.should.equal(-23);
			}),
		));
});
