import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';

import type { Scope } from '@n8n/permissions';
import config from '@/config';
import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { License } from '@/License';

import { randomCredentialPayload, randomName, randomString } from './shared/random';
import * as testDb from './shared/testDb';
import type { SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils/';
import {
	affixRoleToSaveCredential,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from './shared/db/credentials';
import { createManyUsers, createUser } from './shared/db/users';
import { Credentials } from 'n8n-core';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import type { Project } from '@/databases/entities/Project';
import { ProjectService } from '@/services/project.service';
import { createTeamProject, linkUserToProject } from './shared/db/projects';

// mock that credentialsSharing is not enabled
jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let ownerPersonalProject: Project;
let member: User;
let memberPersonalProject: Project;
let secondMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;
let projectRepository: ProjectRepository;
let sharedCredentialsRepository: SharedCredentialsRepository;
let projectService: ProjectService;

beforeAll(async () => {
	projectRepository = Container.get(ProjectRepository);
	sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
	projectService = Container.get(ProjectService);
	owner = await createUser({ role: 'global:owner' });
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	member = await createUser({ role: 'global:member' });
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
	secondMember = await createUser({ role: 'global:member' });

	saveCredential = affixRoleToSaveCredential('credential:owner');

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [{ id: savedOwnerCredentialId }, { id: savedMemberCredentialId }] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: owner }),
			saveCredential(randomCredentialPayload(), { user: member }),
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
			saveCredential(randomCredentialPayload(), { user: member1 }),
			saveCredential(randomCredentialPayload(), { user: member2 }),
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
			saveCredential(randomCredentialPayload(), { project: teamProject }),
			saveCredential(randomCredentialPayload(), { user: member2 }),
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
				['credential:read', 'credential:update', 'credential:delete'].sort(),
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
				['credential:read', 'credential:update', 'credential:delete', 'credential:share'].sort(),
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
					'credential:read',
					'credential:update',
					'credential:delete',
					'credential:list',
					'credential:share',
				].sort(),
			);

			// Shared cred
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(
				[
					'credential:create',
					'credential:read',
					'credential:update',
					'credential:delete',
					'credential:list',
					'credential:share',
				].sort(),
			);
		}
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
			['credential:read', 'credential:update', 'credential:delete', 'credential:share'].sort(),
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

	test('does not create the credential in a specific project if the user does not have the right role to do so', async () => {
		//
		// ARRANGE
		//
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await projectService.addUser(project.id, member.id, 'project:viewer');

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
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
				'credential:read',
				'credential:update',
				'credential:delete',
				'credential:list',
				'credential:share',
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });
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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

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
			await saveCredential({ ...randomCredentialPayload(), name: tempName }, { user: owner });
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
			await saveCredential({ ...randomCredentialPayload(), name: tempName }, { user: owner });
		}
	});
});

describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

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
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

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
