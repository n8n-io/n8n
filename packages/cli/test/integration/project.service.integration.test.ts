import { LicenseState } from '@n8n/backend-common';
import {
	linkUserToProject,
	createTeamProject,
	getAllProjectRelations,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import { ProjectRelationRepository, RoleRepository, SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { LicenseMocker } from '@test-integration/license';

import { createUser } from './shared/db/users';

import { License } from '@/license';
import { ProjectService } from '@/services/project.service.ee';

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
			await projectService.addUsersToProject(user, project.id, [
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
			await projectService.addUsersToProject(user, project.id, [
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

	describe('getProjectRelationsForUser', () => {
		type Statement = { sql: string; parameters: unknown[] };

		// Both drivers call `logger.logQuery` for every statement, so swapping the logger
		// captures what a call runs without reconfiguring the connection.
		async function captureStatements<T>(run: () => Promise<T>) {
			const dataSource = Container.get(DataSource);
			const original = dataSource.logger;
			const statements: Statement[] = [];
			const capturing = Object.create(original) as DataSource['logger'];
			capturing.logQuery = (sql: string, parameters?: unknown[]) => {
				statements.push({ sql, parameters: parameters ?? [] });
			};
			dataSource.logger = capturing;
			try {
				return { result: await run(), statements };
			} finally {
				dataSource.logger = original;
			}
		}

		// Rows the database returns for a statement, before TypeORM collapses them into entities.
		async function rowsMaterialized({ sql, parameters }: Statement) {
			const rows = await Container.get(DataSource).query<Array<{ n: number | string }>>(
				`SELECT COUNT(*) AS n FROM (${sql}) AS materialized`,
				parameters,
			);
			return Number(rows[0].n);
		}

		const normalize = (
			relations: Awaited<ReturnType<ProjectService['getProjectRelationsForUser']>>,
		) =>
			relations
				.map((relation) => ({
					projectId: relation.projectId,
					project: relation.project.id,
					role: relation.role.slug,
					scopes: relation.role.scopes.map((scope) => scope.slug).sort(),
				}))
				.sort((a, b) => a.projectId.localeCompare(b.projectId));

		it('returns every relation with its project, role and the scopes of that role', async () => {
			const user = await createUser();
			const adminProject = await createTeamProject('Admin project');
			const editorProject = await createTeamProject('Editor project');
			await linkUserToProject(user, adminProject, 'project:admin');
			await linkUserToProject(user, editorProject, 'project:editor');

			const relations = await projectService.getProjectRelationsForUser(user);

			expect(relations).toHaveLength(3);
			const byRole = new Map(relations.map((relation) => [relation.role.slug, relation]));
			expect(byRole.get('project:admin')?.project.id).toBe(adminProject.id);
			expect(byRole.get('project:editor')?.project.id).toBe(editorProject.id);
			expect(byRole.get('project:personalOwner')?.project.type).toBe('personal');

			const roleRepository = Container.get(RoleRepository);
			for (const slug of ['project:personalOwner', 'project:admin', 'project:editor']) {
				const role = await roleRepository.findBySlug(slug);
				const expectedScopes = role!.scopes.map((scope) => scope.slug).sort();
				expect(expectedScopes.length).toBeGreaterThan(0);
				expect(
					byRole
						.get(slug)
						?.role.scopes.map((scope) => scope.slug)
						.sort(),
				).toEqual(expectedScopes);
			}
		});

		it('matches a find with eager role scopes relation for relation', async () => {
			const user = await createUser();
			const projects = await Promise.all(
				['P1', 'P2', 'P3'].map(async (name) => await createTeamProject(name)),
			);
			await linkUserToProject(user, projects[0], 'project:admin');
			await linkUserToProject(user, projects[1], 'project:editor');
			await linkUserToProject(user, projects[2], 'project:viewer');

			const eager = await Container.get(ProjectRelationRepository).find({
				where: { userId: user.id },
				relations: ['project', 'role'],
			});
			const actual = await projectService.getProjectRelationsForUser(user);

			expect(normalize(actual)).toEqual(normalize(eager));
			expect(actual).toHaveLength(4);
		});

		it('materializes one row per relation instead of one row per scope', async () => {
			const user = await createUser();
			for (const name of ['P1', 'P2', 'P3']) {
				await linkUserToProject(user, await createTeamProject(name), 'project:admin');
			}

			const { result, statements } = await captureStatements(
				async () => await projectService.getProjectRelationsForUser(user),
			);

			expect(result).toHaveLength(4);
			// One statement for the relations, one for the distinct roles and their scopes.
			expect(statements).toHaveLength(2);
			const [relationStatement, roleStatement] = statements;
			expect(relationStatement.sql).toMatch(/project_relation"\s+"ProjectRelation"/);
			expect(relationStatement.sql).not.toMatch(/role_scope/);
			expect(await rowsMaterialized(relationStatement)).toBe(4);
			expect(roleStatement.sql).toMatch(/role_scope/);
		});
	});
});
