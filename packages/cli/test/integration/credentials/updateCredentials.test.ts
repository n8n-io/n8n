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
import { INVALID_PAYLOADS } from './shared';

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

describe('PATCH /credentials/:id', () => {
	test('should update owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);
		if (!patchPayload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should not update non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(404);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(credential.name).not.toBe(patchPayload.name);
		expect(credential.type).not.toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).not.toBe(patchPayload.name); // updated
	});

	test('should update owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, nodesAccess, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		if (!patchPayload.nodesAccess) {
			fail('Payload did not contain a nodesAccess array');
		}
		expect(nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.nodesAccess[0].nodeType).toBe(patchPayload.nodesAccess[0].nodeType);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should not update non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should not update non-owned but shared cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });
		await shareCredentialWithUsers(savedCredential, [member]);
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should not update non-owned but shared cred for instance owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });
		await shareCredentialWithUsers(savedCredential, [owner]);
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(404);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).not.toBe(patchPayload.name); // not updated
	});

	test('should fail with invalid inputs', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent
				.patch(`/credentials/${savedCredential.id}`)
				.send(invalidPayload);

			if (response.statusCode === 500) {
				console.log(response.statusCode, response.body);
			}
			expect(response.statusCode).toBe(400);
		}
	});

	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.patch('/credentials/123').send(randomCredentialPayload());

		expect(response.statusCode).toBe(404);
	});
});
