import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';
import { In } from 'typeorm';

import type { User } from '@db/entities/User';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import * as utils from '../shared/utils/';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createManyUsers, createUser, createUserShell } from '../shared/db/users';
import { UserManagementMailer } from '@/UserManagement/email';

import { mockInstance } from '../../shared/mocking';
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

	test('should ignore pending recipient', async () => {
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

	test('should ignore non-existing recipient', async () => {
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
