import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { createOwner, createUser } from './shared/db/users';
import {
	createTeamProject,
	linkUserToProject,
	getPersonalProject,
	findProject,
	getProjectRelations,
} from './shared/db/projects';
import { ProjectRepository } from '@/databases/repositories/project.repository';
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

const testServer = utils.setupTestServer({
	endpointGroups: ['project'],
	enabledFeatures: ['feat:advancedPermissions'],
});

let projectRepository: ProjectRepository;
let projectRelationRepository: ProjectRelationRepository;

beforeAll(() => {
	projectRepository = Container.get(ProjectRepository);
	projectRelationRepository = Container.get(ProjectRelationRepository);
});

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
				return p.name === `${u.firstName} ${u.lastName}`;
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
				return p.name === `${u.firstName} ${u.lastName}`;
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).not.toBeUndefined();
	});
});

describe('GET /projects/my-projects', () => {
	test('member should get all projects they are apart of', async () => {
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

		const resp = await memberAgent.get('/projects/my-projects');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data as Project[];
		expect(respProjects.length).toBe(2);

		expect(
			[personalProject2, personalProject3].every((v) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return true;
				}
				return false;
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === personalProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).toBeUndefined();
	});

	test('owner should get all projects they are apart of', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			createOwner(),
			createUser(),
			createUser(),
			createUser(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			createTeamProject(undefined, testUser1),
			createTeamProject(undefined, ownerUser),
		]);

		const [ownerProject, personalProject1, personalProject2, personalProject3] = await Promise.all([
			getPersonalProject(ownerUser),
			getPersonalProject(testUser1),
			getPersonalProject(testUser2),
			getPersonalProject(testUser3),
		]);

		const memberAgent = testServer.authAgentFor(ownerUser);

		const resp = await memberAgent.get('/projects/my-projects');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data as Project[];
		expect(respProjects.length).toBe(2);

		expect(
			[personalProject1, personalProject2, personalProject3].every((v) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return true;
				}
				return false;
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === ownerProject.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject1.id)).toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).not.toBeUndefined();
	});
});

describe('GET /projects/personal', () => {
	test("should return the user's personal project", async () => {
		const user = await createUser();
		const project = await getPersonalProject(user);

		const memberAgent = testServer.authAgentFor(user);

		const resp = await memberAgent.get('/projects/personal');
		expect(resp.status).toBe(200);
		const respProject = resp.body.data as Project;
		expect(respProject.id).toEqual(project.id);
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
		expect(resp.status).toBe(200);

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

		await linkUserToProject(testUser1, teamProject1, 'project:viewer');
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
			role: 'project:viewer',
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

describe.only('DELETE /project/:projectId', () => {
	test('allows the project:owner to delete a project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject(undefined, owner);

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);

		const projectInDB = findProject(project.id);

		await expect(projectInDB).rejects.toThrowError(EntityNotFoundError);
	});

	test('does not allow deleting of personal projects', async () => {
		const owner = await createOwner();
		const project = await getPersonalProject(owner);

		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(404);

		const projectInDB = await findProject(project.id);

		expect(projectInDB).toHaveProperty('id', project.id);
	});

	test.each(['project:editor', 'project:viewer'] as ProjectRole[])(
		'does not allow users with the role %s to delete a project',
		async (role) => {
			const owner = await createOwner();
			const project = await createTeamProject();

			await linkUserToProject(owner, project, role);

			await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(404);

			const projectInDB = await findProject(project.id);

			expect(projectInDB).toHaveProperty('id', project.id);
		},
	);

	test.only('deletes all workflows and credentials it owns as well as the sharings into other projects', async () => {
		//
		// ARRANGE
		//
		const owner = await createOwner();

		const otherProject = await createTeamProject(undefined, owner);
		const sharedWorkflow1 = await createWorkflow({}, otherProject);
		const sharedWorkflow2 = await createWorkflow({}, otherProject);
		const sharedCredential = await saveCredential(randomCredentialPayload(), {
			project: otherProject,
			role: 'credential:owner',
		});

		const projectToBeDeleted = await createTeamProject(undefined, owner);
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
		await testServer.authAgentFor(owner).delete(`/projects/${projectToBeDeleted.id}`).expect(200);

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

	test.todo('unshares all workflows and credentials that were shared with the project');
});
