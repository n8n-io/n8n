import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import { User } from './entity/User';
import {
	createTestingConnections,
	reloadTestingDatabases,
	closeTestingConnections,
} from '../../utils/test-utils';
import { URL } from 'url';

describe('github issues > #5762 `Using URL as a rich column type breaks', () => {
	let connections: DataSource[];

	before(async () => {
		connections = await createTestingConnections({
			entities: [User],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should allow assigning URL as a field value', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(User);

				const url = new URL('https://typeorm.io');

				const user = new User();
				user.id = 1;
				user.url = url;

				const promise = userRepository.save(user);

				return expect(promise)
					.to.eventually.be.deep.equal(user)
					.and.to.have.property('url')
					.be.instanceOf(URL)
					.and.to.have.nested.property('href')
					.equal(url.href);
			}),
		));
});
