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
import { Project } from '@/databases/entities/Project';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { ProjectRelation } from '@/databases/entities/ProjectRelation';

describe('OwnershipService', () => {
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const ownershipService = new OwnershipService(
		mock(),
		userRepository,
		mock(),
		projectRelationRepository,
		sharedWorkflowRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkflowProjectCached()', () => {
		test('should retrieve a workflow owner project', async () => {
			const mockProject = new Project();

			const sharedWorkflow = Object.assign(new SharedWorkflow(), {
				role: 'workflow:owner',
				project: mockProject,
			});

			sharedWorkflowRepository.findOneOrFail.mockResolvedValueOnce(sharedWorkflow);

			const returnedProject = await ownershipService.getWorkflowProjectCached('some-workflow-id');

			expect(returnedProject).toBe(mockProject);
		});

		test('should throw if no workflow owner project found', async () => {
			sharedWorkflowRepository.findOneOrFail.mockRejectedValue(new Error());

			await expect(ownershipService.getWorkflowProjectCached('some-workflow-id')).rejects.toThrow();
		});
	});

	describe('getProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			const mockProject = new Project();
			const mockOwner = new User();

			const projectRelation = Object.assign(new ProjectRelation(), {
				role: 'project:personalOwner',
				project: mockProject,
				user: mockOwner,
			});

			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([projectRelation]);

			const returnedOwner = await ownershipService.getProjectOwnerCached('some-project-id');

			expect(returnedOwner).toBe(mockOwner);
		});

		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);

			const owner = await ownershipService.getProjectOwnerCached('some-project-id');

			expect(owner).toBeNull();
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
