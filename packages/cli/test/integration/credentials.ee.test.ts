import express from 'express';
import { UserSettings } from 'n8n-core';
import { In } from 'typeorm';

import { Db } from '../../src';
import { RESPONSE_ERROR_MESSAGES } from '../../src/constants';
import type { CredentialWithSharings } from '../../src/credentials/credentials.types';
import * as UserManagementHelpers from '../../src/UserManagement/UserManagementHelper';
import type { Role } from '../../src/databases/entities/Role';
import { randomCredentialPayload } from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent, SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils';
import type { IUser } from 'n8n-workflow';

jest.mock('../../src/telemetry');

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let credentialOwnerRole: Role;
let saveCredential: SaveCredentialFunction;
let authAgent: AuthAgent;
let sharingSpy: jest.SpyInstance<boolean>;

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

	sharingSpy = jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(true);
});

beforeEach(async () => {
	await testDb.truncate(['User', 'SharedCredentials', 'Credentials'], testDbName);
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
	sharingSpy.mockReturnValueOnce(false);

	const freeShareResponse = authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds: [member.id] });

	const freeGetResponse = authAgent(owner).get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: freeShareStatus }, { statusCode: freeGetStatus }] = await Promise.all([
		freeShareResponse,
		freeGetResponse,
	]);

	expect(freeShareStatus).toBe(404);
	expect(freeGetStatus).toBe(200);

	// EE router

	const eeShareResponse = authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds: [member.id] });

	const eeGetResponse = authAgent(owner).get(`/credentials/${savedCredential.id}`).send();

	const [{ statusCode: eeShareStatus }, { statusCode: eeGetStatus }] = await Promise.all([
		eeShareResponse,
		eeGetResponse,
	]);

	expect(eeShareStatus).toBe(200);
	expect(eeGetStatus).toBe(200);
});

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------

test('GET /credentials should return all creds for owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const [member1, member2, member3] = await testDb.createManyUsers(3, {
		globalRole: globalMemberRole,
	});

	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
	await saveCredential(randomCredentialPayload(), { user: member1 });

	const sharedWith = [member1, member2, member3];
	await testDb.shareCredentialWithUsers(savedCredential, sharedWith);

	const response = await authAgent(owner).get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(2); // owner retrieved owner cred and member cred

	const [ownerCredential, memberCredential] = response.body.data as CredentialWithSharings[];

	validateMainCredentialData(ownerCredential);
	expect(ownerCredential.data).toBeUndefined();

	validateMainCredentialData(memberCredential);
	expect(memberCredential.data).toBeUndefined();

	expect(ownerCredential.ownedBy).toMatchObject({
		id: owner.id,
		email: owner.email,
		firstName: owner.firstName,
		lastName: owner.lastName,
	});

	expect(Array.isArray(ownerCredential.sharedWith)).toBe(true);
	expect(ownerCredential.sharedWith).toHaveLength(3);

	// Fix order issue (MySQL might return items in any order)
	const ownerCredentialsSharedWithOrdered = [...ownerCredential.sharedWith!].sort(
		(a: IUser, b: IUser) => (a.email < b.email ? -1 : 1),
	);
	const orderedSharedWith = [...sharedWith].sort((a, b) => (a.email < b.email ? -1 : 1));

	ownerCredentialsSharedWithOrdered.forEach((sharee: IUser, idx: number) => {
		expect(sharee).toMatchObject({
			id: orderedSharedWith[idx].id,
			email: orderedSharedWith[idx].email,
			firstName: orderedSharedWith[idx].firstName,
			lastName: orderedSharedWith[idx].lastName,
		});
	});

	expect(memberCredential.ownedBy).toMatchObject({
		id: member1.id,
		email: member1.email,
		firstName: member1.firstName,
		lastName: member1.lastName,
	});

	expect(Array.isArray(memberCredential.sharedWith)).toBe(true);
	expect(memberCredential.sharedWith).toHaveLength(0);
});

test('GET /credentials should return only relevant creds for member', async () => {
	const [member1, member2] = await testDb.createManyUsers(2, {
		globalRole: globalMemberRole,
	});

	await saveCredential(randomCredentialPayload(), { user: member2 });
	const savedMemberCredential = await saveCredential(randomCredentialPayload(), { user: member1 });

	await testDb.shareCredentialWithUsers(savedMemberCredential, [member2]);

	const response = await authAgent(member1).get('/credentials');

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(1); // member retrieved only member cred

	const [member1Credential] = response.body.data;

	validateMainCredentialData(member1Credential);
	expect(member1Credential.data).toBeUndefined();

	expect(member1Credential.ownedBy).toMatchObject({
		id: member1.id,
		email: member1.email,
		firstName: member1.firstName,
		lastName: member1.lastName,
	});

	expect(Array.isArray(member1Credential.sharedWith)).toBe(true);
	expect(member1Credential.sharedWith).toHaveLength(1);

	const [sharee] = member1Credential.sharedWith;

	expect(sharee).toMatchObject({
		id: member2.id,
		email: member2.email,
		firstName: member2.firstName,
		lastName: member2.lastName,
	});
});

// ----------------------------------------
// GET /credentials/:id - fetch a certain credential
// ----------------------------------------

test('GET /credentials/:id should retrieve owned cred for owner', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const authOwnerAgent = authAgent(ownerShell);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

	expect(firstResponse.statusCode).toBe(200);

	const { data: firstCredential } = firstResponse.body;
	validateMainCredentialData(firstCredential);
	expect(firstCredential.data).toBeUndefined();
	expect(firstCredential.ownedBy).toMatchObject({
		id: ownerShell.id,
		email: ownerShell.email,
		firstName: ownerShell.firstName,
		lastName: ownerShell.lastName,
	});
	expect(firstCredential.sharedWith).toHaveLength(0);

	const secondResponse = await authOwnerAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(secondResponse.statusCode).toBe(200);

	const { data: secondCredential } = secondResponse.body;
	validateMainCredentialData(secondCredential);
	expect(secondCredential.data).toBeDefined();
});

test('GET /credentials/:id should retrieve non-owned cred for owner', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const authOwnerAgent = authAgent(owner);
	const [member1, member2] = await testDb.createManyUsers(2, {
		globalRole: globalMemberRole,
	});

	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
	await testDb.shareCredentialWithUsers(savedCredential, [member2]);

	const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

	expect(response1.statusCode).toBe(200);

	validateMainCredentialData(response1.body.data);
	expect(response1.body.data.data).toBeUndefined();
	expect(response1.body.data.ownedBy).toMatchObject({
		id: member1.id,
		email: member1.email,
		firstName: member1.firstName,
		lastName: member1.lastName,
	});
	expect(response1.body.data.sharedWith).toHaveLength(1);
	expect(response1.body.data.sharedWith[0]).toMatchObject({
		id: member2.id,
		email: member2.email,
		firstName: member2.firstName,
		lastName: member2.lastName,
	});

	const response2 = await authOwnerAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(response2.statusCode).toBe(200);

	validateMainCredentialData(response2.body.data);
	expect(response2.body.data.data).toBeUndefined();
	expect(response2.body.data.sharedWith).toHaveLength(1);
});

test('GET /credentials/:id should retrieve owned cred for member', async () => {
	const [member1, member2, member3] = await testDb.createManyUsers(3, {
		globalRole: globalMemberRole,
	});
	const authMemberAgent = authAgent(member1);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
	await testDb.shareCredentialWithUsers(savedCredential, [member2, member3]);

	const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

	expect(firstResponse.statusCode).toBe(200);

	const { data: firstCredential } = firstResponse.body;
	validateMainCredentialData(firstCredential);
	expect(firstCredential.data).toBeUndefined();
	expect(firstCredential.ownedBy).toMatchObject({
		id: member1.id,
		email: member1.email,
		firstName: member1.firstName,
		lastName: member1.lastName,
	});
	expect(firstCredential.sharedWith).toHaveLength(2);
	firstCredential.sharedWith.forEach((sharee: IUser, idx: number) => {
		expect([member2.id, member3.id]).toContain(sharee.id);
	});

	const secondResponse = await authMemberAgent
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(secondResponse.statusCode).toBe(200);

	const { data: secondCredential } = secondResponse.body;
	validateMainCredentialData(secondCredential);
	expect(secondCredential.data).toBeDefined();
	expect(firstCredential.sharedWith).toHaveLength(2);
});

test('GET /credentials/:id should not retrieve non-owned cred for member', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const response = await authAgent(member).get(`/credentials/${savedCredential.id}`);

	expect(response.statusCode).toBe(403);
	expect(response.body.data).toBeUndefined(); // owner's cred not returned
});

test('GET /credentials/:id should fail with missing encryption key', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: ownerShell });

	const mock = jest.spyOn(UserSettings, 'getEncryptionKey');
	mock.mockRejectedValue(new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY));

	const response = await authAgent(ownerShell)
		.get(`/credentials/${savedCredential.id}`)
		.query({ includeData: true });

	expect(response.statusCode).toBe(500);

	mock.mockRestore();
});

test('GET /credentials/:id should return 404 if cred not found', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).get('/credentials/789');
	expect(response.statusCode).toBe(404);

	const responseAbc = await authAgent(ownerShell).get('/credentials/abc');
	expect(responseAbc.statusCode).toBe(400);

	// because EE router has precedence, check if forwards this route
	const responseNew = await authAgent(ownerShell).get('/credentials/new');
	expect(responseNew.statusCode).toBe(200);
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
	const shareWithIds = [member1.id, member2.id, member3.id];

	await testDb.shareCredentialWithUsers(savedCredential, [member4, member5]);

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds });

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBeUndefined();

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		relations: ['role'],
		where: { credentials: savedCredential },
	});

	// check that sharings have been removed/added correctly
	expect(sharedCredentials.length).toBe(shareWithIds.length + 1); // +1 for the owner

	sharedCredentials.forEach((sharedCredential) => {
		if (sharedCredential.userId === owner.id) {
			expect(sharedCredential.role.name).toBe('owner');
			expect(sharedCredential.role.scope).toBe('credential');
			return;
		}
		expect(shareWithIds).toContain(sharedCredential.userId);
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
		.send({ shareWithIds: memberIds });

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
		.send({ shareWithIds: [member.id] });

	expect(response.statusCode).toBe(403);
});

test('PUT /credentials/:id/share should respond 403 for non-owned credentials', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const member = await testDb.createUser({ globalRole: globalMemberRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds: [member.id] });

	expect(response.statusCode).toBe(403);
});

test('PUT /credentials/:id/share should ignore pending sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const memberShell = await testDb.createUserShell(globalMemberRole);
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds: [memberShell.id] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials).toHaveLength(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});

test('PUT /credentials/:id/share should ignore non-existing sharee', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const response = await authAgent(owner)
		.put(`/credentials/${savedCredential.id}/share`)
		.send({ shareWithIds: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials).toHaveLength(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});

test('PUT /credentials/:id/share should respond 400 if invalid payload is provided', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });
	const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

	const responses = await Promise.all([
		authAgent(owner).put(`/credentials/${savedCredential.id}/share`).send(),
		authAgent(owner)
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [1] }),
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
		.send({ shareWithIds: [] });

	expect(response.statusCode).toBe(200);

	const sharedCredentials = await Db.collections.SharedCredentials.find({
		where: { credentials: savedCredential },
	});

	expect(sharedCredentials).toHaveLength(1);
	expect(sharedCredentials[0].userId).toBe(owner.id);
});

function validateMainCredentialData(credential: CredentialWithSharings) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(typeof credential.nodesAccess[0].nodeType).toBe('string');
	expect(credential.ownedBy).toBeDefined();
	expect(Array.isArray(credential.sharedWith)).toBe(true);
}
