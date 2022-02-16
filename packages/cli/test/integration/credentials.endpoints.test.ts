import express = require('express');
import { getConnection } from 'typeorm';
import { Credentials } from '../../../core/dist/src';

import { Db } from '../../src';
import { CredentialsEntity } from '../../src/databases/entities/CredentialsEntity';
import { Role } from '../../src/databases/entities/Role';
import { SharedCredentials } from '../../src/databases/entities/SharedCredentials';
import { randomName, randomString } from './shared/random';
import * as utils from './shared/utils';
import { getCredentialOwnerRole } from './shared/utils';

let app: express.Application;
let credentialOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({
		namespaces: ['credentials'],
		applyAuth: true,
		externalHooks: true,
	});
	await utils.initTestDb();
	credentialOwnerRole = await getCredentialOwnerRole();
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

	const response = await authShellAgent.post('/credentials').send(CREATE_CRED_PAYLOAD);

	expect(response.statusCode).toBe(200);

	const { id, name, type, nodesAccess, data: hashedData } = response.body.data;

	expect(id).toBe('1');
	expect(name).toBe(CREATE_CRED_PAYLOAD.name);
	expect(type).toBe(CREATE_CRED_PAYLOAD.type);
	expect(nodesAccess[0].nodeType).toBe(CREATE_CRED_PAYLOAD.nodesAccess[0].nodeType);
	expect(hashedData).not.toBe(CREATE_CRED_PAYLOAD.data);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.id).toBe(1);
	expect(credential.name).toBe(CREATE_CRED_PAYLOAD.name);
	expect(credential.type).toBe(CREATE_CRED_PAYLOAD.type);
	expect(credential.nodesAccess[0].nodeType).toBe(CREATE_CRED_PAYLOAD.nodesAccess[0].nodeType);
	expect(credential.data).not.toBe(CREATE_CRED_PAYLOAD.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.user.id).toBe(shell.id);
	expect(sharedCredential.credentials.name).toBe(CREATE_CRED_PAYLOAD.name);
});

test('POST /credentials should fail with invalid inputs', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const invalidPayloads = [
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

	for (const invalidPayload of invalidPayloads) {
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

	const response = await authShellAgent.post('/credentials').send(CREATE_CRED_PAYLOAD);

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('POST /credentials should ignore ID in payload', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const firstResponse = await authShellAgent
		.post('/credentials')
		.send({ id: '8', ...CREATE_CRED_PAYLOAD });

	expect(firstResponse.body.data.id).not.toBe('8');

	const secondResponse = await authShellAgent
		.post('/credentials')
		.send({ id: 8, ...CREATE_CRED_PAYLOAD });

	expect(secondResponse.body.data.id).not.toBe(8);
});

test('DELETE /credentials/:id should delete cred for owner', async () => {
	const shell = await Db.collections.User!.findOneOrFail();
	const authShellAgent = await utils.createAgent(app, { auth: true, user: shell });

	const savedCredential = await utils.saveCredential(CREATE_CRED_PAYLOAD, {
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

	const savedCredential = await utils.saveCredential(CREATE_CRED_PAYLOAD, {
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
	const authMemberAgenet = await utils.createAgent(app, { auth: true, user: member });

	const savedCredential = await utils.saveCredential(CREATE_CRED_PAYLOAD, {
		user: shell,
		role: credentialOwnerRole,
	});

	const response = await authMemberAgenet.delete(`/credentials/${savedCredential.id}`);
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

// PATCH /credentials/:id should update cred for owner
// PATCH /credentials/:id should update cred for owning member
// PATCH /credentials/:id should fail for non-owning member
// PATCH /credentials/:id should fail with invalid inputs
// PATCH /credentials/:id should fail if credential not found
// PATCH /credentials/:id should fail with missing encryption key

// GET /credentials/:id should retrieve all creds for owner + includeData
// GET /credentials/:id should retrieve all creds owning member + includeData
// GET /credentials/:id should return empty for non-owning member
// GET /credentials/:id should fail with missing encryption key

// GET /credentials should retrieve cred for owner + includeData
// GET /credentials should retrieve cred for member + includeData
// GET /credentials should not return non-owned creds for member
// GET /credentials should fail with missing encryption keya

const CREATE_CRED_PAYLOAD = {
	name: randomName(),
	type: randomName(),
	nodesAccess: [{ nodeType: randomName() }],
	data: { accessToken: randomString(5, 15) },
};
