'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const ownership_service_1 = require('@/services/ownership.service');
const mock_objects_1 = require('@test/mock-objects');
const cache_service_1 = require('../cache/cache.service');
describe('OwnershipService', () => {
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const sharedWorkflowRepository = (0, backend_test_utils_1.mockInstance)(
		db_1.SharedWorkflowRepository,
	);
	const projectRelationRepository = (0, backend_test_utils_1.mockInstance)(
		db_1.ProjectRelationRepository,
	);
	const cacheService = (0, backend_test_utils_1.mockInstance)(cache_service_1.CacheService);
	const ownershipService = new ownership_service_1.OwnershipService(
		cacheService,
		userRepository,
		(0, jest_mock_extended_1.mock)(),
		projectRelationRepository,
		sharedWorkflowRepository,
	);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getWorkflowProjectCached()', () => {
		test('should retrieve a workflow owner project', async () => {
			const mockProject = new db_1.Project();
			const sharedWorkflow = Object.assign(new db_1.SharedWorkflow(), {
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
			const project = new db_1.Project();
			const owner = new db_1.User();
			const projectRelation = new db_1.ProjectRelation();
			projectRelation.role = 'project:personalOwner';
			(projectRelation.project = project), (projectRelation.user = owner);
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([projectRelation]);
			const returnedOwner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');
			expect(returnedOwner).toBe(owner);
		});
		test('should not throw if no project owner found, should return null instead', async () => {
			projectRelationRepository.getPersonalProjectOwners.mockResolvedValueOnce([]);
			const owner = await ownershipService.getPersonalProjectOwnerCached('some-project-id');
			expect(owner).toBeNull();
		});
		test('should not use the repository if the owner was found in the cache', async () => {
			const project = new db_1.Project();
			project.id = (0, uuid_1.v4)();
			const owner = new db_1.User();
			owner.id = (0, uuid_1.v4)();
			const projectRelation = new db_1.ProjectRelation();
			projectRelation.role = 'project:personalOwner';
			(projectRelation.project = project), (projectRelation.user = owner);
			cacheService.getHashValue.mockResolvedValueOnce(owner);
			userRepository.create.mockReturnValueOnce(owner);
			const foundOwner = await ownershipService.getPersonalProjectOwnerCached(project.id);
			expect(cacheService.getHashValue).toHaveBeenCalledTimes(1);
			expect(cacheService.getHashValue).toHaveBeenCalledWith('project-owner', project.id);
			expect(projectRelationRepository.getPersonalProjectOwners).not.toHaveBeenCalled();
			expect(foundOwner).toEqual(owner);
		});
	});
	describe('getProjectOwnerCached()', () => {
		test('should retrieve a project owner', async () => {
			const mockProject = new db_1.Project();
			const mockOwner = new db_1.User();
			const projectRelation = Object.assign(new db_1.ProjectRelation(), {
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
			const ownerProject = (0, mock_objects_1.mockProject)();
			const editorProject = (0, mock_objects_1.mockProject)();
			const credential = (0, mock_objects_1.mockCredential)();
			credential.shared = [
				{ role: 'credential:owner', project: ownerProject },
				{ role: 'credential:editor', project: editorProject },
			];
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
			const projectOwner = (0, mock_objects_1.mockProject)();
			const projectEditor = (0, mock_objects_1.mockProject)();
			const workflow = new db_1.WorkflowEntity();
			workflow.shared = [
				{ role: 'workflow:owner', project: projectOwner },
				{ role: 'workflow:editor', project: projectEditor },
			];
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
			const credential = (0, mock_objects_1.mockCredential)();
			const project = (0, mock_objects_1.mockProject)();
			credential.shared = [{ role: 'credential:owner', project }];
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
//# sourceMappingURL=ownership.service.test.js.map
