import type { Application } from 'express';
import type { SuperAgentTest } from 'supertest';
import { UserSettings } from 'n8n-core';

import * as Db from '@/Db';
import config from '@/config';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { randomCredentialPayload, randomName, randomString } from './shared/random';
import * as testDb from './shared/testDb';
import type { SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils';
import type { AuthAgent } from './shared/types';

// mock that credentialsSharing is not enabled
const mockIsCredentialsSharingEnabled = jest.spyOn(UserManagementHelpers, 'isSharingEnabled');
mockIsCredentialsSharingEnabled.mockReturnValue(false);

let app: Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['credentials'] });

	utils.initConfigFile();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();
	const credentialOwnerRole = await testDb.getCredentialOwnerRole();

	owner = await testDb.createUser({ globalRole: globalOwnerRole });
	member = await testDb.createUser({ globalRole: globalMemberRole });

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);

	authAgent = utils.createAuthAgent(app);
	authOwnerAgent = authAgent(owner);
	authMemberAgent = authAgent(member);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

afterAll(async () => {
	await testDb.terminate();
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
		response.body.data.forEach((credential: CredentialsEntity) => {
			validateMainCredentialData(credential);
			expect(credential.data).toBeUndefined();
			expect(savedCredentialsIds).toContain(credential.id);
		});
	});

	test('should return only own creds for member', async () => {
		const [member1, member2] = await testDb.createManyUsers(2, {
			globalRole: globalMemberRole,
		});

		const [savedCredential1] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: member1 }),
			saveCredential(randomCredentialPayload(), { user: member2 }),
		]);

		const response = await authAgent(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1); // member retrieved only own cred

		const [member1Credential] = response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();
		expect(member1Credential.id).toBe(savedCredential1.id);
	});
});

describe('POST /credentials', () => {
	test('should create cred', async () => {
		const payload = randomCredentialPayload();

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		if (!payload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
		expect(encryptedData).not.toBe(payload.data);

		const credential = await Db.collections.Credentials.findOneByOrFail({ id });

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(payload.nodesAccess![0].nodeType);
		expect(credential.data).not.toBe(payload.data);

		const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
			relations: ['user', 'credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.user.id).toBe(owner.id);
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});

	test('should fail with invalid inputs', async () => {
		await Promise.all(
			INVALID_PAYLOADS.map(async (invalidPayload) => {
				const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
				expect(response.statusCode).toBe(400);
			}),
		);
	});

	test('should fail with missing encryption key', async () => {
		const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
		mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

		const response = await authOwnerAgent.post('/credentials').send(randomCredentialPayload());

		expect(response.statusCode).toBe(500);

		mock.mockRestore();
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
});

describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Db.collections.Credentials.findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Db.collections.Credentials.findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Db.collections.Credentials.findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

		expect(shellCredential).toBeDefined(); // not deleted

		const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

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

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);
		if (!patchPayload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Db.collections.Credentials.findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess![0].nodeType);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
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

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		if (!patchPayload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Db.collections.Credentials.findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess![0].nodeType);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
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

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		if (!patchPayload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Db.collections.Credentials.findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess![0].nodeType);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
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

		expect(response.statusCode).toBe(404);

		const shellCredential = await Db.collections.Credentials.findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should fail with invalid inputs', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		await Promise.all(
			INVALID_PAYLOADS.map(async (invalidPayload) => {
				const response = await authOwnerAgent
					.patch(`/credentials/${savedCredential.id}`)
					.send(invalidPayload);

				if (response.statusCode === 500) {
					console.log(response.statusCode, response.body);
				}
				expect(response.statusCode).toBe(400);
			}),
		);
	});

	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.patch('/credentials/123').send(randomCredentialPayload());

		expect(response.statusCode).toBe(404);
	});

	test('should fail with missing encryption key', async () => {
		const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
		mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

		const response = await authOwnerAgent.post('/credentials').send(randomCredentialPayload());

		expect(response.statusCode).toBe(500);

		mock.mockRestore();
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

		expect(response.statusCode).toBe(404);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should fail with missing encryption key', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
		mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(response.statusCode).toBe(500);

		mock.mockRestore();
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
	});
});

function validateMainCredentialData(credential: CredentialsEntity) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(typeof credential.nodesAccess[0].nodeType).toBe('string');
	// @ts-ignore
	expect(credential.ownedBy).toBeUndefined();
	// @ts-ignore
	expect(credential.sharedWith).toBeUndefined();
}

const INVALID_PAYLOADS = [
	{
		type: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		type: randomName(),
		data: { accessToken: randomString(6, 16) },
	},
	{
		name: randomName(),
		type: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
	},
	{},
	undefined,
];
