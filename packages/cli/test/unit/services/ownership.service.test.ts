import { OwnershipService } from '@/services/ownership.service';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import { mockInstance } from '../../shared/mocking';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { UserRepository } from '@/databases/repositories/user.repository';
import { mock } from 'jest-mock-extended';
import { mockCredential, mockProject, mockUser } from '../shared/mockObjects';

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
			const ownerProject = mockProject();
			const editorProject = mockProject();

			const credential = mockCredential();

			credential.shared = [
				{ role: 'credential:owner', project: ownerProject },
				{ role: 'credential:editor', project: editorProject },
			] as SharedCredentials[];

			const { homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(credential);

			expect(homeProject).toMatchObject({
				id: ownerProject.id,
				name: 'My n8n',
				type: ownerProject.type,
			});

			expect(sharedWithProjects).toMatchObject([
				{
					id: editorProject.id,
					name: 'My n8n',
					type: editorProject.type,
				},
			]);
		});

		test('should add `ownedBy` and `sharedWith` to workflow', async () => {
			const owner = mockUser();
			const editor = mockUser();

			const projectOwner = mockProject();
			const projectEditor = mockProject();

			const workflow = new WorkflowEntity();

			workflow.shared = [
				{ role: 'workflow:owner', user: owner, project: projectOwner },
				{ role: 'workflow:editor', user: editor, project: projectEditor },
			] as SharedWorkflow[];

			const { homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(workflow);

			expect(homeProject).toMatchObject({
				id: projectOwner.id,
				name: 'My n8n',
				type: projectOwner.type,
			});
			expect(sharedWithProjects).toMatchObject([
				{
					id: projectEditor.id,
					name: 'My n8n',
					type: projectEditor.type,
				},
			]);
		});

		test('should produce an empty sharedWith if no sharee', async () => {
			const credential = mockCredential();

			const project = mockProject();

			credential.shared = [{ role: 'credential:owner', project }] as SharedCredentials[];

			const { homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(credential);

			expect(homeProject).toMatchObject({
				id: project.id,
				name: 'My n8n',
				type: project.type,
			});

			expect(sharedWithProjects).toHaveLength(0);
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
