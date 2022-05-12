import express from 'express';
import { UserSettings } from 'n8n-core';
import { Db } from '../../../src';
import { randomName, randomString } from '../shared/random';
import * as utils from '../shared/utils';
import type { CredentialPayload, SaveCredentialFunction } from '../shared/types';
import type { Role } from '../../../src/databases/entities/Role';
import type { User } from '../../../src/databases/entities/User';
import * as testDb from '../shared/testDb';
import { RESPONSE_ERROR_MESSAGES } from '../../../src/constants';

jest.mock('../../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['publicApi'], applyAuth: false });
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

test('POST /credentials should create credentials', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});
	const payload = {
		name: 'test credential',
		type: 'github',
		data: {
			accessToken: 'abcdefghijklmnopqrstuvwxyz',
			user: 'test',
			server: 'testServer',
		},
	};

	const response = await authOwnerAgent.post('/credentials').send(payload);

	expect(response.statusCode).toBe(200);

	const { id, name, type } = response.body;

	expect(name).toBe(payload.name);
	expect(type).toBe(payload.type);

	const credential = await Db.collections.Credentials!.findOneOrFail(id);

	expect(credential.name).toBe(payload.name);
	expect(credential.type).toBe(payload.type);
	expect(credential.data).not.toBe(payload.data);

	const sharedCredential = await Db.collections.SharedCredentials!.findOneOrFail({
		relations: ['user', 'credentials'],
		where: { credentials: credential },
	});

	expect(sharedCredential.user.id).toBe(ownerShell.id);
	expect(sharedCredential.credentials.name).toBe(payload.name);
});

test('POST /credentials should fail with invalid inputs', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	await Promise.all(
		INVALID_PAYLOADS.map(async (invalidPayload) => {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode === 400 || response.statusCode === 415).toBe(true);
		}),
	);
});

test('POST /credentials should fail with missing encryption key', async () => {
	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const response = await authOwnerAgent.post('/credentials').send(credentialPayload());

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('POST /credentials should ignore ID in payload', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const firstResponse = await authOwnerAgent
		.post('/credentials')
		.send({ id: '8', ...credentialPayload() });

	expect(firstResponse.body.id).not.toBe('8');

	const secondResponse = await authOwnerAgent
		.post('/credentials')
		.send({ id: 8, ...credentialPayload() });

	expect(secondResponse.body.id).not.toBe(8);
});

test('DELETE /credentials/:id should delete owned cred for owner', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const savedCredential = await saveCredential(dbCredential(), { user: ownerShell });

	const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);

	const { name, type } = response.body;

	expect(name).toBe(savedCredential.name);
	expect(type).toBe(savedCredential.type);

	const deletedCredential = await Db.collections.Credentials!.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials!.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should delete non-owned cred for owner', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const savedCredential = await saveCredential(dbCredential(), { user: member });

	const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);

	const deletedCredential = await Db.collections.Credentials!.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials!.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should delete owned cred for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});

	const savedCredential = await saveCredential(dbCredential(), { user: member });

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);

	const { name, type } = response.body;

	expect(name).toBe(savedCredential.name);
	expect(type).toBe(savedCredential.type);

	const deletedCredential = await Db.collections.Credentials!.findOne(savedCredential.id);

	expect(deletedCredential).toBeUndefined(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials!.findOne();

	expect(deletedSharedCredential).toBeUndefined(); // deleted
});

test('DELETE /credentials/:id should not delete non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});
	const savedCredential = await saveCredential(dbCredential(), { user: ownerShell });

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials!.findOne(savedCredential.id);

	expect(shellCredential).toBeDefined(); // not deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials!.findOne();

	expect(deletedSharedCredential).toBeDefined(); // not deleted
});

test('DELETE /credentials/:id should fail if cred not found', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const response = await authOwnerAgent.delete('/credentials/123');

	expect(response.statusCode).toBe(404);
});

const credentialPayload = (): CredentialPayload => ({
	name: randomName(),
	type: randomName(),
	data: { accessToken: randomString(6, 16) },
});

const dbCredential = () => {
	const credential = credentialPayload();
	credential.nodesAccess = [{ nodeType: credential.type }];
	return credential;
};

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
