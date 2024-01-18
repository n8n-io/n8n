import { createAdmin, createMember, createOwner } from './shared/db/users';
import * as testDb from './shared/testDb';
import { RoleRepository } from '@/databases/repositories/role.repository';
import Container from 'typedi';

describe('RoleRepository', () => {
	let roleRepository: RoleRepository;

	beforeAll(async () => {
		await testDb.init();

		roleRepository = Container.get(RoleRepository);

		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('countUsersByRole()', () => {
		test('should return the number of users in each role', async () => {
			await Promise.all([
				createOwner(),
				createAdmin(),
				createAdmin(),
				createMember(),
				createMember(),
				createMember(),
			]);

			const usersByRole = await roleRepository.countUsersByRole();

			expect(usersByRole).toStrictEqual({ admin: 2, member: 3, owner: 1 });
		});
	});
});
