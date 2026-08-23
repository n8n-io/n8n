import { DataSource } from '../../../../../src';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../../utils/test-utils';
import { UserEntitySchema } from './entity/User';
import { expect } from 'chai';

describe('entity-schema > embedded - plain-object', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [UserEntitySchema],
			})),
	);

	beforeEach(() => reloadTestingDatabases(connections));

	after(() => closeTestingConnections(connections));

	it('should save entity with embedded', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(UserEntitySchema);
				const newUser = userRepository.create({
					isActive: true,
					name: {
						first: 'firstName',
						last: 'lastName',
					},
				});
				const savedUser = await userRepository.save(newUser);

				expect(savedUser.name).to.contains({
					first: 'firstName',
					last: 'lastName',
				});
			}),
		));

	it('should contains instance of plain object for embedded entity', () =>
		Promise.all(
			connections.map(async (connection) => {
				const userRepository = connection.getRepository(UserEntitySchema);
				const newUser = userRepository.create({
					isActive: true,
					name: {
						first: 'firstName',
						last: 'lastName',
					},
				});
				const savedUser = await userRepository.save(newUser);

				expect(savedUser.name).instanceOf(Object);
			}),
		));
});
