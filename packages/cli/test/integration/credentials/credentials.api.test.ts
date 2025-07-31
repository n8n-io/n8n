import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload as payload,
	randomCredentialPayload,
	randomCredentialPayloadWithOauthTokenData,
	randomName,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, User, ListQueryDb } from '@n8n/db';
import { CredentialsRepository, ProjectRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@sentry/node';
import * as a from 'assert';
import { mock } from 'jest-mock-extended';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { randomString } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsTester } from '@/services/credentials-tester.service';

import {
	decryptCredentialData,
	getCredentialById,
	saveCredential,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '../shared/db/credentials';
import { createAdmin, createManyUsers, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;
let admin: User;
let secondMember: User;

let ownerPersonalProject: Project;
let memberPersonalProject: Project;

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAdminAgent: SuperAgentTest;

let projectRepository: ProjectRepository;
let sharedCredentialsRepository: SharedCredentialsRepository;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);

	owner = await createOwner();
	member = await createMember();
	admin = await createAdmin();
	secondMember = await createMember();

	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAdminAgent = testServer.authAgentFor(admin);

	projectRepository = Container.get(ProjectRepository);
	sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
});

type GetAllResponse = { body: { data: ListQueryDb.Credentials.WithOwnedByAndSharedWith[] } };

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
		response.body.data.forEach((credential: ListQueryDb.Credentials.WithOwnedByAndSharedWith) => {
			validateMainCredentialData(credential);
			expect('data' in credential).toBe(false);
			expect(savedCredentialsIds).toContain(credential.id);
			expect('isManaged' in credential).toBe(true);
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
				[
					'credential:move',
					'credential:read',
					'credential:update',
					'credential:share',
					'credential:delete',
				].sort(),
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

	test('should return data when ?includeData=true', async () => {
		// ARRANGE
		const [actor, otherMember] = await createManyUsers(2, {
			role: 'global:member',
		});

		const teamProjectViewer = await createTeamProject(undefined);
		await linkUserToProject(actor, teamProjectViewer, 'project:viewer');
		const teamProjectEditor = await createTeamProject(undefined);
		await linkUserToProject(actor, teamProjectEditor, 'project:editor');

		const [
			// should have data
			ownedCredential,
			// should not have
			sharedCredential,
			// should not have data
			teamCredentialAsViewer,
			// should have data
			teamCredentialAsEditor,
		] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: actor, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), { user: otherMember, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), {
				project: teamProjectViewer,
				role: 'credential:owner',
			}),
			saveCredential(randomCredentialPayload(), {
				project: teamProjectEditor,
				role: 'credential:owner',
			}),
		]);
		await shareCredentialWithUsers(sharedCredential, [actor]);

		// ACT
		const response = await testServer
			.authAgentFor(actor)
			.get('/credentials')
			.query({ includeData: true });

		// ASSERT
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);

		const creds = response.body.data as Array<Credentials & { scopes: Scope[] }>;
		const ownedCred = creds.find((c) => c.id === ownedCredential.id)!;
		const sharedCred = creds.find((c) => c.id === sharedCredential.id)!;
		const teamCredAsViewer = creds.find((c) => c.id === teamCredentialAsViewer.id)!;
		const teamCredAsEditor = creds.find((c) => c.id === teamCredentialAsEditor.id)!;

		expect(ownedCred.id).toBe(ownedCredential.id);
		expect(ownedCred.data).toBeDefined();
		expect(ownedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
			].sort(),
		);

		expect(sharedCred.id).toBe(sharedCredential.id);
		expect(sharedCred.data).not.toBeDefined();
		expect(sharedCred.scopes).toEqual(['credential:read'].sort());

		expect(teamCredAsViewer.id).toBe(teamCredentialAsViewer.id);
		expect(teamCredAsViewer.data).not.toBeDefined();
		expect(teamCredAsViewer.scopes).toEqual(['credential:read'].sort());

		expect(teamCredAsEditor.id).toBe(teamCredentialAsEditor.id);
		expect(teamCredAsEditor.data).toBeDefined();
		expect(teamCredAsEditor.scopes).toEqual(
			['credential:read', 'credential:update', 'credential:delete'].sort(),
		);
	});

	test('should return data when ?includeData=true for owners', async () => {
		// ARRANGE
		const teamProjectViewer = await createTeamProject(undefined);

		const [
			// should have data
			ownedCredential,
			// should have data
			sharedCredential,
			// should have data
			teamCredentialAsViewer,
		] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: owner, role: 'credential:owner' }),
			saveCredential(randomCredentialPayload(), { user: member, role: 'credential:owner' }),
			saveCredential(randomCredentialPayloadWithOauthTokenData(), {
				project: teamProjectViewer,
				role: 'credential:owner',
			}),
		]);

		// ACT
		const response = await testServer
			.authAgentFor(owner)
			.get('/credentials')
			.query({ includeData: true });

		// ASSERT
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);

		const creds = response.body.data as Array<Credentials & { scopes: Scope[] }>;
		const ownedCred = creds.find((c) => c.id === ownedCredential.id)!;
		const sharedCred = creds.find((c) => c.id === sharedCredential.id)!;
		const teamCredAsViewer = creds.find((c) => c.id === teamCredentialAsViewer.id)!;

		expect(ownedCred.id).toBe(ownedCredential.id);
		expect(ownedCred.data).toBeDefined();
		expect(ownedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);

		expect(sharedCred.id).toBe(sharedCredential.id);
		expect(sharedCred.data).toBeDefined();
		expect(sharedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);

		expect(teamCredAsViewer.id).toBe(teamCredentialAsViewer.id);
		expect(teamCredAsViewer.data).toBeDefined();
		expect(
			(teamCredAsViewer.data as unknown as ICredentialDataDecryptedObject).oauthTokenData,
		).toBe(true);
		expect(teamCredAsViewer.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);
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

		test('should return homeProject when filtering credentials by projectId', async () => {
			const project = await createTeamProject(undefined, member);
			const credential = await saveCredential(payload(), { user: owner, role: 'credential:owner' });
			await shareCredentialWithProjects(credential, [project]);

			const response: GetAllResponse = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${project.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].homeProject).not.toBeNull();
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

		test('should return only owned credentials when filtering by owner personal project id', async () => {
			// Create credential owned by `owner` and share it to `member`
			const ownerCredential = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			// Create credential owned by `member`
			const memberCredential = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			await shareCredentialWithUsers(memberCredential, [owner]);

			// Simulate editing a workflow owned by `owner` so request credentials to their personal project
			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			expect(response.body.data.map((credential) => credential.id)).toContain(ownerCredential.id);
		});

		test('should return only owned credentials when filtering by member personal project id', async () => {
			// Create credential owned by `member`
			const memberCredential = await saveCredential(payload(), {
				user: member,
				role: 'credential:owner',
			});

			// Create credential owned by `owner` and share it to `member`
			const ownerCredential = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});

			await shareCredentialWithUsers(ownerCredential, [member]);

			// Simulate editing a workflow owned by `owner` so request credentials to their personal project
			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${memberPersonalProject.id}" }`)
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			expect(response.body.data.map((credential) => credential.id)).toContain(memberCredential.id);
		});

		test('should not ignore the project filter when the request is done by an owner and also includes the scopes', async () => {
			const ownerCredential = await saveCredential(payload(), {
				user: owner,
				role: 'credential:owner',
			});
			// should not show up
			await saveCredential(payload(), { user: member, role: 'credential:owner' });

			const response: GetAllResponse = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query({
					filter: JSON.stringify({ projectId: ownerPersonalProject.id }),
					includeScopes: true,
				})
				.expect(200);

			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].id).toBe(ownerCredential.id);
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

		const credential = await getCredentialById(id);
		a.ok(credential);

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(await decryptCredentialData(credential)).toStrictEqual(payload.data);

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
				message: "You don't have the permissions to save the credential in this project.",
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

	test('should not allow to overwrite oauthTokenData', async () => {
		// ARRANGE
		const credential = randomCredentialPayload();
		credential.data.oauthTokenData = { access_token: 'foo' };
		const savedCredential = await saveCredential(credential, {
			user: owner,
			role: 'credential:owner',
		});

		// ACT
		const patchPayload = {
			...credential,
			data: { accessToken: 'new', oauthTokenData: { access_token: 'bar' } },
		};
		await authOwnerAgent.patch(`/credentials/${savedCredential.id}`).send(patchPayload).expect(200);

		// ASSERT
		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);

		const { id, data } = response.body.data;

		expect(id).toBe(savedCredential.id);
		// was overwritten
		expect(data.accessToken).toBe(patchPayload.data.accessToken);
		// was not overwritten
		const dbCredential = await getCredentialById(savedCredential.id);
		const unencryptedData = Container.get(CredentialsService).decrypt(dbCredential!);
		expect(unencryptedData.oauthTokenData).toEqual(credential.data.oauthTokenData);
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

	test('should fail with a 404 if the credential does not exist and the actor does not have the global credential:update scope', async () => {
		const response = await authMemberAgent
			.patch('/credentials/123')
			.send(randomCredentialPayload());

		expect(response.statusCode).toBe(404);
	});

	test('should fail with a 400 is credential is managed', async () => {
		const { id } = await saveCredential(randomCredentialPayload({ isManaged: true }), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent
			.patch(`/credentials/${id}`)
			.send(randomCredentialPayload());

		expect(response.statusCode).toBe(400);
	});
});

describe('GET /credentials/new', () => {
	test('should return default name for new credential or its increment', async () => {
		const name = Container.get(GlobalConfig).credentials.defaultName;
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

	test('should redact the data when `includeData:true` is passed', async () => {
		const credentialService = Container.get(CredentialsService);
		const redactSpy = jest.spyOn(credentialService, 'redact');
		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(response.body.data);
		expect(response.body.data.data).toBeDefined();
		expect(redactSpy).toHaveBeenCalled();
	});

	test('should omit oauth data when `includeData:true` is passed', async () => {
		const credential = randomCredentialPayloadWithOauthTokenData();
		const savedCredential = await saveCredential(credential, {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(response.body.data);
		expect(response.body.data.data).toBeDefined();
		expect(response.body.data.data.oauthTokenData).toBe(true);
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

describe('POST /credentials/test', () => {
	const mockCredentialsTester = mock<CredentialsTester>();
	Container.set(CredentialsTester, mockCredentialsTester);

	afterEach(() => {
		mockCredentialsTester.testCredentials.mockClear();
	});

	test('should test a credential with unredacted data', async () => {
		mockCredentialsTester.testCredentials.mockResolvedValue({
			status: 'OK',
			message: 'Credential tested successfully',
		});
		const credential = randomCredentialPayload();
		const savedCredential = await saveCredential(credential, {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent.post('/credentials/test').send({
			credentials: {
				id: savedCredential.id,
				type: savedCredential.type,
				data: credential.data,
			},
		});
		expect(response.statusCode).toBe(200);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][0]).toEqual(owner.id);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][1]).toBe(savedCredential.type);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][2]).toEqual({
			id: savedCredential.id,
			type: savedCredential.type,
			data: credential.data,
		});
	});

	test('should test a credential with redacted data', async () => {
		mockCredentialsTester.testCredentials.mockResolvedValue({
			status: 'OK',
			message: 'Credential tested successfully',
		});
		const credential = randomCredentialPayload();
		const savedCredential = await saveCredential(credential, {
			user: owner,
			role: 'credential:owner',
		});

		const response = await authOwnerAgent.post('/credentials/test').send({
			credentials: {
				id: savedCredential.id,
				type: savedCredential.type,
				data: {
					accessToken: CREDENTIAL_BLANKING_VALUE,
				},
			},
		});
		expect(response.statusCode).toBe(200);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][0]).toEqual(owner.id);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][1]).toBe(savedCredential.type);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][2]).toEqual({
			id: savedCredential.id,
			type: savedCredential.type,
			data: credential.data,
		});
	});

	test('should return only credentials shared with me when ?onlySharedWithMe=true (owner)', async () => {
		await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const memberCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		await shareCredentialWithUsers(memberCredential, [owner]);

		let response;

		response = await authOwnerAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(memberCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();

		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test('should return only credentials shared with me when ?onlySharedWithMe=true (admin)', async () => {
		await saveCredential(randomCredentialPayload(), {
			user: admin,
			role: 'credential:owner',
		});

		await saveCredential(randomCredentialPayload(), {
			user: admin,
			role: 'credential:owner',
		});

		const memberCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		await shareCredentialWithUsers(memberCredential, [admin]);

		let response;

		response = await authAdminAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(memberCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();

		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});

	test('should return only credentials shared with me when ?onlySharedWithMe=true (member)', async () => {
		await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		const ownerCredential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await shareCredentialWithUsers(ownerCredential, [member]);

		let response;

		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });

		expect(response.statusCode).toBe(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(ownerCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();

		response = await authOwnerAgent.get('/credentials').query({ onlySharedWithMe: true });

		expect(response.statusCode).toBe(200);

		expect(response.body.data).toHaveLength(0);
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

function validateMainCredentialData(credential: ListQueryDb.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, sharedWithProjects, homeProject, isManaged } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof isManaged).toBe('boolean');

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

function validateCredentialWithNoData(
	credential: ListQueryDb.Credentials.WithOwnedByAndSharedWith,
) {
	validateMainCredentialData(credential);

	expect('data' in credential).toBe(false);
}
