import express from 'express';
import { UserSettings } from 'n8n-core';
import { Db } from '../../src';
import { randomCredentialPayload, randomName, randomString } from './shared/random';
import * as utils from './shared/utils';
import type { CredentialPayload, SaveCredentialFunction } from './shared/types';
import type { Role } from '../../src/databases/entities/Role';
import type { User } from '../../src/databases/entities/User';
import * as testDb from './shared/testDb';
import { RESPONSE_ERROR_MESSAGES } from '../../src/constants';
import { CredentialsEntity } from '../../src/databases/entities/CredentialsEntity';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['credentials'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	utils.initConfigFile();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();
	const credentialOwnerRole = await testDb.getCredentialOwnerRole();
	saveCredential = affixRoleToSaveCredential(credentialOwnerRole);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('POST /credentials should create cred', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const payload = randomCredentialPayload();

	const response = await authOwnerAgent.post('/credentials').send(payload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(payload.name);
	expect(type).toBe(payload.type);
	expect(nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(payload.data);

	const credential = await Db.collections.Credentials.findOneOrFail(id);

	expect(credential.name).toBe(payload.name);
	expect(credential.type).toBe(payload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(payload.data);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.user.id).toBe(ownerShell.id);
	expect(sharedCredential.credentials.name).toBe(payload.name);
});

test('POST /credentials should fail with invalid inputs', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await Promise.all(
		INVALID_PAYLOADS.map(async (invalidPayload) => {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}),
	);
});

test('POST /credentials should fail with missing encryption key', async () => {
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.post('/credentials').send(randomCredentialPayload());

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('POST /credentials should ignore ID in payload', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const firstResponse = await authOwnerAgent
		.post('/credentials')
		.send({ id: '8', ...randomCredentialPayload() });

	expect(firstResponse.body.data.id).not.toBe('8');

	const secondResponse = await authOwnerAgent
		.post('/credentials')
		.send({ id: 8, ...randomCredentialPayload() });

	expect(secondResponse.body.data.id).not.toBe(8);
});

test('DELETE /credentials/:id should delete owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({ data: true });

	const deletedCredential = await Db.collections.Credentials.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should delete non-owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({ data: true });

	const deletedCredential = await Db.collections.Credentials.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should delete owned cred for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({ data: true });

	const deletedCredential = await Db.collections.Credentials.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should not delete non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials.findOne(savedCredential.id);

	expect(shellCredential).toBeDefined(); // not deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOne();

	expect(deletedSharedCredential).toBeDefined(); // not deleted
});

test('DELETE /credentials/:id should fail if cred not found', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.delete('/credentials/123');

	expect(response.statusCode).toBe(404);
});

test('PATCH /credentials/:id should update owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });
	const patchPayload = randomCredentialPayload();

	const response = await authOwnerAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(patchPayload.name);
	expect(type).toBe(patchPayload.type);
	expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(patchPayload.data);

	const credential = await Db.collections.Credentials.findOneOrFail(id);

	expect(credential.name).toBe(patchPayload.name);
	expect(credential.type).toBe(patchPayload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(patchPayload.data);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
});

test('PATCH /credentials/:id should update non-owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
	const patchPayload = randomCredentialPayload();

	const response = await authOwnerAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(patchPayload.name);
	expect(type).toBe(patchPayload.type);
	expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(patchPayload.data);

	const credential = await Db.collections.Credentials.findOneOrFail(id);

	expect(credential.name).toBe(patchPayload.name);
	expect(credential.type).toBe(patchPayload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(patchPayload.data);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
});

test('PATCH /credentials/:id should update owned cred for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
	const patchPayload = randomCredentialPayload();

	const response = await authMemberAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(patchPayload.name);
	expect(type).toBe(patchPayload.type);
	expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(patchPayload.data);

	const credential = await Db.collections.Credentials.findOneOrFail(id);

	expect(credential.name).toBe(patchPayload.name);
	expect(credential.type).toBe(patchPayload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(patchPayload.data);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
});

test('PATCH /credentials/:id should not update non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });
	const patchPayload = randomCredentialPayload();

	const response = await authMemberAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials.findOneOrFail(savedCredential.id);

	expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
});

test('PATCH /credentials/:id should fail with invalid inputs', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	await Promise.all(
		INVALID_PAYLOADS.map(async (invalidPayload) => {
			const response = await authOwnerAgent
				.patch(`/credentials/${savedCredential.id}`)
				.send(invalidPayload);

			expect(response.statusCode).toBe(400);
		}),
	);
});

test('PATCH /credentials/:id should fail if cred not found', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.patch('/credentials/123').send(randomCredentialPayload());

	expect(response.statusCode).toBe(404);
});

test('PATCH /credentials/:id should fail with missing encryption key', async () => {
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.post('/credentials').send(randomCredentialPayload());

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('GET /credentials should retrieve all creds for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	for (let i = 0; i < 3; i++) {
		await saveCredential(randomCredentialPayload(), { user: ownerShell });
	}

	const member = await testDb.createUser({ globalRole: globalMemberRole });

	await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authOwnerAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(4); // 3 owner + 1 member

	await Promise.all(
		response.body.data.map(async (credential: CredentialsEntity) => {
			const { name, type, nodesAccess, data: encryptedData } = credential;

			expect(typeof name).toBe('string');
			expect(typeof type).toBe('string');
			expect(typeof nodesAccess[0].nodeType).toBe('string');
			expect(encryptedData).toBeUndefined();
		}),
	);
});

test('GET /credentials should retrieve owned creds for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

	for (let i = 0; i < 3; i++) {
		await saveCredential(randomCredentialPayload(), { user: member });
	}

	const response = await authMemberAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(3);

	await Promise.all(
		response.body.data.map(async (credential: CredentialsEntity) => {
			const { name, type, nodesAccess, data: encryptedData } = credential;

			expect(typeof name).toBe('string');
			expect(typeof type).toBe('string');
			expect(typeof nodesAccess[0].nodeType).toBe('string');
			expect(encryptedData).toBeUndefined();
		}),
	);
});

test('GET /credentials should not retrieve non-owned creds for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });

	for (let i = 0; i < 3; i++) {
		await saveCredential(randomCredentialPayload(), { user: ownerShell });
	}

	const response = await authMemberAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(0); // owner's creds not returned
});

test('GET /credentials/:id should retrieve owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

	expect(firstResponse.statusCode).toBe(200);

	expect(typeof firstResponse.body.data.name).toBe('string');
	expect(typeof firstResponse.body.data.type).toBe('string');
	expect(typeof firstResponse.body.data.nodesAccess[0].nodeType).toBe('string');
	expect(firstResponse.body.data.data).toBeUndefined();

	const secondResponse = await authOwnerAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(secondResponse.statusCode).toBe(200);
	expect(typeof secondResponse.body.data.name).toBe('string');
	expect(typeof secondResponse.body.data.type).toBe('string');
	expect(typeof secondResponse.body.data.nodesAccess[0].nodeType).toBe('string');
	expect(secondResponse.body.data.data).toBeDefined();
});

test('GET /credentials/:id should retrieve owned cred for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

	expect(firstResponse.statusCode).toBe(200);

	expect(typeof firstResponse.body.data.name).toBe('string');
	expect(typeof firstResponse.body.data.type).toBe('string');
	expect(typeof firstResponse.body.data.nodesAccess[0].nodeType).toBe('string');
	expect(firstResponse.body.data.data).toBeUndefined();

	const secondResponse = await authMemberAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(secondResponse.statusCode).toBe(200);

	expect(typeof secondResponse.body.data.name).toBe('string');
	expect(typeof secondResponse.body.data.type).toBe('string');
	expect(typeof secondResponse.body.data.nodesAccess[0].nodeType).toBe('string');
	expect(secondResponse.body.data.data).toBeDefined();
});

test('GET /credentials/:id should not retrieve non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, { auth: true, user: member });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(404);
	expect(response.body.data).toBeUndefined(); // owner's cred not returned
});

test('GET /credentials/:id should fail with missing encryption key', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

	const response = await authOwnerAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('GET /credentials/:id should return 404 if cred not found', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authMemberAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authMemberAgent.get('/credentials/789');

	expect(response.statusCode).toBe(404);
});

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
	[],
	undefined,
];

function affixRoleToSaveCredential(role: Role) {
	return (credentialPayload: CredentialPayload, { user }: { user: User }) =>
		testDb.saveCredential(credentialPayload, { user, role });
}
