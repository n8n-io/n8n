import { mockInstance } from '@n8n/backend-test-utils';
import type { SharedCredentials } from '@n8n/db';
import {
	Project,
	SharedWorkflow,
	User,
	WorkflowEntity,
	ProjectRelation,
	ProjectRelationRepository,
	SharedWorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { OwnershipService } from '@/services/ownership.service';
import { mockCredential, mockProject } from '@test/mock-objects';

import { CacheService } from '../cache/cache.service';

describe('OwnershipService', () => {
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const cacheService = mockInstance(CacheService);
	const ownershipService = new OwnershipService(
		cacheService,
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

	describe('getPersonalProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			// ARRANGE
			const project = new Project();
			const owner = new User();
			const projectRelation = new ProjectRelation();
			projectRelation.role = 'project:personalOwner';
			(projectRelation.project = project), (projectRelation.user = owner);

			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([projectRelation]);

			// ACT
			const returnedOwner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			// ASSERT
			expect(returnedOwner).toBe(owner);
		});

		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);

			const owner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(owner).toBeNull();
		});

		test('should not use the repository if the owner was found in the cache', async () => {
			// ARRANGE
			const project = new Project();
			project.id = uuid();
			const owner = new User();
			owner.id = uuid();
			const projectRelation = new ProjectRelation();
			projectRelation.role = 'project:personalOwner';
			(projectRelation.project = project), (projectRelation.user = owner);

			cacheService.getHashValue.mockResolvedValueOnce(owner);
			userRepository.create.mockReturnValueOnce(owner);

			// ACT
			const foundOwner = await ownershipService.getPersonalProjectOwnerCached(project.id);

			// ASSERT
			expect(cacheService.getHashValue).toHaveBeenCalledTimes(1);
			expect(cacheService.getHashValue).toHaveBeenCalledWith('project-owner', project.id);
			expect(projectRelationRepository.getPersonalProjectOwners).not.toHaveBeenCalled();
			expect(foundOwner).toEqual(owner);
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

			const returnedOwner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(returnedOwner).toBe(mockOwner);
		});

		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);

			const owner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');

			expect(owner).toBeNull();
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
				name: ownerProject.name,
				type: ownerProject.type,
			});

			expect(sharedWithProjects).toMatchObject([
				{
					id: editorProject.id,
					name: editorProject.name,
					type: editorProject.type,
				},
			]);
		});

		test('should add `ownedBy` and `sharedWith` to workflow', async () => {
			const projectOwner = mockProject();
			const projectEditor = mockProject();

			const workflow = new WorkflowEntity();

			workflow.shared = [
				{ role: 'workflow:owner', project: projectOwner },
				{ role: 'workflow:editor', project: projectEditor },
			] as SharedWorkflow[];

			const { homeProject, sharedWithProjects } =
				ownershipService.addOwnedByAndSharedWith(workflow);

			expect(homeProject).toMatchObject({
				id: projectOwner.id,
				name: projectOwner.name,
				type: projectOwner.type,
			});
			expect(sharedWithProjects).toMatchObject([
				{
					id: projectEditor.id,
					name: projectEditor.name,
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
				name: project.name,
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
