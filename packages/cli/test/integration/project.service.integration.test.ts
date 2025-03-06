import { Container } from '@n8n/di';

import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { ProjectService } from '@/services/project.service.ee';

import { linkUserToProject, createTeamProject } from './shared/db/projects';
import { createUser } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/test-db';

describe('ProjectService', () => {
	let projectService: ProjectService;

	let sharedWorkflowRepository: SharedWorkflowRepository;

	beforeAll(async () => {
		await testDb.init();

		projectService = Container.get(ProjectService);

		sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['User', 'Project', 'ProjectRelation', 'Workflow', 'SharedWorkflow']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findRolesInProjects', () => {
		describe('when user has roles in projects where workflow is accessible', () => {
			it('should return roles and project IDs', async () => {
				const user = await createUser();

				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				await linkUserToProject(user, firstProject, 'project:admin');
				await linkUserToProject(user, secondProject, 'project:viewer');

				const workflow = await createWorkflow();

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
				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				// workflow shared with projects, but user not added to any project

				const workflow = await createWorkflow();

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
				const user = await createUser();

				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				await linkUserToProject(user, firstProject, 'project:admin');
				await linkUserToProject(user, secondProject, 'project:viewer');

				const workflow = await createWorkflow();

				// user added to projects, but workflow not shared with projects

				const projectIds = await projectService.findProjectsWorkflowIsIn(workflow.id);

				expect(projectIds).toHaveLength(0);
			});
		});
	});
});
