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
import type { ProjectRelation } from '@/databases/entities/ProjectRelation';

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

			const ownerProject = mockProject();
			ownerProject.projectRelations = [
				{
					project: { ...ownerProject },
					user: owner,
					role: 'project:personalOwner',
				},
			] as ProjectRelation[];

			const editorProject = mockProject();
			editorProject.projectRelations = [
				{
					project: { ...editorProject },
					user: editor,
					role: 'project:personalOwner',
				},
			] as ProjectRelation[];

			const credential = mockCredential();

			credential.shared = [
				{ role: 'credential:owner', user: owner, project: ownerProject },
				{ role: 'credential:editor', user: editor, project: editorProject },
			] as SharedCredentials[];

			const { ownedBy, sharedWith, homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(credential);

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

			expect(homeProject).toMatchObject({
				id: ownerProject.id,
				name: `${owner.firstName} ${owner.lastName} <${owner.email}>`,
				type: ownerProject.type,
			});

			expect(sharedWithProjects).toMatchObject([
				{
					id: editorProject.id,
					name: `${editor.firstName} ${editor.lastName} <${editor.email}>`,
					type: editorProject.type,
				},
			]);
		});

		test('should add `ownedBy` and `sharedWith` to workflow', async () => {
			const owner = mockUser();
			const editor = mockUser();

			const projectOwner = mockProject();
			projectOwner.projectRelations = [
				{
					project: { ...projectOwner },
					user: owner,
					role: 'project:personalOwner',
				},
			] as ProjectRelation[];

			const projectEditor = mockProject();
			projectEditor.projectRelations = [
				{
					project: { ...projectEditor },
					user: editor,
					role: 'project:personalOwner',
				},
			] as ProjectRelation[];

			const workflow = new WorkflowEntity();

			workflow.shared = [
				{ role: 'workflow:owner', user: owner, project: projectOwner },
				{ role: 'workflow:editor', user: editor, project: projectEditor },
			] as SharedWorkflow[];

			const { ownedBy, sharedWith, homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(workflow);

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

			expect(homeProject).toMatchObject({
				id: projectOwner.id,
				name: `${owner.firstName} ${owner.lastName} <${owner.email}>`,
				type: projectOwner.type,
			});
			expect(sharedWithProjects).toMatchObject([
				{
					id: projectEditor.id,
					name: `${editor.firstName} ${editor.lastName} <${editor.email}>`,
					type: projectEditor.type,
				},
			]);
		});

		test('should produce an empty sharedWith if no sharee', async () => {
			const owner = mockUser();

			const credential = mockCredential();

			const project = mockProject();

			project.projectRelations = [
				{
					user: owner,
					project: { ...project },
					role: 'project:personalOwner',
				},
			] as ProjectRelation[];

			credential.shared = [
				{ role: 'credential:owner', user: owner, project },
			] as SharedCredentials[];

			const { ownedBy, sharedWith, homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(credential);

			expect(ownedBy).toStrictEqual({
				id: owner.id,
				email: owner.email,
				firstName: owner.firstName,
				lastName: owner.lastName,
			});

			expect(sharedWith).toHaveLength(0);

			expect(homeProject).toMatchObject({
				id: project.id,
				name: `${owner.firstName} ${owner.lastName} <${owner.email}>`,
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
