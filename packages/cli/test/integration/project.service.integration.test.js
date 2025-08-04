'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
const project_service_ee_1 = require('@/services/project.service.ee');
const license_2 = require('@test-integration/license');
const users_1 = require('./shared/db/users');
describe('ProjectService', () => {
	let projectService;
	let sharedWorkflowRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		projectService = di_1.Container.get(project_service_ee_1.ProjectService);
		sharedWorkflowRepository = di_1.Container.get(db_1.SharedWorkflowRepository);
		const license = new license_2.LicenseMocker();
		license.mock(di_1.Container.get(license_1.License));
		license.enable('feat:projectRole:editor');
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate([
			'User',
			'Project',
			'ProjectRelation',
			'WorkflowEntity',
			'SharedWorkflow',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('addUsersToProject', () => {
		it("don't throw a unique constraint violation error when adding a user that is already part of the project", async () => {
			const user = await (0, users_1.createUser)();
			const project = await (0, backend_test_utils_1.createTeamProject)('project', user);
			await projectService.addUsersToProject(project.id, [
				{ userId: user.id, role: 'project:admin' },
			]);
			const relations = await (0, backend_test_utils_1.getAllProjectRelations)({
				projectId: project.id,
			});
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: 'project:admin',
			});
		});
		it('allows changing a users role', async () => {
			const user = await (0, users_1.createUser)();
			const project = await (0, backend_test_utils_1.createTeamProject)('project', user);
			await projectService.addUsersToProject(project.id, [
				{ userId: user.id, role: 'project:editor' },
			]);
			const relations = await (0, backend_test_utils_1.getAllProjectRelations)({
				projectId: project.id,
			});
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: 'project:editor',
			});
		});
	});
	describe('addUser', () => {
		it("don't throw a unique constraint violation error when adding a user that is already part of the project", async () => {
			const user = await (0, users_1.createUser)();
			const project = await (0, backend_test_utils_1.createTeamProject)('project', user);
			await projectService.addUser(project.id, { userId: user.id, role: 'project:admin' });
			const relations = await (0, backend_test_utils_1.getAllProjectRelations)({
				projectId: project.id,
			});
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: 'project:admin',
			});
		});
	});
	describe('findRolesInProjects', () => {
		describe('when user has roles in projects where workflow is accessible', () => {
			it('should return roles and project IDs', async () => {
				const user = await (0, users_1.createUser)();
				const firstProject = await (0, backend_test_utils_1.createTeamProject)('Project 1');
				const secondProject = await (0, backend_test_utils_1.createTeamProject)('Project 2');
				await (0, backend_test_utils_1.linkUserToProject)(user, firstProject, 'project:admin');
				await (0, backend_test_utils_1.linkUserToProject)(user, secondProject, 'project:viewer');
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				await sharedWorkflowRepository.insert({
					projectId: firstProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});
				await sharedWorkflowRepository.insert({
					projectId: secondProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});
				const projectIds = await projectService.findProjectsWorkflowIsIn(workflow.id);
				expect(projectIds).toEqual(expect.arrayContaining([firstProject.id, secondProject.id]));
			});
		});
		describe('when user has no roles in projects where workflow is accessible', () => {
			it('should return project IDs but no roles', async () => {
				const firstProject = await (0, backend_test_utils_1.createTeamProject)('Project 1');
				const secondProject = await (0, backend_test_utils_1.createTeamProject)('Project 2');
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				await sharedWorkflowRepository.insert({
					projectId: firstProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});
				await sharedWorkflowRepository.insert({
					projectId: secondProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});
				const projectIds = await projectService.findProjectsWorkflowIsIn(workflow.id);
				expect(projectIds).toEqual(expect.arrayContaining([firstProject.id, secondProject.id]));
			});
		});
		describe('when user has roles in projects where workflow is inaccessible', () => {
			it('should return project IDs but no roles', async () => {
				const user = await (0, users_1.createUser)();
				const firstProject = await (0, backend_test_utils_1.createTeamProject)('Project 1');
				const secondProject = await (0, backend_test_utils_1.createTeamProject)('Project 2');
				await (0, backend_test_utils_1.linkUserToProject)(user, firstProject, 'project:admin');
				await (0, backend_test_utils_1.linkUserToProject)(user, secondProject, 'project:viewer');
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				const projectIds = await projectService.findProjectsWorkflowIsIn(workflow.id);
				expect(projectIds).toHaveLength(0);
			});
		});
	});
});
//# sourceMappingURL=project.service.integration.test.js.map
