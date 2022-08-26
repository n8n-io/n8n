import express from 'express';
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
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

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
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	const eeGetResponse = authAgent(owner).get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: eeShareStatus }, { statusCode: eeGetStatus }] = await Promise.all([
		eeShareResponse,
		eeGetResponse,
	]);

	expect(eeShareStatus).toBe(200);
	expect(eeGetStatus).toBe(200);
});

// ----------------------------------------
// share
// ----------------------------------------

test('POST /credentials/:id/share should share the credential', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['role'],
		where: { credentials: savedCredential, user: member },
	});

	expect(sharedCredential.role.name).toBe('user');
	expect(sharedCredential.role.scope).toBe('credential');
});

test('POST /credentials/:id/share should respond 403 for non-existing credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(owner)
		.post(`/credentials/1234567/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('POST /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authAgent(owner)
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('POST /credentials/:id/share should respond 400 for pending sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: memberShell.id });

	expect(response.statusCode).toBe(400);
});

test('POST /credentials/:id/share should respond 400 for non-existing sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: 'bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc' });

	expect(response.statusCode).toBe(400);
});

test('POST /credentials/:id/share should respond 400 if no sharee ID is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner).post(`/credentials/${savedCredential.id}/share`).send();

	expect(response.statusCode).toBe(400);
});

// ----------------------------------------
// unshare
// ----------------------------------------

test('DELETE /credentials/:id/share should unshare the credential', async () => {
	const ownerShell = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const response = await authAgent(ownerShell)
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	// check if the entry is removed from DB
	const sharedCredential = await Db.collections.SharedCredentials.findOne({
		where: { credentials: savedCredential, user: member },
	});
	expect(sharedCredential).toBeUndefined();

	// check if credential in DB is untouched
	const credential = await Db.collections.Credentials.findOneOrFail(savedCredential.id);
	expect(credential).toEqual(savedCredential);
});

test('DELETE /credentials/:id/share should respond 403 for non-existing credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });

	const response = await authAgent(owner)
		.delete(`/credentials/1234567/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('DELETE /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authAgent(owner)
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('DELETE /credentials/:id/share should be idempotent', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const unshare = await authAgent(owner)
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: memberShell.id });

	expect(unshare.statusCode).toBe(200);

	const unshareNonExistent = await authAgent(owner)
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: 'bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc' });

	expect(unshareNonExistent.statusCode).toBe(200);
});

test('DELETE /credentials/:id/share should respond 400 if no sharee id is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner).delete(`/credentials/${savedCredential.id}/share`).send();

	expect(response.statusCode).toBe(400);
});
