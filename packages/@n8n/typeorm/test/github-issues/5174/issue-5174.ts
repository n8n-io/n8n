import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource } from '../../../src';
import { User } from './entity/User';
import { Role } from './entity/Role';
import {
	createTestingConnections,
	reloadTestingDatabases,
	closeTestingConnections,
} from '../../utils/test-utils';

describe('github issues > #5174 `selectQueryBuilder.take` messes up the query when using the `ids` parameter', () => {
	let connections: DataSource[];

	before(async () => {
		connections = await createTestingConnections({
			entities: [User, Role],
			schemaCreate: true,
			dropSchema: true,
		});
	});
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should allow the 'ids' parameter without messing up the query when using .take", () =>
		Promise.all(
			connections.map(async (connection) => {
				const roleRepository = connection.getRepository(Role);
				const userRepository = connection.getRepository(User);

				const userWithId = (id: number) => ({ id });

				await roleRepository.save([
					{ id: 'a', users: [1, 2, 3].map(userWithId) },
					{ id: 'b', users: [9, 10, 11, 12, 13].map(userWithId) },
					{ id: 'c', users: [14, 15, 16, 17].map(userWithId) },
				]);

				const results = await userRepository
					.createQueryBuilder('user')
					.leftJoinAndSelect('user.role', 'role')
					.where('role.id IN (:...ids)', { ids: ['a', 'c'] })
					.take(5)
					.orderBy('user.id')
					.getMany();

				expect(results).to.be.deep.equal([
					{ id: 1, role: { id: 'a' } },
					{ id: 2, role: { id: 'a' } },
					{ id: 3, role: { id: 'a' } },
					{ id: 14, role: { id: 'c' } },
					{ id: 15, role: { id: 'c' } },
				]);
			}),
		));
});
