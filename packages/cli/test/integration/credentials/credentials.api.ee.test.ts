import { Container } from 'typedi';
import { In } from '@n8n/typeorm';

import config from '@/config';
import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { ProjectRepository } from '@db/repositories/project.repository';
import type { Project } from '@db/entities/Project';
import { ProjectService } from '@/services/project.service';
import { UserManagementMailer } from '@/UserManagement/email';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import * as utils from '../shared/utils';
import {
	affixRoleToSaveCredential,
	getCredentialSharings,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '../shared/db/credentials';
import {
	createAdmin,
	createManyUsers,
	createOwner,
	createUser,
	createUserShell,
} from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { mockInstance } from '../../shared/mocking';
import { createTeamProject, linkUserToProject } from '../shared/db/projects';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

let owner: User;
let admin: User;
let ownerPersonalProject: Project;
let member: User;
let memberPersonalProject: Project;
let anotherMember: User;
let anotherMemberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;
const mailer = mockInstance(UserManagementMailer);

let projectService: ProjectService;
let projectRepository: ProjectRepository;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials', 'Project', 'ProjectRelation']);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);

	owner = await createOwner();
	admin = await createAdmin();
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

	member = await createUser({ role: 'global:member' });
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);

	anotherMember = await createUser({ role: 'global:member' });
	anotherMemberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
		anotherMember.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = affixRoleToSaveCredential('credential:owner');
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('POST /credentials', () => {
	test('project viewers cannot create credentials', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const response = await testServer
			.authAgentFor(member)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), projectId: teamProject.id });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			"You don't have the permissions to save the credential in this project.",
		);
	});
});

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		const member3PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member3.id,
		);

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		await saveCredential(randomCredentialPayload(), { user: member1 });

		const sharedWith = [member1PersonalProject, member2PersonalProject, member3PersonalProject];
		await shareCredentialWithProjects(savedCredential, sharedWith);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2); // owner retrieved owner cred and member cred
		const ownerCredential: ListQuery.Credentials.WithOwnedByAndSharedWith = response.body.data.find(
			(e: ListQuery.Credentials.WithOwnedByAndSharedWith) =>
				e.homeProject?.id === ownerPersonalProject.id,
		);
		const memberCredential: ListQuery.Credentials.WithOwnedByAndSharedWith =
			response.body.data.find(
				(e: ListQuery.Credentials.WithOwnedByAndSharedWith) =>
					e.homeProject?.id === member1PersonalProject.id,
			);

		validateMainCredentialData(ownerCredential);
		expect(ownerCredential.data).toBeUndefined();

		validateMainCredentialData(memberCredential);
		expect(memberCredential.data).toBeUndefined();

		expect(ownerCredential.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			type: 'personal',
			name: owner.createPersonalProjectName(),
		});

		expect(Array.isArray(ownerCredential.sharedWithProjects)).toBe(true);
		expect(ownerCredential.sharedWithProjects).toHaveLength(3);

		// Fix order issue (MySQL might return items in any order)
		const ownerCredentialsSharedWithOrdered = [...ownerCredential.sharedWithProjects].sort(
			(a, b) => (a.id < b.id ? -1 : 1),
		);
		const orderedSharedWith = [...sharedWith].sort((a, b) => (a.id < b.id ? -1 : 1));

		ownerCredentialsSharedWithOrdered.forEach((sharee, idx) => {
			expect(sharee).toMatchObject({
				id: orderedSharedWith[idx].id,
				type: orderedSharedWith[idx].type,
			});
		});

		expect(memberCredential.homeProject).toMatchObject({
			id: member1PersonalProject.id,
			type: member1PersonalProject.type,
			name: member1.createPersonalProjectName(),
		});

		expect(Array.isArray(memberCredential.sharedWithProjects)).toBe(true);
		expect(memberCredential.sharedWithProjects).toHaveLength(0);
	});

	test('should return only relevant creds for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);

		await saveCredential(randomCredentialPayload(), { user: member2 });
		const savedMemberCredential = await saveCredential(randomCredentialPayload(), {
			user: member1,
		});

		await shareCredentialWithUsers(savedMemberCredential, [member2]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1); // member retrieved only member cred

		const [member1Credential]: [ListQuery.Credentials.WithOwnedByAndSharedWith] =
			response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();

		expect(member1Credential.homeProject).toMatchObject({
			id: member1PersonalProject.id,
			name: member1.createPersonalProjectName(),
			type: member1PersonalProject.type,
		});

		expect(member1Credential.sharedWithProjects).toHaveLength(1);
		expect(member1Credential.sharedWithProjects[0]).toMatchObject({
			id: member2PersonalProject.id,
			name: member2.createPersonalProjectName(),
			type: member2PersonalProject.type,
		});
	});

	test('should show credentials that the user has access to through a team project they are part of', async () => {
		//
		// ARRANGE
		//
		const project1 = await projectService.createTeamProject('Team Project', member);
		await projectService.addUser(project1.id, anotherMember.id, 'project:editor');
		// anotherMember should see this one
		const credential1 = await saveCredential(randomCredentialPayload(), { project: project1 });

		const project2 = await projectService.createTeamProject('Team Project', member);
		// anotherMember should NOT see this one
		await saveCredential(randomCredentialPayload(), { project: project2 });

		//
		// ACT
		//
		const response = await testServer.authAgentFor(anotherMember).get('/credentials');

		//
		// ASSERT
		//
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(credential1.id);
	});
});

// ----------------------------------------
// GET /credentials/:id - fetch a certain credential
// ----------------------------------------
describe('GET /credentials/:id', () => {
	test('project viewers can view credentials', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: teamProject,
		});

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			id: savedCredential.id,
			shared: [{ projectId: teamProject.id, role: 'credential:owner' }],
			homeProject: {
				id: teamProject.id,
			},
			sharedWithProjects: [],
			scopes: ['credential:read'],
		});
		expect(response.body.data.data).toBeUndefined();
	});

	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		const firstCredential: ListQuery.Credentials.WithOwnedByAndSharedWith = firstResponse.body.data;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();

		expect(firstCredential.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			name: owner.createPersonalProjectName(),
			type: ownerPersonalProject.type,
		});
		expect(firstCredential.sharedWithProjects).toHaveLength(0);

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		const { data: secondCredential } = secondResponse.body;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2]);

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`).expect(200);

		const credential: ListQuery.Credentials.WithOwnedByAndSharedWith = response1.body.data;

		validateMainCredentialData(credential);
		expect(credential.data).toBeUndefined();
		expect(credential).toMatchObject({
			homeProject: {
				id: member1PersonalProject.id,
				name: member1.createPersonalProjectName(),
				type: member1PersonalProject.type,
			},
			sharedWithProjects: [
				{
					id: member2PersonalProject.id,
					name: member2.createPersonalProjectName(),
					type: member2PersonalProject.type,
				},
			],
		});

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);

		const credential2: ListQuery.Credentials.WithOwnedByAndSharedWith = response2.body.data;

		validateMainCredentialData(credential);
		expect(credential2.data).toBeDefined(); // Instance owners should be capable of editing all credentials
		expect(credential2.sharedWithProjects).toHaveLength(1);
	});

	test('should retrieve owned cred for member', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		const member3PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member3.id,
		);
		const authMemberAgent = testServer.authAgentFor(member1);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2, member3]);

		const firstResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.expect(200);

		const firstCredential: ListQuery.Credentials.WithOwnedByAndSharedWith = firstResponse.body.data;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();
		expect(firstCredential).toMatchObject({
			homeProject: {
				id: member1PersonalProject.id,
				name: member1.createPersonalProjectName(),
				type: 'personal',
			},
			sharedWithProjects: expect.arrayContaining([
				{
					id: member2PersonalProject.id,
					name: member2.createPersonalProjectName(),
					type: member2PersonalProject.type,
				},
				{
					id: member3PersonalProject.id,
					name: member3.createPersonalProjectName(),
					type: member3PersonalProject.type,
				},
			]),
		});

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);

		const secondCredential: ListQuery.Credentials.WithOwnedByAndSharedWith =
			secondResponse.body.data;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
		expect(secondCredential.sharedWithProjects).toHaveLength(2);
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);

		// because EE router has precedence, check if forwards this route
		const responseNew = await authOwnerAgent.get('/credentials/new');
		expect(responseNew.statusCode).toBe(200);
	});
});

describe('PATCH /credentials/:id', () => {
	test('project viewer cannot update credentials', async () => {
		//
		// ARRANGE
		//
		const teamProject = await createTeamProject('', member);
		await linkUserToProject(member, teamProject, 'project:viewer');

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: teamProject,
		});

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.patch(`/credentials/${savedCredential.id}`)
			.send({ ...randomCredentialPayload() });

		//
		// ASSERT
		//

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('User is missing a scope required to perform this action');
	});
});

// ----------------------------------------
// idempotent share/unshare
// ----------------------------------------
describe('PUT /credentials/:id/share', () => {
	test('should share the credential with the provided userIds and unshare it for missing ones', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2, member3, member4, member5] = await createManyUsers(5, {
			role: 'global:member',
		});
		// TODO: write helper for getting multiple personal projects by user id
		const shareWithProjectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);

		await shareCredentialWithUsers(savedCredential, [member4, member5]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: shareWithProjectIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		// check that sharings have been removed/added correctly
		expect(sharedCredentials.length).toBe(shareWithProjectIds.length + 1); // +1 for the owner

		sharedCredentials.forEach((sharedCredential) => {
			if (sharedCredential.projectId === ownerPersonalProject.id) {
				expect(sharedCredential.role).toBe('credential:owner');
				return;
			}
			expect(shareWithProjectIds).toContain(sharedCredential.projectId);
			expect(sharedCredential.role).toBe('credential:user');
		});

		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledWith(
			expect.objectContaining({
				newShareeIds: expect.arrayContaining([member1.id, member2.id, member3.id]),
				sharer: expect.objectContaining({ id: owner.id }),
				credentialsName: savedCredential.name,
			}),
		);
	});

	test('should share the credential with the provided userIds', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const projectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);
		// const memberIds = [member1.id, member2.id, member3.id];
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: projectIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		// check that sharings got correctly set in DB
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id, projectId: In(projectIds) },
		});

		expect(sharedCredentials.length).toBe(projectIds.length);

		sharedCredentials.forEach((sharedCredential) => {
			expect(sharedCredential.role).toBe('credential:user');
		});

		// check that owner still exists
		const ownerSharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			where: { credentialsId: savedCredential.id, projectId: ownerPersonalProject.id },
		});

		expect(ownerSharedCredential.role).toBe('credential:owner');
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should respond 403 for non-existing credentials', async () => {
		const response = await authOwnerAgent
			.put('/credentials/1234567/share')
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(response.statusCode).toBe(403);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for shared members', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [ownerPersonalProject.id] });

		expect(response.statusCode).toBe(403);
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing with self', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const tempUser = await createUser({ role: 'global:member' });
		const tempUserPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			tempUser.id,
		);

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [tempUserPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 200 for non-owned credentials for owners', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] })
			.expect(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should not ignore pending sharee', async () => {
		const memberShell = await createUserShell('global:member');
		const memberShellPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			memberShell.id,
		);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberShellPersonalProject.id] })
			.expect(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(2);
		expect(
			sharedCredentials.find((c) => c.projectId === ownerPersonalProject.id),
		).not.toBeUndefined();
		expect(
			sharedCredentials.find((c) => c.projectId === memberShellPersonalProject.id),
		).not.toBeUndefined();
	});

	test('should ignore non-existing sharee', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should respond 400 if invalid payload is provided', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const responses = await Promise.all([
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send(),
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send({ shareWithIds: [1] }),
		]);

		responses.forEach((response) => expect(response.statusCode).toBe(400));
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should unshare the credential', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should not call internal hooks listener for email sent if emailing is disabled', async () => {
		config.set('userManagement.emails.mode', '');

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		config.set('userManagement.emails.mode', 'smtp');
	});
});

describe('PUT /:credentialId/transfer', () => {
	test('cannot transfer into the same project', async () => {
		const destinationProject = await createTeamProject('Destination Project', member);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: destinationProject,
		});

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});

	test('cannot transfer into a personal project', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
		});

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: memberPersonalProject.id })
			.expect(400);
	});

	test('cannot transfer somebody elses credential', async () => {
		const destinationProject = await createTeamProject('Destination Project', member);

		const credential = await saveCredential(randomCredentialPayload(), {
			user: anotherMember,
		});

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(403);
	});

	test("cannot transfer if you're not a member of the destination project", async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
		});

		const destinationProject = await createTeamProject('Team Project');

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(404);
	});

	test('project:editors cannot transfer credentials', async () => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject('Source Project');
		await linkUserToProject(member, sourceProject, 'project:editor');

		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
		});

		const destinationProject = await createTeamProject('Destination Project', member);

		//
		// ACT & ASSERT
		//
		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(403);
	});

	test('transferring from a personal project to a team project severs all sharings', async () => {
		//
		// ARRANGE
		//
		const credential = await saveCredential(randomCredentialPayload(), { user: member });

		// these sharings should be deleted by the transfer
		await shareCredentialWithUsers(credential, [anotherMember, owner]);

		const destinationProject = await createTeamProject('Destination Project', member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});

		const allSharings = await getCredentialSharings(credential);
		expect(allSharings).toHaveLength(1);
		expect(allSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			credentialsId: credential.id,
			role: 'credential:owner',
		});
	});

	test('can transfer from team to another team project', async () => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject('Team Project 1', member);
		const credential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
		});

		const destinationProject = await createTeamProject('Team Project 2', member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});

		const allSharings = await getCredentialSharings(credential);
		expect(allSharings).toHaveLength(1);
		expect(allSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			credentialsId: credential.id,
			role: 'credential:owner',
		});
	});

	test.each([
		['owners', () => owner],
		['admins', () => admin],
	])(
		'%s can always transfer from any personal or team project into any team project',
		async (_name, actor) => {
			//
			// ARRANGE
			//
			const sourceProject = await createTeamProject('Source Project', member);
			const teamCredential = await saveCredential(randomCredentialPayload(), {
				project: sourceProject,
			});

			const personalCredential = await saveCredential(randomCredentialPayload(), { user: member });

			const destinationProject = await createTeamProject('Destination Project', member);

			//
			// ACT
			//
			const response1 = await testServer
				.authAgentFor(actor())
				.put(`/credentials/${teamCredential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);
			const response2 = await testServer
				.authAgentFor(actor())
				.put(`/credentials/${personalCredential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);

			//
			// ASSERT
			//
			expect(response1.body).toEqual({});
			expect(response2.body).toEqual({});

			{
				const allSharings = await getCredentialSharings(teamCredential);
				expect(allSharings).toHaveLength(1);
				expect(allSharings[0]).toMatchObject({
					projectId: destinationProject.id,
					credentialsId: teamCredential.id,
					role: 'credential:owner',
				});
			}

			{
				const allSharings = await getCredentialSharings(personalCredential);
				expect(allSharings).toHaveLength(1);
				expect(allSharings[0]).toMatchObject({
					projectId: destinationProject.id,
					credentialsId: personalCredential.id,
					role: 'credential:owner',
				});
			}
		},
	);

	test.each([
		['owners', () => owner],
		['admins', () => admin],
	])('%s cannot transfer into personal projects', async (_name, actor) => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject('Source Project', member);
		const teamCredential = await saveCredential(randomCredentialPayload(), {
			project: sourceProject,
		});

		const personalCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const destinationProject = anotherMemberPersonalProject;

		//
		// ACT & ASSERT
		//
		await testServer
			.authAgentFor(actor())
			.put(`/credentials/${teamCredential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
		await testServer
			.authAgentFor(actor())
			.put(`/credentials/${personalCredential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});
});

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(credential.homeProject).toBeDefined();
	expect(Array.isArray(credential.sharedWithProjects)).toBe(true);
}
