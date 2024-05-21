import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { createMember, createOwner, createUser } from './shared/db/users';
import {
	createTeamProject,
	linkUserToProject,
	getPersonalProject,
	findProject,
	getProjectRelations,
} from './shared/db/projects';
import Container from 'typedi';
import type { Project } from '@/databases/entities/Project';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import { EntityNotFoundError } from '@n8n/typeorm';
import { createWorkflow, shareWorkflowWithProjects } from './shared/db/workflows';
import {
	getCredentialById,
	saveCredential,
	shareCredentialWithProjects,
} from './shared/db/credentials';
import { randomCredentialPayload } from './shared/random';
import { getWorkflowById } from '@/PublicApi/v1/handlers/workflows/workflows.service';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import type { GlobalRole } from '@/databases/entities/User';
import type { Scope } from '@n8n/permissions';
import { CacheService } from '@/services/cache/cache.service';
import { mockInstance } from '../shared/mocking';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { ProjectRepository } from '@/databases/repositories/project.repository';

const testServer = utils.setupTestServer({
	endpointGroups: ['project'],
	enabledFeatures: [
		'feat:advancedPermissions',
		'feat:projectRole:admin',
		'feat:projectRole:editor',
		'feat:projectRole:viewer',
	],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

// The `ActiveWorkflowRunner` keeps the event loop alive, which in turn leads to jest not shutting down cleanly.
// We don't need it for the tests here, so we can mock it and make the tests exit cleanly.
mockInstance(ActiveWorkflowManager);

beforeEach(async () => {
	await testDb.truncate(['User', 'Project']);
});

describe('GET /projects/', () => {
	test('member should get all personal projects and team projects they are apart of', async () => {
		const [testUser1, testUser2, testUser3] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser1),
			createTeamProject(),
		]);

		const [personalProject1, personalProject2, personalProject3] = await Promise.all([
			getPersonalProject(testUser1),
			getPersonalProject(testUser2),
			getPersonalProject(testUser3),
		]);

		const memberAgent = testServer.authAgentFor(testUser1);

		const resp = await memberAgent.get('/projects/');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data as Project[];
		expect(respProjects.length).toBe(4);

		expect(
			[personalProject1, personalProject2, personalProject3].every((v, i) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return false;
				}
				const u = [testUser1, testUser2, testUser3][i];
				return p.name === u.createPersonalProjectName();
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).toBeUndefined();
	});

	test('owner should get all projects', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser1),
			createTeamProject(),
		]);

		const [ownerProject, personalProject1, personalProject2, personalProject3] = await Promise.all([
			getPersonalProject(ownerUser),
			getPersonalProject(testUser1),
			getPersonalProject(testUser2),
			getPersonalProject(testUser3),
		]);

		const memberAgent = testServer.authAgentFor(ownerUser);

		const resp = await memberAgent.get('/projects/');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data as Project[];
		expect(respProjects.length).toBe(6);

		expect(
			[ownerProject, personalProject1, personalProject2, personalProject3].every((v, i) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return false;
				}
				const u = [ownerUser, testUser1, testUser2, testUser3][i];
				return p.name === u.createPersonalProjectName();
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).not.toBeUndefined();
	});
});

describe('GET /projects/count', () => {
	test('should return correct number of projects', async () => {
		const [firstUser] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
			createUser(),
			createTeamProject(),
			createTeamProject(),
			createTeamProject(),
		]);

		const resp = await testServer.authAgentFor(firstUser).get('/projects/count');

		expect(resp.body.data.personal).toBe(4);
		expect(resp.body.data.team).toBe(3);
	});
});

describe('GET /projects/my-projects', () => {
	test('member should get all projects they are apart of', async () => {
		//
		// ARRANGE
		//
		const [testUser1, testUser2, testUser3] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser1),
			createTeamProject(undefined, testUser2),
		]);

		const [personalProject1, personalProject2, personalProject3] = await Promise.all([
			getPersonalProject(testUser1),
			getPersonalProject(testUser2),
			getPersonalProject(testUser3),
		]);

		//
		// ACT
		//
		const resp = await testServer
			.authAgentFor(testUser1)
			.get('/projects/my-projects')
			.query({ includeScopes: true })
			.expect(200);
		const respProjects: Array<Project & { role: ProjectRole | GlobalRole; scopes?: Scope[] }> =
			resp.body.data;

		//
		// ASSERT
		//
		expect(respProjects.length).toBe(2);

		const projectsExpected = [
			[
				personalProject1,
				{
					role: 'project:personalOwner',
					scopes: ['project:list', 'project:read', 'credential:create'],
				},
			],
			[
				teamProject1,
				{
					role: 'project:admin',
					scopes: [
						'project:list',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
		] as const;

		for (const [project, expected] of projectsExpected) {
			const p = respProjects.find((p) => p.id === project.id)!;

			expect(p.role).toBe(expected.role);
			expect(expected.scopes.every((s) => p.scopes?.includes(s as Scope))).toBe(true);
		}

		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject2.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject3.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: teamProject2.id }));
	});

	test('owner should get all projects they are apart of', async () => {
		//
		// ARRANGE
		//
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2, teamProject3, teamProject4] = await Promise.all([
			// owner has no relation ship
			createTeamProject(undefined, testUser1),
			// owner is admin
			createTeamProject(undefined, ownerUser),
			// owner is viewer
			createTeamProject(undefined, testUser2),
			// this project has no relationship at all
			createTeamProject(),
		]);

		await linkUserToProject(ownerUser, teamProject3, 'project:editor');

		const [ownerProject, personalProject1, personalProject2, personalProject3] = await Promise.all([
			getPersonalProject(ownerUser),
			getPersonalProject(testUser1),
			getPersonalProject(testUser2),
			getPersonalProject(testUser3),
		]);

		//
		// ACT
		//
		const resp = await testServer
			.authAgentFor(ownerUser)
			.get('/projects/my-projects')
			.query({ includeScopes: true })
			.expect(200);
		const respProjects: Array<Project & { role: ProjectRole | GlobalRole; scopes?: Scope[] }> =
			resp.body.data;

		//
		// ASSERT
		//
		expect(respProjects.length).toBe(5);

		const projectsExpected = [
			[
				ownerProject,
				{
					role: 'project:personalOwner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject1,
				{
					role: 'global:owner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject2,
				{
					role: 'project:admin',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject3,
				{
					role: 'project:editor',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject4,
				{
					role: 'global:owner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
		] as const;

		for (const [project, expected] of projectsExpected) {
			const p = respProjects.find((p) => p.id === project.id)!;

			expect(p.role).toBe(expected.role);
			expect(expected.scopes.every((s) => p.scopes?.includes(s as Scope))).toBe(true);
		}

		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject1.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject2.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject3.id }));
	});
});

describe('GET /projects/personal', () => {
	test("should return the user's personal project", async () => {
		const user = await createUser();
		const project = await getPersonalProject(user);

		const memberAgent = testServer.authAgentFor(user);

		const resp = await memberAgent.get('/projects/personal');
		expect(resp.status).toBe(200);
		const respProject = resp.body.data as Project & { scopes: Scope[] };
		expect(respProject.id).toEqual(project.id);
		expect(respProject.scopes).not.toBeUndefined();
	});

	test("should return 404 if user doesn't have a personal project", async () => {
		const user = await createUser();
		const project = await getPersonalProject(user);
		await testDb.truncate(['Project']);

		const memberAgent = testServer.authAgentFor(user);

		const resp = await memberAgent.get('/projects/personal');
		expect(resp.status).toBe(404);
		const respProject = resp.body?.data as Project;
		expect(respProject?.id).not.toEqual(project.id);
	});
});

describe('POST /projects/', () => {
	test('should create a team project', async () => {
		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		const resp = await ownerAgent.post('/projects/').send({ name: 'Test Team Project' });
		expect(resp.status).toBe(200);
		const respProject = resp.body.data as Project;
		expect(respProject.name).toEqual('Test Team Project');
		expect(async () => {
			await findProject(respProject.id);
		}).not.toThrow();
	});

	test('should allow to create a team projects if below the quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(200);
		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
	});

	test('should fail to create a team project if at quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		await Promise.all([createTeamProject()]);
		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(400, {
			code: 400,
			message:
				'Attempted to create a new project but quota is already exhausted. You may have a maximum of 1 team projects.',
		});

		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
	});

	test('should fail to create a team project if above the quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		await Promise.all([createTeamProject(), createTeamProject()]);
		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(400, {
			code: 400,
			message:
				'Attempted to create a new project but quota is already exhausted. You may have a maximum of 1 team projects.',
		});

		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(2);
	});
});

describe('PATCH /projects/:projectId', () => {
	test('should update a team project name', async () => {
		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		const teamProject = await createTeamProject();

		const resp = await ownerAgent.patch(`/projects/${teamProject.id}`).send({ name: 'New Name' });
		expect(resp.status).toBe(200);

		const updatedProject = await findProject(teamProject.id);
		expect(updatedProject.name).toEqual('New Name');
	});

	test('should not allow viewers to edit team project name', async () => {
		const testUser = await createUser();
		const teamProject = await createTeamProject();
		await linkUserToProject(testUser, teamProject, 'project:viewer');

		const memberAgent = testServer.authAgentFor(testUser);

		const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({ name: 'New Name' });
		expect(resp.status).toBe(403);

		const updatedProject = await findProject(teamProject.id);
		expect(updatedProject.name).not.toEqual('New Name');
	});

	test('should not allow owners to edit personal project name', async () => {
		const user = await createUser();
		const personalProject = await getPersonalProject(user);

		const ownerUser = await createOwner();
		const ownerAgent = testServer.authAgentFor(ownerUser);

		const resp = await ownerAgent
			.patch(`/projects/${personalProject.id}`)
			.send({ name: 'New Name' });
		expect(resp.status).toBe(403);

		const updatedProject = await findProject(personalProject.id);
		expect(updatedProject.name).not.toEqual('New Name');
	});
});

describe('PATCH /projects/:projectId', () => {
	test('should add or remove users from a project', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser1),
			createTeamProject(undefined, testUser2),
		]);
		const [credential1, credential2] = await Promise.all([
			saveCredential(randomCredentialPayload(), {
				role: 'credential:owner',
				project: teamProject1,
			}),
			saveCredential(randomCredentialPayload(), {
				role: 'credential:owner',
				project: teamProject2,
			}),
			saveCredential(randomCredentialPayload(), {
				role: 'credential:owner',
				project: teamProject2,
			}),
		]);
		await shareCredentialWithProjects(credential2, [teamProject1]);

		await linkUserToProject(ownerUser, teamProject2, 'project:editor');
		await linkUserToProject(testUser2, teamProject2, 'project:editor');

		const memberAgent = testServer.authAgentFor(testUser1);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');
		const resp = await memberAgent.patch(`/projects/${teamProject1.id}`).send({
			name: teamProject1.name,
			relations: [
				{ userId: testUser1.id, role: 'project:admin' },
				{ userId: testUser3.id, role: 'project:editor' },
				{ userId: ownerUser.id, role: 'project:viewer' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(200);

		expect(deleteSpy).toBeCalledWith([`credential-can-use-secrets:${credential1.id}`]);
		deleteSpy.mockClear();

		const [tp1Relations, tp2Relations] = await Promise.all([
			getProjectRelations({ projectId: teamProject1.id }),
			getProjectRelations({ projectId: teamProject2.id }),
		]);

		expect(tp1Relations.length).toBe(3);
		expect(tp2Relations.length).toBe(2);

		expect(tp1Relations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
		expect(tp1Relations.find((p) => p.userId === testUser2.id)).toBeUndefined();
		expect(tp1Relations.find((p) => p.userId === testUser1.id)?.role).toBe('project:admin');
		expect(tp1Relations.find((p) => p.userId === testUser3.id)?.role).toBe('project:editor');
		expect(tp1Relations.find((p) => p.userId === ownerUser.id)?.role).toBe('project:viewer');

		// Check we haven't modified the other team project
		expect(tp2Relations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tp2Relations.find((p) => p.userId === testUser1.id)).toBeUndefined();
		expect(tp2Relations.find((p) => p.userId === testUser2.id)?.role).toBe('project:editor');
		expect(tp2Relations.find((p) => p.userId === ownerUser.id)?.role).toBe('project:editor');
	});

	test('should not add or remove users from a project if lacking permissions', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser2),
			createTeamProject(),
		]);

		await linkUserToProject(testUser1, teamProject1, 'project:viewer');
		await linkUserToProject(ownerUser, teamProject2, 'project:editor');
		await linkUserToProject(testUser2, teamProject2, 'project:editor');

		const memberAgent = testServer.authAgentFor(testUser1);

		const resp = await memberAgent.patch(`/projects/${teamProject1.id}`).send({
			name: teamProject1.name,
			relations: [
				{ userId: testUser1.id, role: 'project:admin' },
				{ userId: testUser3.id, role: 'project:editor' },
				{ userId: ownerUser.id, role: 'project:viewer' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(403);

		const [tp1Relations, tp2Relations] = await Promise.all([
			getProjectRelations({ projectId: teamProject1.id }),
			getProjectRelations({ projectId: teamProject2.id }),
		]);

		expect(tp1Relations.length).toBe(2);
		expect(tp2Relations.length).toBe(2);

		expect(tp1Relations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
		expect(tp1Relations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tp1Relations.find((p) => p.userId === testUser1.id)?.role).toBe('project:viewer');
		expect(tp1Relations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
		expect(tp1Relations.find((p) => p.userId === testUser3.id)).toBeUndefined();

		// Check we haven't modified the other team project
		expect(tp2Relations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tp2Relations.find((p) => p.userId === testUser1.id)).toBeUndefined();
		expect(tp2Relations.find((p) => p.userId === testUser2.id)?.role).toBe('project:editor');
		expect(tp2Relations.find((p) => p.userId === ownerUser.id)?.role).toBe('project:editor');
	});

	test('should not add from a project adding user with an unlicensed role', async () => {
		testServer.license.disable('feat:projectRole:editor');
		const [testUser1, testUser2, testUser3] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
		]);
		const teamProject = await createTeamProject(undefined, testUser2);

		await linkUserToProject(testUser1, teamProject, 'project:admin');

		const memberAgent = testServer.authAgentFor(testUser2);

		const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({
			name: teamProject.name,
			relations: [
				{ userId: testUser2.id, role: 'project:admin' },
				{ userId: testUser1.id, role: 'project:editor' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(400);

		const tpRelations = await getProjectRelations({ projectId: teamProject.id });
		expect(tpRelations.length).toBe(2);

		expect(tpRelations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser1.id)?.role).toBe('project:admin');
		expect(tpRelations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
		expect(tpRelations.find((p) => p.userId === testUser3.id)).toBeUndefined();
	});

	test("should not edit a relation of a project when changing a user's role to an unlicensed role", async () => {
		testServer.license.disable('feat:projectRole:editor');
		const [testUser1, testUser2, testUser3] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
		]);
		const teamProject = await createTeamProject(undefined, testUser2);

		await linkUserToProject(testUser1, teamProject, 'project:admin');
		await linkUserToProject(testUser3, teamProject, 'project:admin');

		const memberAgent = testServer.authAgentFor(testUser2);

		const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({
			name: teamProject.name,
			relations: [
				{ userId: testUser2.id, role: 'project:admin' },
				{ userId: testUser1.id, role: 'project:editor' },
				{ userId: testUser3.id, role: 'project:editor' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(400);

		const tpRelations = await getProjectRelations({ projectId: teamProject.id });
		expect(tpRelations.length).toBe(3);

		expect(tpRelations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser1.id)?.role).toBe('project:admin');
		expect(tpRelations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
		expect(tpRelations.find((p) => p.userId === testUser3.id)?.role).toBe('project:admin');
	});

	test("should  edit a relation of a project when changing a user's role to an licensed role but unlicensed roles are present", async () => {
		testServer.license.disable('feat:projectRole:viewer');
		const [testUser1, testUser2, testUser3] = await Promise.all([
			createUser(),
			createUser(),
			createUser(),
		]);
		const teamProject = await createTeamProject(undefined, testUser2);

		await linkUserToProject(testUser1, teamProject, 'project:viewer');
		await linkUserToProject(testUser3, teamProject, 'project:editor');

		const memberAgent = testServer.authAgentFor(testUser2);

		const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({
			name: teamProject.name,
			relations: [
				{ userId: testUser1.id, role: 'project:viewer' },
				{ userId: testUser2.id, role: 'project:admin' },
				{ userId: testUser3.id, role: 'project:admin' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(200);

		const tpRelations = await getProjectRelations({ projectId: teamProject.id });
		expect(tpRelations.length).toBe(3);

		expect(tpRelations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser3.id)).not.toBeUndefined();
		expect(tpRelations.find((p) => p.userId === testUser1.id)?.role).toBe('project:viewer');
		expect(tpRelations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
		expect(tpRelations.find((p) => p.userId === testUser3.id)?.role).toBe('project:admin');
	});

	test('should not add or remove users from a personal project', async () => {
		const [testUser1, testUser2] = await Promise.all([createUser(), createUser()]);

		const personalProject = await getPersonalProject(testUser1);

		const memberAgent = testServer.authAgentFor(testUser1);

		const resp = await memberAgent.patch(`/projects/${personalProject.id}`).send({
			relations: [
				{ userId: testUser1.id, role: 'project:personalOwner' },
				{ userId: testUser2.id, role: 'project:admin' },
			] as Array<{
				userId: string;
				role: ProjectRole;
			}>,
		});
		expect(resp.status).toBe(403);

		const p1Relations = await getProjectRelations({ projectId: personalProject.id });
		expect(p1Relations.length).toBe(1);
	});
});

describe('GET /project/:projectId', () => {
	test('should get project details and relations', async () => {
		const [ownerUser, testUser1, testUser2, _testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser2),
			createTeamProject(),
		]);

		await linkUserToProject(testUser1, teamProject1, 'project:editor');
		await linkUserToProject(ownerUser, teamProject2, 'project:editor');
		await linkUserToProject(testUser2, teamProject2, 'project:editor');

		const memberAgent = testServer.authAgentFor(testUser1);

		const resp = await memberAgent.get(`/projects/${teamProject1.id}`);
		expect(resp.status).toBe(200);

		expect(resp.body.data.id).toBe(teamProject1.id);
		expect(resp.body.data.name).toBe(teamProject1.name);

		expect(resp.body.data.relations.length).toBe(2);
		expect(resp.body.data.relations).toContainEqual({
			id: testUser1.id,
			email: testUser1.email,
			firstName: testUser1.firstName,
			lastName: testUser1.lastName,
			role: 'project:editor',
		});
		expect(resp.body.data.relations).toContainEqual({
			id: testUser2.id,
			email: testUser2.email,
			firstName: testUser2.firstName,
			lastName: testUser2.lastName,
			role: 'project:admin',
		});
	});
});

describe('DELETE /project/:projectId', () => {
	test('allows the project:owner to delete a project', async () => {
		const member = await createMember();
		const project = await createTeamProject(undefined, member);

		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(200);

		const projectInDB = findProject(project.id);

		await expect(projectInDB).rejects.toThrowError(EntityNotFoundError);
	});

	test('allows the instance owner to delete a team project their are not related to', async () => {
		const owner = await createOwner();

		const member = await createMember();
		const project = await createTeamProject(undefined, member);

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		await expect(findProject(project.id)).rejects.toThrowError(EntityNotFoundError);
	});

	test('does not allow instance members to delete their personal project', async () => {
		const member = await createMember();
		const project = await getPersonalProject(member);

		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(403);

		const projectInDB = await findProject(project.id);

		expect(projectInDB).toHaveProperty('id', project.id);
	});

	test('does not allow instance owners to delete their personal projects', async () => {
		const owner = await createOwner();
		const project = await getPersonalProject(owner);

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(403);

		const projectInDB = await findProject(project.id);

		expect(projectInDB).toHaveProperty('id', project.id);
	});

	test.each(['project:editor', 'project:viewer'] as ProjectRole[])(
		'does not allow users with the role %s to delete a project',
		async (role) => {
			const member = await createMember();
			const project = await createTeamProject();

			await linkUserToProject(member, project, role);

			await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(403);

			const projectInDB = await findProject(project.id);

			expect(projectInDB).toHaveProperty('id', project.id);
		},
	);

	test('deletes all workflows and credentials it owns as well as the sharings into other projects', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();

		const otherProject = await createTeamProject(undefined, member);
		const sharedWorkflow1 = await createWorkflow({}, otherProject);
		const sharedWorkflow2 = await createWorkflow({}, otherProject);
		const sharedCredential = await saveCredential(randomCredentialPayload(), {
			project: otherProject,
			role: 'credential:owner',
		});

		const projectToBeDeleted = await createTeamProject(undefined, member);
		const ownedWorkflow = await createWorkflow({}, projectToBeDeleted);
		const ownedCredential = await saveCredential(randomCredentialPayload(), {
			project: projectToBeDeleted,
			role: 'credential:owner',
		});

		await shareCredentialWithProjects(sharedCredential, [otherProject]);
		await shareWorkflowWithProjects(sharedWorkflow1, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await shareWorkflowWithProjects(sharedWorkflow2, [
			{ project: otherProject, role: 'workflow:user' },
		]);

		//
		// ACT
		//
		await testServer.authAgentFor(member).delete(`/projects/${projectToBeDeleted.id}`).expect(200);

		//
		// ASSERT
		//

		// Make sure the project and owned workflow and credential where deleted.
		await expect(getWorkflowById(ownedWorkflow.id)).resolves.toBeNull();
		await expect(getCredentialById(ownedCredential.id)).resolves.toBeNull();
		await expect(findProject(projectToBeDeleted.id)).rejects.toThrowError(EntityNotFoundError);

		// Make sure the shared workflow and credential were not deleted
		await expect(getWorkflowById(sharedWorkflow1.id)).resolves.not.toBeNull();
		await expect(getCredentialById(sharedCredential.id)).resolves.not.toBeNull();

		// Make sure the sharings for them have been deleted
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: sharedWorkflow1.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(SharedCredentialsRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				credentialsId: sharedCredential.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
	});

	test('unshares all workflows and credentials that were shared with the project', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();

		const projectToBeDeleted = await createTeamProject(undefined, member);
		const ownedWorkflow1 = await createWorkflow({}, projectToBeDeleted);
		const ownedWorkflow2 = await createWorkflow({}, projectToBeDeleted);
		const ownedCredential = await saveCredential(randomCredentialPayload(), {
			project: projectToBeDeleted,
			role: 'credential:owner',
		});

		const otherProject = await createTeamProject(undefined, member);

		await shareCredentialWithProjects(ownedCredential, [otherProject]);
		await shareWorkflowWithProjects(ownedWorkflow1, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await shareWorkflowWithProjects(ownedWorkflow2, [
			{ project: otherProject, role: 'workflow:user' },
		]);

		//
		// ACT
		//
		await testServer.authAgentFor(member).delete(`/projects/${projectToBeDeleted.id}`).expect(200);

		//
		// ASSERT
		//

		// Make sure the project and owned workflow and credential where deleted.
		await expect(getWorkflowById(ownedWorkflow1.id)).resolves.toBeNull();
		await expect(getWorkflowById(ownedWorkflow2.id)).resolves.toBeNull();
		await expect(getCredentialById(ownedCredential.id)).resolves.toBeNull();
		await expect(findProject(projectToBeDeleted.id)).rejects.toThrowError(EntityNotFoundError);

		// Make sure the sharings for them into the other project have been deleted
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: ownedWorkflow1.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: ownedWorkflow2.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(SharedCredentialsRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				credentialsId: ownedCredential.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
	});

	test('deletes the project relations', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();
		const editor = await createMember();
		const viewer = await createMember();

		const project = await createTeamProject(undefined, member);
		await linkUserToProject(editor, project, 'project:editor');
		await linkUserToProject(viewer, project, 'project:viewer');

		//
		// ACT
		//
		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(200);

		//
		// ASSERT
		//
		await expect(
			Container.get(ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: member.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: editor.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
		await expect(
			Container.get(ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: viewer.id,
			}),
		).rejects.toThrowError(EntityNotFoundError);
	});

	// Tests related to migrating workflows and credentials to new project:

	test('should fail if the project to delete does not exist', async () => {
		const member = await createMember();

		await testServer.authAgentFor(member).delete('/projects/1234').expect(403);
	});

	test('should fail to delete if project to migrate to and the project to delete are the same', async () => {
		const member = await createMember();
		const project = await createTeamProject(undefined, member);

		await testServer
			.authAgentFor(member)
			.delete(`/projects/${project.id}`)
			.query({ transferId: project.id })
			.expect(400);
	});

	test('does not migrate credentials and projects if the user does not have the permissions to create workflows or credentials in the target project', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();

		const projectToBeDeleted = await createTeamProject(undefined, member);
		const targetProject = await createTeamProject();
		await linkUserToProject(member, targetProject, 'project:viewer');

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${projectToBeDeleted.id}`)
			.query({ transferId: targetProject.id })
			//
			// ASSERT
			//
			.expect(404);
	});

	test('migrates workflows and credentials to another project if `migrateToProject` is passed', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();

		const projectToBeDeleted = await createTeamProject(undefined, member);
		const targetProject = await createTeamProject(undefined, member);
		const otherProject = await createTeamProject(undefined, member);

		// these should be re-owned to the targetProject
		const ownedCredential = await saveCredential(randomCredentialPayload(), {
			project: projectToBeDeleted,
			role: 'credential:owner',
		});
		const ownedWorkflow = await createWorkflow({}, projectToBeDeleted);

		// these should stay intact
		await shareCredentialWithProjects(ownedCredential, [otherProject]);
		await shareWorkflowWithProjects(ownedWorkflow, [
			{ project: otherProject, role: 'workflow:editor' },
		]);

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${projectToBeDeleted.id}`)
			.query({ transferId: targetProject.id })
			.expect(200);

		//
		// ASSERT
		//

		// projectToBeDeleted is deleted
		await expect(findProject(projectToBeDeleted.id)).rejects.toThrowError(EntityNotFoundError);

		// ownedWorkflow has not been deleted
		await expect(getWorkflowById(ownedWorkflow.id)).resolves.toBeDefined();

		// ownedCredential has not been deleted
		await expect(getCredentialById(ownedCredential.id)).resolves.toBeDefined();

		// there is a sharing for ownedWorkflow and targetProject
		await expect(
			Container.get(SharedCredentialsRepository).findOneByOrFail({
				credentialsId: ownedCredential.id,
				projectId: targetProject.id,
				role: 'credential:owner',
			}),
		).resolves.toBeDefined();

		// there is a sharing for ownedCredential and targetProject
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				workflowId: ownedWorkflow.id,
				projectId: targetProject.id,
				role: 'workflow:owner',
			}),
		).resolves.toBeDefined();

		// there is a sharing for ownedWorkflow and otherProject
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				workflowId: ownedWorkflow.id,
				projectId: otherProject.id,
				role: 'workflow:editor',
			}),
		).resolves.toBeDefined();

		// there is a sharing for ownedCredential and otherProject
		await expect(
			Container.get(SharedCredentialsRepository).findOneByOrFail({
				credentialsId: ownedCredential.id,
				projectId: otherProject.id,
				role: 'credential:user',
			}),
		).resolves.toBeDefined();
	});

	// This test is testing behavior that is explicitly not enabled right now,
	// but we want this to work if we in the future allow sharing of credentials
	// and/or workflows between team projects.
	test('should upgrade a projects role if the workflow/credential is already shared with it', async () => {
		//
		// ARRANGE
		//
		const member = await createMember();
		const project = await createTeamProject(undefined, member);
		const credential = await saveCredential(randomCredentialPayload(), {
			project,
			role: 'credential:owner',
		});
		const workflow = await createWorkflow({}, project);
		const projectToMigrateTo = await createTeamProject(undefined, member);

		await shareWorkflowWithProjects(workflow, [
			{ project: projectToMigrateTo, role: 'workflow:editor' },
		]);
		await shareCredentialWithProjects(credential, [projectToMigrateTo]);

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${project.id}`)
			.query({ transferId: projectToMigrateTo.id })
			.expect(200);

		//
		// ASSERT
		//

		await expect(
			Container.get(SharedCredentialsRepository).findOneByOrFail({
				credentialsId: credential.id,
				projectId: projectToMigrateTo.id,
				role: 'credential:owner',
			}),
		).resolves.toBeDefined();
		await expect(
			Container.get(SharedWorkflowRepository).findOneByOrFail({
				workflowId: workflow.id,
				projectId: projectToMigrateTo.id,
				role: 'workflow:owner',
			}),
		).resolves.toBeDefined();
	});
});
