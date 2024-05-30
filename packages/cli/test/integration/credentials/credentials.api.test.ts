import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import * as testDb from '../shared/testDb';
import { setupTestServer } from '../shared/utils';
import { randomCredentialPayload as payload } from '../shared/random';
import { saveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import Container from 'typedi';
import type { Project } from '@/databases/entities/Project';
import { createTeamProject, linkUserToProject } from '../shared/db/projects';

const { any } = expect;

const testServer = setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;

let ownerPersonalProject: Project;
let memberPersonalProject: Project;
beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);

	owner = await createOwner();
	member = await createMember();
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);
});

type GetAllResponse = { body: { data: ListQuery.Credentials.WithOwnedByAndSharedWith[] } };

describe('GET /credentials', () => {
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

			response.body.data.forEach(validateCredential);

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

			validateCredential(firstMemberCred);
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

			response.body.data.forEach(validateCredential);

			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1')
				.expect(200);

			expect(_response.body.data).toHaveLength(1);

			_response.body.data.forEach(validateCredential);
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

			response.body.data.forEach(validateCredential);
		});
	});
});

function validateCredential(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, sharedWithProjects, homeProject } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect('data' in credential).toBe(false);

	if (sharedWithProjects) expect(Array.isArray(sharedWithProjects)).toBe(true);

	if (homeProject) {
		const { id, name, type } = homeProject;

		expect(typeof id).toBe('string');
		expect(typeof name).toBe('string');
		expect(type).toBe('personal');
	}
}
