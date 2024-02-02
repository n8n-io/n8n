import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';

import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { License } from '@/License';

import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import * as utils from '../shared/utils/';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';

// mock that credentialsSharing is not enabled
jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['credentials'] });

let owner: User;
let member: User;
let secondMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	secondMember = await createUser({ role: 'global:member' });

	saveCredential = affixRoleToSaveCredential('credential:owner');

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(shellCredential).toBeDefined(); // not deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeDefined(); // not deleted
	});

	test('should not delete non-owned but shared cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });

		await shareCredentialWithUsers(savedCredential, [member]);

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(shellCredential).toBeDefined(); // not deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeDefined(); // not deleted
	});

	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.delete('/credentials/123');

		expect(response.statusCode).toBe(404);
	});
});
