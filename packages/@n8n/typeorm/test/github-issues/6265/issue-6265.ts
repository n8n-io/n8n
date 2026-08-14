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

describe('github issues > #6265 `fix: resolve issue with find with relations returns soft-deleted entities', () => {
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

	it('should soft delete one record in relation table', () =>
		Promise.all(
			connections.map(async (connection) => {
				const role = new Role();
				role.title = 'Manager';
				await connection.manager.save(role);

				const firstUser = new User();
				firstUser.name = 'Alex Messer';
				firstUser.role = role;
				await connection.manager.save(firstUser);

				const secondUser = new User();
				secondUser.name = 'Timber Saw';
				secondUser.role = role;
				await connection.manager.save(secondUser);

				const roleWithAllUser = await connection.manager
					.createQueryBuilder(Role, 'role')
					.leftJoinAndSelect('role.users', 'users')
					.getMany();
				expect(roleWithAllUser[0].users.length).eq(2);
				expect(
					roleWithAllUser.should.be.eql([
						{
							id: 1,
							title: 'Manager',
							deleteDate: null,
							users: [
								{ id: 1, name: 'Alex Messer', deleteAt: null },
								{ id: 2, name: 'Timber Saw', deleteAt: null },
							],
						},
					]),
				);

				await connection.manager
					.createQueryBuilder(User, 'user')
					.softDelete()
					.where({ name: 'Timber Saw' })
					.execute();

				const roleWithUserIsNotSoftDelete = await connection.manager
					.createQueryBuilder(Role, 'role')
					.leftJoinAndSelect('role.users', 'users')
					.getMany();

				expect(roleWithUserIsNotSoftDelete[0].users.length).eq(1);

				expect(
					roleWithUserIsNotSoftDelete.should.be.eql([
						{
							id: 1,
							title: 'Manager',
							deleteDate: null,
							users: [{ id: 1, name: 'Alex Messer', deleteAt: null }],
						},
					]),
				);
				const roleWithUserSoftDelete = await connection.manager
					.createQueryBuilder(Role, 'role')
					.withDeleted()
					.leftJoinAndSelect('role.users', 'users')
					.getMany();

				expect(roleWithUserSoftDelete[0].users.length).eq(2);
				expect(roleWithUserSoftDelete[0].users[1].deleteAt).to.be.not.null;
			}),
		));
});
