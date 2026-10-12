import { mockInstance } from '@n8n/backend-test-utils';
import {
	Project,
	CredentialsEntity,
	SharedWorkflow,
	User,
	WorkflowEntity,
	ProjectRelation,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	UserRepository,
	GLOBAL_OWNER_ROLE,
	PROJECT_OWNER_ROLE,
} from '@n8n/db';
import type { SharedCredentials } from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { randomUUID } from 'node:crypto';

import { CacheService } from '../cache/cache.service';
import { OwnershipService } from '../ownership.service';

const mockCredential = () => new CredentialsEntity();
const mockProject = () =>
	Object.assign(new Project(), {
		id: randomUUID(),
		type: 'personal' as const,
		name: 'Test project',
	});

describe('OwnershipService', () => {
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const projectRepository = mockInstance(ProjectRepository);
	const cacheService = mockInstance(CacheService);

	const ownershipService = new OwnershipService(
		cacheService,
		projectRelationRepository,
		projectRepository,
		sharedWorkflowRepository,
		userRepository,
	);

	beforeEach(() => {
		vi.clearAllMocks();
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
			owner.role = GLOBAL_OWNER_ROLE;
			const projectRelation = new ProjectRelation();
			projectRelation.role = PROJECT_OWNER_ROLE;
			projectRelation.projectId = 'some-project-id';
			projectRelation.project = project;
			projectRelation.user = owner;

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
			project.id = randomUUID();
			const owner = new User();
			owner.id = randomUUID();
			owner.role = GLOBAL_OWNER_ROLE;
			const projectRelation = new ProjectRelation();
			projectRelation.role = PROJECT_OWNER_ROLE;
			projectRelation.project = project;
			projectRelation.user = owner;

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

		test('should fetch owners for uncached projects in one repository call', async () => {
			const firstOwner = Object.assign(new User(), { role: GLOBAL_OWNER_ROLE });
			const secondOwner = Object.assign(new User(), { role: GLOBAL_OWNER_ROLE });
			const ownerRelations = [
				Object.assign(new ProjectRelation(), {
					projectId: 'project-1',
					user: firstOwner,
				}),
				Object.assign(new ProjectRelation(), {
					projectId: 'project-2',
					user: secondOwner,
				}),
			];
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce(ownerRelations);

			const owners = await ownershipService.getPersonalProjectOwnersCached([
				'project-1',
				'project-2',
			]);

			expect(projectRelationRepository.getPersonalProjectOwners).toHaveBeenCalledTimes(1);
			expect(projectRelationRepository.getPersonalProjectOwners).toHaveBeenCalledWith([
				'project-1',
				'project-2',
			]);
			expect(owners).toEqual(
				new Map([
					['project-1', firstOwner],
					['project-2', secondOwner],
				]),
			);
		});
	});

	describe('getProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			const mockProject = new Project();
			const mockOwner = new User();
			mockOwner.role = GLOBAL_OWNER_ROLE;

			const projectRelation = Object.assign(new ProjectRelation(), {
				role: PROJECT_OWNER_ROLE_SLUG,
				projectId: 'some-project-id',
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

	describe('invalidateProjectOwnerCacheByUserId()', () => {
		test('should delete cache entry for personal project', async () => {
			const project = new Project();
			project.id = randomUUID();
			projectRepository.getPersonalProjectForUser.mockResolvedValueOnce(project);

			await ownershipService.invalidateProjectOwnerCacheByUserId('some-user-id');

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith('some-user-id');
			expect(cacheService.deleteFromHash).toHaveBeenCalledWith('project-owner', project.id);
		});

		test('should not delete cache if user has no personal project', async () => {
			projectRepository.getPersonalProjectForUser.mockResolvedValueOnce(null);

			await ownershipService.invalidateProjectOwnerCacheByUserId('some-user-id');

			expect(projectRepository.getPersonalProjectForUser).toHaveBeenCalledWith('some-user-id');
			expect(cacheService.deleteFromHash).not.toHaveBeenCalled();
		});
	});

	describe('invalidateWorkflowProjectCacheForProject()', () => {
		test('should delete cache entry for each workflow in the project', async () => {
			const workflowIds = ['wf1', 'wf2', 'wf3'];
			sharedWorkflowRepository.find.mockResolvedValueOnce(
				workflowIds.map((workflowId) => Object.assign(new SharedWorkflow(), { workflowId })),
			);

			await ownershipService.invalidateWorkflowProjectCacheForProject('project-123');

			expect(sharedWorkflowRepository.find).toHaveBeenCalledWith({
				where: { projectId: 'project-123', role: 'workflow:owner' },
				select: ['workflowId'],
			});
			for (const workflowId of workflowIds) {
				expect(cacheService.deleteFromHash).toHaveBeenCalledWith('workflow-project', workflowId);
			}
			expect(cacheService.deleteFromHash).toHaveBeenCalledTimes(workflowIds.length);
		});

		test('should not call deleteFromHash if project has no workflows', async () => {
			sharedWorkflowRepository.find.mockResolvedValueOnce([]);

			await ownershipService.invalidateWorkflowProjectCacheForProject('empty-project');

			expect(cacheService.deleteFromHash).not.toHaveBeenCalled();
		});
	});

	describe('getInstanceOwner()', () => {
		test('should find owner using global owner role ID, with the role relation loaded', async () => {
			await ownershipService.getInstanceOwner();

			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
				relations: ['role'],
			});
		});
	});
});
