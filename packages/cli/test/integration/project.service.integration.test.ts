import Container from 'typedi';
import { ProjectService } from '@/services/project.service';
import * as testDb from './shared/testDb';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { createUser } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import { addUserToProject, createTeamProject } from './shared/db/projects';

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
			it('should return roles', async () => {
				const user = await createUser();
				const secondUser = await createUser(); // @TODO: Needed only to satisfy index in legacy column

				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				await addUserToProject(user.id, firstProject.id, 'project:admin');
				await addUserToProject(user.id, secondProject.id, 'project:viewer');

				const workflow = await createWorkflow();

				await sharedWorkflowRepository.insert({
					userId: user.id, // @TODO: Legacy column
					projectId: firstProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});

				await sharedWorkflowRepository.insert({
					userId: secondUser.id, // @TODO: Legacy column
					projectId: secondProject.id,
					workflowId: workflow.id,
					role: 'workflow:user',
				});

				const roles = await projectService.findRolesInProjects(workflow.id, user.id);

				expect(roles).toBeSetContaining('project:viewer', 'project:admin');
			});
		});

		describe('when user has no roles in projects where workflow is accessible', () => {
			it('should return no roles', async () => {
				const user = await createUser();
				const secondUser = await createUser(); // @TODO: Needed only to satisfy index in legacy column

				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				// workflow shared with projects, but user not added to any project

				const workflow = await createWorkflow();

				await sharedWorkflowRepository.insert({
					userId: user.id, // @TODO: Legacy column
					projectId: firstProject.id,
					workflowId: workflow.id,
					role: 'workflow:owner',
				});

				await sharedWorkflowRepository.insert({
					userId: secondUser.id, // @TODO: Legacy column
					projectId: secondProject.id,
					workflowId: workflow.id,
					role: 'workflow:user',
				});

				const roles = await projectService.findRolesInProjects(workflow.id, user.id);

				expect(roles).toBeEmptySet();
			});
		});

		describe('when user has roles in projects where workflow is inaccessible', () => {
			it('should return no roles', async () => {
				const user = await createUser();

				const firstProject = await createTeamProject('Project 1');
				const secondProject = await createTeamProject('Project 2');

				await addUserToProject(user.id, firstProject.id, 'project:admin');
				await addUserToProject(user.id, secondProject.id, 'project:viewer');

				const workflow = await createWorkflow();

				// user not added to projects, but workflow not shared with projects

				const roles = await projectService.findRolesInProjects(workflow.id, user.id);

				expect(roles).toBeEmptySet();
			});
		});
	});
});
