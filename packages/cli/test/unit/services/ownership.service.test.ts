import { OwnershipService } from '@/services/ownership.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { Role } from '@db/entities/Role';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import { RoleService } from '@/services/role.service';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import { mockInstance } from '../../shared/mocking';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { UserRepository } from '@/databases/repositories/user.repository';
import { mock } from 'jest-mock-extended';
import {
	mockCredRole,
	mockCredential,
	mockUser,
	mockInstanceOwnerRole,
	wfOwnerRole,
} from '../shared/mockObjects';

describe('OwnershipService', () => {
	const roleService = mockInstance(RoleService);
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);

	const ownershipService = new OwnershipService(
		mock(),
		userRepository,
		roleService,
		sharedWorkflowRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('OwnershipService', () => {
		const roleService = mockInstance(RoleService);
		const userRepository = mockInstance(UserRepository);
		const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);

		const ownershipService = new OwnershipService(
			mock(),
			userRepository,
			roleService,
			sharedWorkflowRepository,
		);

		beforeEach(() => {
			jest.clearAllMocks();
		});

		describe('getWorkflowOwner()', () => {
			test('should retrieve a workflow owner', async () => {
				roleService.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

				const mockOwner = new User();
				const mockNonOwner = new User();

				const sharedWorkflow = Object.assign(new SharedWorkflow(), {
					role: new Role(),
					user: mockOwner,
				});

				sharedWorkflowRepository.findOneOrFail.mockResolvedValueOnce(sharedWorkflow);

				const returnedOwner = await ownershipService.getWorkflowOwnerCached('some-workflow-id');

				expect(returnedOwner).toBe(mockOwner);
				expect(returnedOwner).not.toBe(mockNonOwner);
			});

			test('should throw if no workflow owner role found', async () => {
				roleService.findWorkflowOwnerRole.mockRejectedValueOnce(new Error());

				await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
			});

			test('should throw if no workflow owner found', async () => {
				roleService.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

				sharedWorkflowRepository.findOneOrFail.mockRejectedValue(new Error());

				await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
			});
		});

		describe('addOwnedByAndSharedWith()', () => {
			test('should add `ownedBy` and `sharedWith` to credential', async () => {
				const owner = mockUser();
				const editor = mockUser();

				const credential = mockCredential();

				credential.shared = [
					{ role: mockCredRole('owner'), user: owner },
					{ role: mockCredRole('editor'), user: editor },
				] as SharedCredentials[];

				const { ownedBy, sharedWith } = ownershipService.addOwnedByAndSharedWith(credential);

				expect(ownedBy).toStrictEqual({
					id: owner.id,
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
				});

				expect(sharedWith).toStrictEqual([
					{
						id: editor.id,
						email: editor.email,
						firstName: editor.firstName,
						lastName: editor.lastName,
					},
				]);
			});

			test('should add `ownedBy` and `sharedWith` to workflow', async () => {
				const owner = mockUser();
				const editor = mockUser();

				const workflow = new WorkflowEntity();

				workflow.shared = [
					{ role: mockCredRole('owner'), user: owner },
					{ role: mockCredRole('editor'), user: editor },
				] as SharedWorkflow[];

				const { ownedBy, sharedWith } = ownershipService.addOwnedByAndSharedWith(workflow);

				expect(ownedBy).toStrictEqual({
					id: owner.id,
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
				});

				expect(sharedWith).toStrictEqual([
					{
						id: editor.id,
						email: editor.email,
						firstName: editor.firstName,
						lastName: editor.lastName,
					},
				]);
			});

			test('should produce an empty sharedWith if no sharee', async () => {
				const owner = mockUser();

				const credential = mockCredential();

				credential.shared = [{ role: mockCredRole('owner'), user: owner }] as SharedCredentials[];

				const { ownedBy, sharedWith } = ownershipService.addOwnedByAndSharedWith(credential);

				expect(ownedBy).toStrictEqual({
					id: owner.id,
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
				});

				expect(sharedWith).toHaveLength(0);
			});
		});

		describe('getInstanceOwner()', () => {
			test('should find owner using global owner role ID', async () => {
				const instanceOwnerRole = mockInstanceOwnerRole();
				roleService.findGlobalOwnerRole.mockResolvedValue(instanceOwnerRole);

				await ownershipService.getInstanceOwner();

				expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
					where: { globalRoleId: instanceOwnerRole.id },
					relations: ['globalRole'],
				});
			});
		});
	});
});
