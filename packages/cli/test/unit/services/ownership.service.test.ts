import { OwnershipService } from '@/services/ownership.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import { mockInstance } from '../../shared/mocking';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { UserRepository } from '@/databases/repositories/user.repository';
import { mock } from 'jest-mock-extended';
import { mockCredential, mockUser } from '../shared/mockObjects';

describe('OwnershipService', () => {
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const ownershipService = new OwnershipService(mock(), userRepository, sharedWorkflowRepository);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkflowOwner()', () => {
		test('should retrieve a workflow owner', async () => {
			const mockOwner = new User();
			const mockNonOwner = new User();

			const sharedWorkflow = Object.assign(new SharedWorkflow(), {
				role: 'workflow:owner',
				user: mockOwner,
			});

			sharedWorkflowRepository.findOneOrFail.mockResolvedValueOnce(sharedWorkflow);

			const returnedOwner = await ownershipService.getWorkflowOwnerCached('some-workflow-id');

			expect(returnedOwner).toBe(mockOwner);
			expect(returnedOwner).not.toBe(mockNonOwner);
		});

		test('should throw if no workflow owner found', async () => {
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
				{ role: 'credential:owner', user: owner },
				{ role: 'credential:editor', user: editor },
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
				{ role: 'workflow:owner', user: owner },
				{ role: 'workflow:editor', user: editor },
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

			credential.shared = [{ role: 'credential:owner', user: owner }] as SharedCredentials[];

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
			await ownershipService.getInstanceOwner();

			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: 'global:owner' },
			});
		});
	});
});
