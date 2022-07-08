import express from 'express';
import { UserSettings } from 'n8n-core';
import { Db } from '../../src';
import { randomName, randomString } from './shared/random';
import config from '../../config';
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
let credentialOwnerRole: Role;
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
	credentialOwnerRole = await testDb.getCredentialOwnerRole();
	saveCredential = affixRoleToSaveCredential(credentialOwnerRole);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials'], testDbName);
	config.set('deployment.paid', true);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

// ----------------------------------------
// dynamic router switching
// ----------------------------------------

test('dynamic router switching', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	// free router
	config.set('deployment.paid', false);

	const freeShareResponse = agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	const freeGetResponse = agent.get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: freeShareStatus }, { statusCode: freeGetStatus }] = await Promise.all([
		freeShareResponse,
		freeGetResponse,
	]);

	expect(freeShareStatus).toBe(404);
	expect(freeGetStatus).toBe(200);

	// EE router
	config.set('deployment.paid', true);

	const paidShareResponse = agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	const paidGetResponse = agent.get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: paidShareStatus }, { statusCode: paidGetStatus }] = await Promise.all([
		paidShareResponse,
		paidGetResponse,
	]);

	expect(paidShareStatus).toBe(200);
	expect(paidGetStatus).toBe(200);
});

// ----------------------------------------
// share
// ----------------------------------------

test('POST /credentials/:id/share should share the credential', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const response = await agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	const sharedCredential = await Db.collections.SharedCredentials.findOneOrFail({
		relations: ['role'],
		where: { credentials: savedCredential, user: member },
	});

	expect(sharedCredential.role.name).toBe('editor');
	expect(sharedCredential.role.scope).toBe('credential');
});

test('POST /credentials/:id/share should respond 403 for non-existing credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });

	const response = await agent.post(`/credentials/1234567/share`).send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('POST /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: member });

	const response = await agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('POST /credentials/:id/share should respond 400 for pending sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const response = await agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: memberShell.id });

	expect(response.statusCode).toBe(400);
});

test('POST /credentials/:id/share should respond 400 for non-existing sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const response = await agent
		.post(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: 'abc' });

	expect(response.statusCode).toBe(400);
});

test('POST /credentials/:id/share should respond 400 if no sharee ID is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const response = await agent.post(`/credentials/${savedCredential.id}/share`).send();

	expect(response.statusCode).toBe(400);
});

// ----------------------------------------
// unshare
// ----------------------------------------

test('DELETE /credentials/:id/share should unshare the credential', async () => {
	const ownerShell = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: ownerShell });
	const savedCredential = await saveCredential(credentialPayload(), { user: ownerShell });

	const response = await agent
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
	const agent = utils.createAgent(app, { auth: true, user: owner });

	const response = await agent.delete(`/credentials/1234567/share`).send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('DELETE /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: member });

	const response = await agent
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: member.id });

	expect(response.statusCode).toBe(403);
});

test('DELETE /credentials/:id/share should be idempotent', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const unshare = await agent
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: memberShell.id });

	expect(unshare.statusCode).toBe(200);

	const unshareNonExistent = await agent
		.delete(`/credentials/${savedCredential.id}/share`)
		.send({ shareeId: 'abc' });

	expect(unshareNonExistent.statusCode).toBe(200);
});

test('DELETE /credentials/:id/share should respond 400 if no sharee id is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const agent = utils.createAgent(app, { auth: true, user: owner });
	const savedCredential = await saveCredential(credentialPayload(), { user: owner });

	const response = await agent.delete(`/credentials/${savedCredential.id}/share`).send();

	expect(response.statusCode).toBe(400);
});

const credentialPayload = () => ({
	name: randomName(),
	type: randomName(),
	nodesAccess: [{ nodeType: randomName() }],
	data: { accessToken: randomString(6, 16) },
});

function affixRoleToSaveCredential(role: Role) {
	return (credentialPayload: CredentialPayload, { user }: { user: User }) =>
		testDb.saveCredential(credentialPayload, { user, role });
}
