import express from 'express';
import { In } from 'typeorm';

import config from '../../config';
import { Db } from '../../src';
import type { Role } from '../../src/databases/entities/Role';
import { randomCredentialPayload } from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent, SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let credentialOwnerRole: Role;
let saveCredential: SaveCredentialFunction;
let authAgent: AuthAgent;

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
	credentialOwnerRole = await testDb.getCredentialOwnerRole();

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);
	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials'], testDbName);
	config.set('experimental.credentialsSharing', true);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

// ----------------------------------------
// dynamic router switching
// ----------------------------------------

test('router should switch based on flag', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	// free router
	config.set('experimental.credentialsSharing', false);

	const freeShareResponse = authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: [member.id] });

	const freeGetResponse = authAgent(owner).get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: freeShareStatus }, { statusCode: freeGetStatus }] = await Promise.all([
		freeShareResponse,
		freeGetResponse,
	]);

	expect(freeShareStatus).toBe(404);
	expect(freeGetStatus).toBe(200);

	// EE router
	config.set('experimental.credentialsSharing', true);

	const eeShareResponse = authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: [member.id] });

	const eeGetResponse = authAgent(owner).get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: eeShareStatus }, { statusCode: eeGetStatus }] = await Promise.all([
		eeShareResponse,
		eeGetResponse,
	]);

	expect(eeShareStatus).toBe(200);
	expect(eeGetStatus).toBe(200);
});

// ----------------------------------------
// indempotent share/unshare
// ----------------------------------------

test('PUT /credentials/:id/share should share the credential with the provided userIds and unshare it for missing ones', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const [member1, member2, member3, member4, member5] = await testDb.createManyUsers(5, {
		globalRole: globalMemberRole,
	});
	const shareWith = [member1.id, member2.id, member3.id];

	await testDb.shareCredentialWithUsers(savedCredential, [member4, member5]);

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		relations: ['role'],
		where: { credentials: savedCredential },
	});

	// check that sharings have been removed/added correctly
	expect(sharedCredentials.length).toBe(shareWith.length + 1); // +1 for the owner

	sharedCredentials.forEach((sharedCredential) => {
		if (sharedCredential.userId === owner.id) {
			expect(sharedCredential.role.name).toBe('owner');
			expect(sharedCredential.role.scope).toBe('credential');
			return;
		}
		expect(shareWith).toContain(sharedCredential.userId);
		expect(sharedCredential.role.name).toBe('user');
		expect(sharedCredential.role.scope).toBe('credential');
	});
});

// ----------------------------------------
// share
// ----------------------------------------

test('PUT /credentials/:id/share should share the credential with the provided userIds', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const [member1, member2, member3] = await testDb.createManyUsers(3, {
		globalRole: globalMemberRole,
	});
	const memberIds = [member1.id, member2.id, member3.id];
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: memberIds });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	// check that sharings got correctly set in DB
	const sharedCredentials = await Db.collections.SharedCredentials.find({
		relations: ['role'],
		where: { credentials: savedCredential, user: { id: In([...memberIds]) } },
	});

	expect(sharedCredentials.length).toBe(memberIds.length);

	sharedCredentials.forEach((sharedCredential) => {
		expect(sharedCredential.role.name).toBe('user');
		expect(sharedCredential.role.scope).toBe('credential');
	});

	// check that owner still exists
	const ownerSharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['role'],
		where: { credentials: savedCredential, user: owner },
	});

	expect(ownerSharedCredential.role.name).toBe('owner');
	expect(ownerSharedCredential.role.scope).toBe('credential');
});

test('PUT /credentials/:id/share should respond 403 for non-existing credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(owner)
		.put(`/credentials/1234567/share`)
		.send({ shareWith: [member.id] });

	expect(response.statusCode).toBe(403);
});

test('PUT /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: [member.id] });

	expect(response.statusCode).toBe(403);
});

test('PUT /credentials/:id/share should ignore pending sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: [memberShell.id] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials.length).toBe(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});

test('PUT /credentials/:id/share should ignore non-existing sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials.length).toBe(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});

test('PUT /credentials/:id/share should respond 400 if invalid payload is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const responses = await Promise.all([
		authAgent(owner).put(`/credentials/${savedCredential.id}/share`).send(),
		authAgent(owner)
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWith: [1] }),
	]);

	responses.forEach((response) => expect(response.statusCode).toBe(400));
});

// ----------------------------------------
// unshare
// ----------------------------------------

test('PUT /credentials/:id/share should unshare the credential', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const [member1, member2] = await testDb.createManyUsers(2, {
		globalRole: globalMemberRole,
	});

	await testDb.shareCredentialWithUsers(savedCredential, [member1, member2]);

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWith: [] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials.length).toBe(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});
