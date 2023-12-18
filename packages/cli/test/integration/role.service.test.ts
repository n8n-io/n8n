import { RoleService } from '@/services/role.service';
import { createAdmin, createMember, createOwner } from './shared/db/users';
import * as testDb from './shared/testDb';
import { mock } from 'jest-mock-extended';
import { RoleRepository } from '@/databases/repositories/role.repository';
import Container from 'typedi';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';

describe('RoleService', () => {
	let roleService: RoleService;

	beforeAll(async () => {
		await testDb.init();

		roleService = new RoleService(
			Container.get(RoleRepository),
			Container.get(SharedWorkflowRepository),
			mock(),
		);

		testDb.truncate(['User']);
	});

	afterEach(async () => {
		await testDb.truncate(['SharedWorkflow']);
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

			const usersByRole = await roleService.countUsersByRole();

			expect(usersByRole).toStrictEqual({ admin: 2, member: 3, owner: 1 });
		});
	});
});
