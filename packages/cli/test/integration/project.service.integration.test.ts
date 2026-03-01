import {
	linkUserToProject,
	createTeamProject,
	getAllProjectRelations,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import { SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { License } from '@/license';
import { ProjectService } from '@/services/project.service.ee';
import { LicenseMocker } from '@test-integration/license';

import { createUser } from './shared/db/users';
import { LicenseState } from '@n8n/backend-common';

describe('ProjectService', () => {
	let projectService: ProjectService;
	let sharedWorkflowRepository: SharedWorkflowRepository;

	beforeAll(async () => {
		await testDb.init();

		projectService = Container.get(ProjectService);
		sharedWorkflowRepository = Container.get(SharedWorkflowRepository);

		const license: LicenseMocker = new LicenseMocker();
		license.mock(Container.get(License));
		license.mockLicenseState(Container.get(LicenseState));
		license.enable('feat:projectRole:editor');
	});

	afterEach(async () => {
		await testDb.truncate([
			'User',
			'Project',
			'ProjectRelation',
			'WorkflowEntity',
			'SharedWorkflow',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('addUsersToProject', () => {
		it("don't throw a unique constraint violation error when adding a user that is already part of the project", async () => {
			// ARRANGE
			const user = await createUser();
			const project = await createTeamProject('project', user);

			// ACT
			// add user again
			await projectService.addUsersToProject(project.id, [
				{ userId: user.id, role: 'project:admin' },
			]);

			// ASSERT
			const relations = await getAllProjectRelations({ projectId: project.id });
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:admin' },
			});
		});

		it('allows changing a users role', async () => {
			// ARRANGE
			const user = await createUser();
			const project = await createTeamProject('project', user);

			// ACT
			// add user again
			await projectService.addUsersToProject(project.id, [
				{ userId: user.id, role: 'project:editor' },
			]);

			// ASSERT
			const relations = await getAllProjectRelations({ projectId: project.id });
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:editor' },
			});
		});
	});

	describe('addUser', () => {
		it("don't throw a unique constraint violation error when adding a user that is already part of the project", async () => {
			// ARRANGE
			const user = await createUser();
			const project = await createTeamProject('project', user);

			// ACT
			// add user again
			await projectService.addUser(project.id, { userId: user.id, role: 'project:admin' });

			// ASSERT
			const relations = await getAllProjectRelations({ projectId: project.id });
			expect(relations).toHaveLength(1);
			expect(relations[0]).toMatchObject({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:admin' },
			});
		});
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
