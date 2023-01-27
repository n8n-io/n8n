import express from 'express';

import { UserSettings } from 'n8n-core';

import * as Db from '@/Db';
import type { Role } from '@db/entities/Role';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { randomApiKey, randomName, randomString } from '../shared/random';
import * as utils from '../shared/utils';
import type { CredentialPayload, SaveCredentialFunction } from '../shared/types';
import * as testDb from '../shared/testDb';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let credentialOwnerRole: Role;

let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['publicApi'],
		applyAuth: false,
		enablePublicAPI: true,
	});
	await testDb.init();

	utils.initConfigFile();

	const [fetchedGlobalOwnerRole, fetchedGlobalMemberRole, _, fetchedCredentialOwnerRole] =
		await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;
	credentialOwnerRole = fetchedCredentialOwnerRole;

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);

	utils.initTestLogger();
	utils.initTestTelemetry();
	utils.initCredentialsTypes();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials']);
});

afterAll(async () => {
	await testDb.terminate();
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
		type: 'githubApi',
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

	const credential = await Db.collections.Credentials.findOneByOrFail({ id });

	expect(credential.name).toBe(payload.name);
	expect(credential.type).toBe(payload.type);
	expect(credential.data).not.toBe(payload.data);

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['user', 'credentials', 'role'],
		where: { credentialsId: credential.id, userId: ownerShell.id },
	});

	expect(sharedCredential.role).toEqual(credentialOwnerRole);
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

	const deletedCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

	expect(deletedCredential).toBeNull(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

	expect(deletedSharedCredential).toBeNull(); // deleted
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

	const deletedCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

	expect(deletedCredential).toBeNull(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

	expect(deletedSharedCredential).toBeNull(); // deleted
});

test('DELETE /credentials/:id should delete owned cred for member', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

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

	const deletedCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

	expect(deletedCredential).toBeNull(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

	expect(deletedSharedCredential).toBeNull(); // deleted
});

test('DELETE /credentials/:id should delete owned cred for member but leave others untouched', async () => {
	const member1 = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });
	const member2 = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const savedCredential = await saveCredential(dbCredential(), { user: member1 });
	const notToBeChangedCredential = await saveCredential(dbCredential(), { user: member1 });
	const notToBeChangedCredential2 = await saveCredential(dbCredential(), { user: member2 });

	const authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member1,
	});

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(200);

	const { name, type } = response.body;

	expect(name).toBe(savedCredential.name);
	expect(type).toBe(savedCredential.type);

	const deletedCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

	expect(deletedCredential).toBeNull(); // deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOne({
		where: {
			credentialsId: savedCredential.id,
		},
	});

	expect(deletedSharedCredential).toBeNull(); // deleted

	await Promise.all(
		[notToBeChangedCredential, notToBeChangedCredential2].map(async (credential) => {
			const untouchedCredential = await Db.collections.Credentials.findOneBy({ id: credential.id });

			expect(untouchedCredential).toEqual(credential); // not deleted

			const untouchedSharedCredential = await Db.collections.SharedCredentials.findOne({
				where: {
					credentialsId: credential.id,
				},
			});

			expect(untouchedSharedCredential).toBeDefined(); // not deleted
		}),
	);
});

test('DELETE /credentials/:id should not delete non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authMemberAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: member,
	});
	const savedCredential = await saveCredential(dbCredential(), { user: ownerShell });

	const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(404);

	const shellCredential = await Db.collections.Credentials.findOneBy({ id: savedCredential.id });

	expect(shellCredential).toBeDefined(); // not deleted

	const deletedSharedCredential = await Db.collections.SharedCredentials.findOneBy({});

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

test('GET /credentials/schema/:credentialType should fail due to not found type', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const response = await authOwnerAgent.get('/credentials/schema/testing');

	expect(response.statusCode).toBe(404);
});

test('GET /credentials/schema/:credentialType should retrieve credential type', async () => {
	let ownerShell = await testDb.createUserShell(globalOwnerRole);
	ownerShell = await testDb.addApiKey(ownerShell);

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		version: 1,
		auth: true,
		user: ownerShell,
	});

	const response = await authOwnerAgent.get('/credentials/schema/githubApi');

	const { additionalProperties, type, properties, required } = response.body;

	expect(additionalProperties).toBe(false);
	expect(type).toBe('object');
	expect(properties.server).toBeDefined();
	expect(properties.server.type).toBe('string');
	expect(properties.user.type).toBeDefined();
	expect(properties.user.type).toBe('string');
	expect(properties.accessToken.type).toBeDefined();
	expect(properties.accessToken.type).toBe('string');
	expect(required).toEqual(expect.arrayContaining(['server', 'user', 'accessToken']));
	expect(response.statusCode).toBe(200);
});

const credentialPayload = (): CredentialPayload => ({
	name: randomName(),
	type: 'githubApi',
	data: {
		accessToken: randomString(6, 16),
		server: randomString(1, 10),
		user: randomString(1, 10),
	},
});

const dbCredential = () => {
	const credential = credentialPayload();
	credential.nodesAccess = [{ nodeType: credential.type }];

	return credential;
};

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
	{
		name: randomName(),
		type: 'githubApi',
		data: {
			server: randomName(),
		},
	},
	{},
	[],
	undefined,
];
