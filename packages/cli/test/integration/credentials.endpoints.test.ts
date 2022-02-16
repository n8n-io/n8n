import express = require('express');
import { getConnection } from 'typeorm';

import { Db } from '../../src';
import { Role } from '../../src/databases/entities/Role';
import { randomName, randomString } from './shared/random';
import * as utils from './shared/utils';
import { getCredentialOwnerRole, getGlobalOwnerRole } from './shared/utils';

let app: express.Application;
let credentialOwnerRole: Role;
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({
		namespaces: ['credentials'],
		applyAuth: true,
		externalHooks: true,
	});
	await utils.initTestDb();
	credentialOwnerRole = await getCredentialOwnerRole();
	globalOwnerRole = await getGlobalOwnerRole();
});

beforeEach(async () => {
	await utils.createOwnerShell();
});

afterEach(async () => {
	await utils.truncate(['User', 'Credentials']);
});

afterAll(() => {
	return getConnection().close();
});

test('POST /credentials should create cred', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const payload = credentialPayload();

	const response = await authShellAgent.post('/credentials').send(payload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: hashedData } = response.body.data;

	expect(name).toBe(payload.name);
	expect(type).toBe(payload.type);
	expect(nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
	expect(hashedData).not.toBe(payload.data);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.name).toBe(payload.name);
	expect(credential.type).toBe(payload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(payload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(payload.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.user.id).toBe(shell.id);
	expect(sharedCredential.credentials.name).toBe(payload.name);
});

test('POST /credentials should fail with invalid inputs', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	for (const invalidPayload of INVALID_PAYLOADS) {
		const response = await authShellAgent.post('/credentials').send(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

test('POST /credentials should fail with missing encryption key', async () => {
	const { UserSettings } = require('n8n-core');
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockReturnValue(undefined);

	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.post('/credentials').send(credentialPayload());

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('POST /credentials should ignore ID in payload', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const firstResponse = await authShellAgent
		.post('/credentials')
		.send({ id: '8', ...credentialPayload() });

	expect(firstResponse.body.data.id).not.toBe('8');

	const secondResponse = await authShellAgent
		.post('/credentials')
		.send({ id: 8, ...credentialPayload() });

	expect(secondResponse.body.data.id).not.toBe(8);
});

test('DELETE /credentials/:id should delete cred for owner', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const response = await authShellAgent.delete(`/credentials/${savedCredential.id}`);
	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({ data: true });

	const deletedCredential = await Db.collections.Credentials!.findOne(savedCredential.id);
	expect(deletedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should delete cred for owning member', async () => {
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: member,
		role: credentialOwnerRole,
	});

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
	expect(response.statusCode).toBe(200);
	expect(response.body).toEqual({ data: true });

	const deletedCredential = await Db.collections.Credentials!.findOne(savedCredential.id);
	expect(deletedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should fail for non-owning member', async () => {
	const shell = await Db.collections.User!.findOneOrFail();

	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials!.findOne(savedCredential.id);
	expect(shellCredential).toBeDefined(); // not deleted
});

test('DELETE /credentials/:id should fail if no cred found', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.delete('/credentials/123');
	expect(response.statusCode).toBe(404);
});

test('PATCH /credentials/:id should update cred for owner', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const patchPayload = credentialPayload();

	const response = await authShellAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(patchPayload.name);
	expect(type).toBe(patchPayload.type);
	expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(patchPayload.data);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.name).toBe(patchPayload.name);
	expect(credential.type).toBe(patchPayload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(patchPayload.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.credentials.name).toBe(patchPayload.name);
});

test('PATCH /credentials/:id should update cred for owning member', async () => {
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: member,
		role: credentialOwnerRole,
	});

	const patchPayload = credentialPayload();

	const response = await authMemberAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

	expect(name).toBe(patchPayload.name);
	expect(type).toBe(patchPayload.type);
	expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(encryptedData).not.toBe(patchPayload.data);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.name).toBe(patchPayload.name);
	expect(credential.type).toBe(patchPayload.type);
	expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(patchPayload.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.credentials.name).toBe(patchPayload.name);
});

test('PATCH /credentials/:id should fail for non-owning member', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const patchPayload = credentialPayload();

	const response = await authMemberAgent
		.patch(`/credentials/${savedCredential.id}`)
		.send(patchPayload);
	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials!.findOneOrFail(savedCredential.id);
	expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
});

test('PATCH /credentials/:id should fail with invalid inputs', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	for (const invalidPayload of INVALID_PAYLOADS) {
		const response = await authShellAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(invalidPayload);
		expect(response.statusCode).toBe(400);
	}
});

test('PATCH /credentials/:id should fail if cred not found', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.patch('/credentials/123').send(credentialPayload());
	expect(response.statusCode).toBe(404);
});

test('PATCH /credentials/:id should fail with missing encryption key', async () => {
	const { UserSettings } = require('n8n-core');
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockReturnValue(undefined);

	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const response = await authShellAgent.post('/credentials').send(credentialPayload());

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('GET /credentials should retrieve all creds for owner', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	for (let i = 0; i < 3; i++) {
		await utils.saveCredential(credentialPayload(), {
			user: shell,
			role: credentialOwnerRole,
		});
	}

	const response = await authShellAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(3);

	for (const credential of response.body.data) {
		const { name, type, nodesAccess, data: encryptedData } = credential;
		expect(typeof name).toBe('string');
		expect(typeof type).toBe('string');
		expect(typeof nodesAccess[0].nodeType).toBe('string');
		expect(encryptedData).toBeUndefined();
	}
});

test('GET /credentials should retrieve owned creds for member', async () => {
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	for (let i = 0; i < 3; i++) {
		await utils.saveCredential(credentialPayload(), {
			user: member,
			role: credentialOwnerRole,
		});
	}

	const response = await authMemberAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(3);

	for (const credential of response.body.data) {
		const { name, type, nodesAccess, data: encryptedData } = credential;
		expect(typeof name).toBe('string');
		expect(typeof type).toBe('string');
		expect(typeof nodesAccess[0].nodeType).toBe('string');
		expect(encryptedData).toBeUndefined();
	}
});

test('GET /credentials should not retrieve non-owned creds for member', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	for (let i = 0; i < 3; i++) {
		await utils.saveCredential(credentialPayload(), {
			user: shell,
			role: credentialOwnerRole,
		});
	}

	const response = await authMemberAgent.get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(0); // shell's creds not returned
});

test('GET /credentials/:id should retrieve owned creds for owner', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authOwnerAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

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

test('GET /credentials/:id should retrieve owned creds for owner', async () => {
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: member,
		role: credentialOwnerRole,
	});

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

test('GET /credentials/:id should not retrieve non-owned creds for member', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const member = await utils.createUser();
	const authMemberAgent = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toEqual({}); // shell's cred not returned
});

test('GET /credentials/:id should fail with missing encryption key', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(credentialPayload(), {
		user: shell,
		role: credentialOwnerRole,
	});

	const { UserSettings } = require('n8n-core');
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockReturnValue(undefined);

	const response = await authShellAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

const credentialPayload = () => ({
	name: randomName(),
	type: randomName(),
	nodesAccess: [{ nodeType: randomName() }],
	data: { accessToken: randomString(5, 15) },
});

const INVALID_PAYLOADS = [
	{
		type: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(5, 15) },
	},
	{
		name: randomName(),
		nodesAccess: [{ nodeType: randomName() }],
		data: { accessToken: randomString(5, 15) },
	},
	{
		name: randomName(),
		type: randomName(),
		data: { accessToken: randomString(5, 15) },
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
