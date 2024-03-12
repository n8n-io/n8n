import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';
import { In } from '@n8n/typeorm';
import type { IUser } from 'n8n-workflow';

import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';

import { randomCredentialPayload } from './shared/random';
import * as testDb from './shared/testDb';
import type { SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils/';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from './shared/db/credentials';
import { createManyUsers, createUser, createUserShell } from './shared/db/users';
import { UserManagementMailer } from '@/UserManagement/email';

import { mockInstance } from '../shared/mocking';
import config from '@/config';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing'],
});

let owner: User;
let member: User;
let anotherMember: User;
let authOwnerAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;
const mailer = mockInstance(UserManagementMailer);

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	anotherMember = await createUser({ role: 'global:member' });

	authOwnerAgent = testServer.authAgentFor(owner);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = affixRoleToSaveCredential('credential:owner');
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

afterEach(() => {
	jest.clearAllMocks();
});

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		await saveCredential(randomCredentialPayload(), { user: member1 });

		const sharedWith = [member1, member2, member3];
		await shareCredentialWithUsers(savedCredential, sharedWith);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2); // owner retrieved owner cred and member cred
		const ownerCredential = response.body.data.find(
			(e: ListQuery.Credentials.WithOwnedByAndSharedWith) => e.ownedBy?.id === owner.id,
		);
		const memberCredential = response.body.data.find(
			(e: ListQuery.Credentials.WithOwnedByAndSharedWith) => e.ownedBy?.id === member1.id,
		);

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

	test('should return only relevant creds for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await saveCredential(randomCredentialPayload(), { user: member2 });
		const savedMemberCredential = await saveCredential(randomCredentialPayload(), {
			user: member1,
		});

		await shareCredentialWithUsers(savedMemberCredential, [member2]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

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
});

// ----------------------------------------
// GET /credentials/:id - fetch a certain credential
// ----------------------------------------
describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		const { data: firstCredential } = firstResponse.body;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();
		expect(firstCredential.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
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

	test('should retrieve non-owned cred for owner', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2]);

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
		expect(response2.body.data.data).toBeDefined(); // Instance owners should be capable of editing all credentials
		expect(response2.body.data.sharedWith).toHaveLength(1);
	});

	test('should retrieve owned cred for member', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const authMemberAgent = testServer.authAgentFor(member1);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2, member3]);

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

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);

		// because EE router has precedence, check if forwards this route
		const responseNew = await authOwnerAgent.get('/credentials/new');
		expect(responseNew.statusCode).toBe(200);
	});
});

// ----------------------------------------
// idempotent share/unshare
// ----------------------------------------
describe('PUT /credentials/:id/share', () => {
	test('should share the credential with the provided userIds and unshare it for missing ones', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2, member3, member4, member5] = await createManyUsers(5, {
			role: 'global:member',
		});
		const shareWithIds = [member1.id, member2.id, member3.id];

		await shareCredentialWithUsers(savedCredential, [member4, member5]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		// check that sharings have been removed/added correctly
		expect(sharedCredentials.length).toBe(shareWithIds.length + 1); // +1 for the owner

		sharedCredentials.forEach((sharedCredential) => {
			if (sharedCredential.userId === owner.id) {
				expect(sharedCredential.role).toBe('credential:owner');
				return;
			}
			expect(shareWithIds).toContain(sharedCredential.userId);
			expect(sharedCredential.role).toBe('credential:user');
		});

		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should share the credential with the provided userIds', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: 'global:member',
		});
		const memberIds = [member1.id, member2.id, member3.id];
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: memberIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		// check that sharings got correctly set in DB
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id, userId: In([...memberIds]) },
		});

		expect(sharedCredentials.length).toBe(memberIds.length);

		sharedCredentials.forEach((sharedCredential) => {
			expect(sharedCredential.role).toBe('credential:user');
		});

		// check that owner still exists
		const ownerSharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			where: { credentialsId: savedCredential.id, userId: owner.id },
		});

		expect(ownerSharedCredential.role).toBe('credential:owner');
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should respond 403 for non-existing credentials', async () => {
		const response = await authOwnerAgent
			.put('/credentials/1234567/share')
			.send({ shareWithIds: [member.id] });

		expect(response.statusCode).toBe(403);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for shared members', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [owner.id] });

		expect(response.statusCode).toBe(403);
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing with self', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMember.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const tempUser = await createUser({ role: 'global:member' });

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [tempUser.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 200 for non-owned credentials for owners', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMember.id] });

		expect(response.statusCode).toBe(200);
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should ignore pending sharee', async () => {
		const memberShell = await createUserShell('global:member');
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberShell.id] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].userId).toBe(owner.id);
	});

	test('should ignore non-existing sharee', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].userId).toBe(owner.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should respond 400 if invalid payload is provided', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const responses = await Promise.all([
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send(),
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send({ shareWithIds: [1] }),
		]);

		responses.forEach((response) => expect(response.statusCode).toBe(400));
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should unshare the credential', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].userId).toBe(owner.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should not call internal hooks listener for email sent if emailing is disabled', async () => {
		config.set('userManagement.emails.mode', '');

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		config.set('userManagement.emails.mode', 'smtp');
	});
});

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(typeof credential.nodesAccess[0].nodeType).toBe('string');
	expect(credential.ownedBy).toBeDefined();
	expect(Array.isArray(credential.sharedWith)).toBe(true);
}
