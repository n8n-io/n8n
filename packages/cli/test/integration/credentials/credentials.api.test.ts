import { Container } from 'typedi';
import type { Scope } from '@sentry/node';
import { Credentials } from 'n8n-core';

import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import config from '@/config';
import { ProjectRepository } from '@db/repositories/project.repository';
import type { Project } from '@db/entities/Project';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';

import * as testDb from '../shared/testDb';
import { setupTestServer } from '../shared/utils';
import {
	randomCredentialPayload as payload,
	randomCredentialPayload,
	randomName,
	randomString,
} from '../shared/random';
import {
	saveCredential,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '../shared/db/credentials';
import { createManyUsers, createMember, createOwner } from '../shared/db/users';
import { createTeamProject, linkUserToProject } from '../shared/db/projects';
import type { SuperAgentTest } from '../shared/types';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;
let secondMember: User;

let ownerPersonalProject: Project;
let memberPersonalProject: Project;

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

let projectRepository: ProjectRepository;
let sharedCredentialsRepository: SharedCredentialsRepository;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);

	owner = await createOwner();
	member = await createMember();
	secondMember = await createMember();

	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	projectRepository = Container.get(ProjectRepository);
	sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
});

type GetAllResponse = { body: { data: ListQuery.Credentials.WithOwnedByAndSharedWith[] } };

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [{ id: savedOwnerCredentialId }, { id: savedMemberCredentialId }] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: owner, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), { user: member, role: 'credential:owner' }),
		]);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2); // owner retrieved owner cred and member cred

		const savedCredentialsIds = [savedOwnerCredentialId, savedMemberCredentialId];
		response.body.data.forEach((credential: ListQuery.Credentials.WithOwnedByAndSharedWith) => {
			validateMainCredentialData(credential);
			expect('data' in credential).toBe(false);
			expect(savedCredentialsIds).toContain(credential.id);
		});
	});

	test('should return only own creds for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		const [savedCredential1] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: member1, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), { user: member2, role: 'credential:owner' }),
		]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1); // member retrieved only own cred

		const [member1Credential] = response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();
		expect(member1Credential.id).toBe(savedCredential1.id);
	});

	test('should return scopes when ?includeScopes=true', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		const teamProject = await createTeamProject(undefined, member1);
		await linkUserToProject(member2, teamProject, 'project:editor');

		const [savedCredential1, savedCredential2] = await Promise.all([
			saveCredential(randomCredentialPayload(), { project: teamProject, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), { user: member2, role: 'credential:owner' }),
		]);

		await shareCredentialWithProjects(savedCredential2, [teamProject]);

		{
			const response = await testServer
				.authAgentFor(member1)
				.get('/credentials?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const creds = response.body.data as Array<Credentials & { scopes: Scope[] }>;
			const cred1 = creds.find((c) => c.id === savedCredential1.id)!;
			const cred2 = creds.find((c) => c.id === savedCredential2.id)!;

			// Team cred
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(
				['credential:move', 'credential:read', 'credential:update', 'credential:delete'].sort(),
			);

			// Shared cred
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(['credential:read']);
		}

		{
			const response = await testServer
				.authAgentFor(member2)
				.get('/credentials?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const creds = response.body.data as Array<Credentials & { scopes: Scope[] }>;
			const cred1 = creds.find((c) => c.id === savedCredential1.id)!;
			const cred2 = creds.find((c) => c.id === savedCredential2.id)!;

			// Team cred
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(['credential:delete', 'credential:read', 'credential:update']);

			// Shared cred
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(
				[
					'credential:delete',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);
		}

		{
			const response = await testServer.authAgentFor(owner).get('/credentials?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const creds = response.body.data as Array<Credentials & { scopes: Scope[] }>;
			const cred1 = creds.find((c) => c.id === savedCredential1.id)!;
			const cred2 = creds.find((c) => c.id === savedCredential2.id)!;

			// Team cred
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(
				[
					'credential:create',
					'credential:delete',
					'credential:list',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);

			// Shared cred
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(
				[
					'credential:create',
					'credential:delete',
					'credential:list',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);
		}
	});

	describe('should return', () => {
		test('all credentials for owner', async () => {
			const { id: id1 } = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			const { id: id2 } = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredentialWithNoData);

			const savedIds = [id1, id2].sort();
			const returnedIds = response.body.data.map((c) => c.id).sort();

			expect(savedIds).toEqual(returnedIds);
		});

		test('only own credentials for member', async () => {
			const firstMember = member;
			const secondMember = await createMember();

			const c1 = await saveCredential(payload(), { user: firstMember, role: 'credential:owner' });
			const c2 = await saveCredential(payload(), { user: secondMember, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(firstMember)
				.get('/credentials')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [firstMemberCred] = response.body.data;

			validateCredentialWithNoData(firstMemberCred);
			expect(firstMemberCred.id).toBe(c1.id);
			expect(firstMemberCred.id).not.toBe(c2.id);
		});
	});

	describe('filter', () => {
		test('should filter credentials by field: name - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${savedCred.name}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: name - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialName = savedCred.name.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${partialName}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.name).toBe(savedCred.name);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - full match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${savedCred.type}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by field: type - partial match', async () => {
			const savedCred = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const partialType = savedCred.type.slice(3);

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${partialType}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			const [returnedCred] = response.body.data;

			expect(returnedCred.type).toBe(savedCred.type);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);

			expect(_response.body.data).toHaveLength(0);
		});

		test('should filter credentials by projectId', async () => {
			const credential = await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response1: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(credential.id);

			const response2 = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);
		});

		test('should return all credentials in a team project that member is part of', async () => {
			const teamProjectWithMember = await createTeamProject('Team Project With member', owner);
			void (await linkUserToProject(member, teamProjectWithMember, 'project:editor'));
			await saveCredential(payload(), {
				project: teamProjectWithMember,
				role: 'credential:owner',
			});
			await saveCredential(payload(), {
				project: teamProjectWithMember,
				role: 'credential:owner',
			});
			const response: GetAllResponse = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${teamProjectWithMember.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(2);
		});

		test('should return no credentials in a team project that member not is part of', async () => {
			const teamProjectWithoutMember = await createTeamProject(
				'Team Project Without member',
				owner,
			);

			await saveCredential(payload(), {
				project: teamProjectWithoutMember,
				role: 'credential:owner',
			});

			const response = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${teamProjectWithoutMember.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(0);
		});

		test('should return only owned and explicitly shared credentials when filtering by any personal project id', async () => {
			// Create credential owned by `owner` and share it to `member`
			const ownerCredential = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			await shareCredentialWithUsers(ownerCredential, [member]);
			// Create credential owned by `member`
			const memberCredential = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			// Simulate editing a workflow owned by `owner` so request credentials to their personal project
			const response: GetAllResponse = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data.map((credential) => credential.id)).toContain(ownerCredential.id);
			expect(response.body.data.map((credential) => credential.id)).toContain(memberCredential.id);
		});

		test('should return all credentials to instance owners when working on their own personal project', async () => {
			const ownerCredential = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			const memberCredential = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }&includeScopes=true`)
				.expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data.map((credential) => credential.id)).toContain(ownerCredential.id);
			expect(response.body.data.map((credential) => credential.id)).toContain(memberCredential.id);
		});
	});

	describe('select', () => {
		test('should select credential field: id', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["id"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ id: any(String) }, { id: any(String) }],
			});
		});

		test('should select credential field: name', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["name"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ name: any(String) }, { name: any(String) }],
			});
		});

		test('should select credential field: type', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["type"]')
				.expect(200);

			expect(response.body).toEqual({
				data: [{ type: any(String) }, { type: any(String) }],
			});
		});
	});

	describe('take', () => {
		test('should return n credentials or less, without skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=2')
				.expect(200);

			expect(response.body.data).toHaveLength(2);

			response.body.data.forEach(validateCredentialWithNoData);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validateCredentialWithNoData);
		});

		test('should return n credentials or less, with skip', async () => {
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await saveCredential(payload(), { user: owner, role: 'credential:owner' });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1&skip=1')
				.expect(200);

			expect(response.body.data).toHaveLength(1);

			response.body.data.forEach(validateCredentialWithNoData);
		});
	});
});

describe('POST /credentials', () => {
	test('should create cred', async () => {
		const payload = randomCredentialPayload();

		const response = await authMemberAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData, scopes } = response.body.data;

		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		expect(encryptedData).not.toBe(payload.data);

		expect(scopes).toEqual(
			[
				'credential:delete',
				'credential:move',
				'credential:read',
				'credential:share',
				'credential:update',
			].sort(),
		);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.data).not.toBe(payload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: { project: true, credentials: true },
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.project.id).toBe(memberPersonalProject.id);
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});

	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('should ignore ID in payload', async () => {
		const firstResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: '8', ...randomCredentialPayload() });

		expect(firstResponse.body.data.id).not.toBe('8');

		const secondResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: 8, ...randomCredentialPayload() });

		expect(secondResponse.body.data.id).not.toBe(8);
	});

	test('creates credential in personal project by default', async () => {
		//
		// ACT
		//
		const response = await authOwnerAgent.post('/credentials').send(randomCredentialPayload());

		//
		// ASSERT
		//
		await sharedCredentialsRepository.findOneByOrFail({
			projectId: ownerPersonalProject.id,
			credentialsId: response.body.data.id,
		});
	});

	test('creates credential in a specific project if the projectId is passed', async () => {
		//
		// ARRANGE
		//
		const project = await createTeamProject('Team Project', owner);

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/credentials')
			.send({ ...randomCredentialPayload(), projectId: project.id });

		//
		// ASSERT
		//
		await sharedCredentialsRepository.findOneByOrFail({
			projectId: project.id,
			credentialsId: response.body.data.id,
		});
	});

	test('does not create the credential in a specific project if the user is not part of the project', async () => {
		//
		// ARRANGE
		//
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);

		//
		// ACT
		//
		await authMemberAgent
			.post('/credentials')
			.send({ ...randomCredentialPayload(), projectId: project.id })
			//
			// ASSERT
			//
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});
});

describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);

		const shellCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(shellCredential).toBeDefined(); // not deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeDefined(); // not deleted
	});

	test('should not delete non-owned but shared cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: secondMember,
			role: 'credential:owner',
		});

		await shareCredentialWithUsers(savedCredential, [member]);

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);

		const shellCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(shellCredential).toBeDefined(); // not deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeDefined(); // not deleted
	});

	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.delete('/credentials/123');

		expect(response.statusCode).toBe(404);
	});
});

describe('PATCH /credentials/:id', () => {
	test('should update owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData, scopes } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		expect(scopes).toEqual(
			[
				'credential:create',
				'credential:delete',
				'credential:list',
				'credential:move',
				'credential:read',
				'credential:share',
				'credential:update',
			].sort(),
		);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should update non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);

		const credentialObject = new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
		expect(credentialObject.getData()).toStrictEqual(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should update owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should not update non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(403);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should not update non-owned but shared cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: secondMember,
			role: 'credential:owner',
		});
		await shareCredentialWithUsers(savedCredential, [member]);
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(403);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should update non-owned but shared cred for instance owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: secondMember,
			role: 'credential:owner',
		});
		await shareCredentialWithUsers(savedCredential, [owner]);
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).toBe(patchPayload.name); // updated
	});

	test('should fail with invalid inputs', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent
				.patch(`/credentials/${savedCredential.id}`)
				.send(invalidPayload);

			expect(response.statusCode).toBe(400);
		}
	});

	test('should fail with a 404 if the credential does not exist and the actor has the global credential:update scope', async () => {
		const response = await authOwnerAgent.patch('/credentials/123').send(randomCredentialPayload());

		expect(response.statusCode).toBe(404);
	});

	test('should fail with a 403 if the credential does not exist and the actor does not have the global credential:update scope', async () => {
		const response = await authMemberAgent
			.patch('/credentials/123')
			.send(randomCredentialPayload());

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /credentials/new', () => {
	test('should return default name for new credential or its increment', async () => {
		const name = config.getEnv('credentials.defaultName');
		let tempName = name;

		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);

			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await saveCredential(
				{ ...randomCredentialPayload(), name: tempName },
				{ user: owner, role: 'credential:owner' },
			);
		}
	});

	test('should return name from query for new credential or its increment', async () => {
		const name = 'special credential name';
		let tempName = name;

		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);

			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await saveCredential(
				{ ...randomCredentialPayload(), name: tempName },
				{ user: owner, role: 'credential:owner' },
			);
		}
	});
});

describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(response1.statusCode).toBe(200);

		validateMainCredentialData(response1.body.data);
		expect(response1.body.data.data).toBeUndefined();

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(response2.statusCode).toBe(200);

		validateMainCredentialData(response2.body.data);
		expect(response2.body.data.data).toBeDefined();
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
	});
});

const INVALID_PAYLOADS = [
	{
		type: randomName(),
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		type: randomName(),
	},
	{},
	undefined,
];

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, sharedWithProjects, homeProject } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');

	if (sharedWithProjects) {
		expect(Array.isArray(sharedWithProjects)).toBe(true);
	}

	if (homeProject) {
		const { id, type, name } = homeProject;

		expect(typeof id).toBe('string');
		expect(typeof name).toBe('string');
		expect(type).toBe('personal');
	}
}

function validateCredentialWithNoData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	validateMainCredentialData(credential);

	expect('data' in credential).toBe(false);
}
