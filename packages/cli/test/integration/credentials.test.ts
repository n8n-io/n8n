import { Container } from 'typedi';
import type { SuperAgentTest } from 'supertest';

import config from '@/config';
import type { ListQuery } from '@/requests';
import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { License } from '@/License';

import { randomCredentialPayload, randomName, randomString } from './shared/random';
import * as testDb from './shared/testDb';
import type { SaveCredentialFunction } from './shared/types';
import * as utils from './shared/utils/';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from './shared/db/credentials';
import { createManyUsers, createUser } from './shared/db/users';
import { Credentials } from 'n8n-core';

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

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [{ id: savedOwnerCredentialId }, { id: savedMemberCredentialId }] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: owner }),
			saveCredential(randomCredentialPayload(), { user: member }),
		]);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2); // owner retrieved owner cred and member cred

		const savedCredentialsIds = [savedOwnerCredentialId, savedMemberCredentialId];
		response.body.data.forEach((credential: ListQuery.Credentials.WithOwnedByAndSharedWith) => {
			validateMainCredentialData(credential);
			expect('data' in credential).toBe(false);
			expect(savedCredentialsIds).toContain(credential.id);
		});
	});

	test('should return only own creds for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: 'global:member',
		});

		const [savedCredential1] = await Promise.all([
			saveCredential(randomCredentialPayload(), { user: member1 }),
			saveCredential(randomCredentialPayload(), { user: member2 }),
		]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1); // member retrieved only own cred

		const [member1Credential] = response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();
		expect(member1Credential.id).toBe(savedCredential1.id);
	});
});

describe('POST /credentials', () => {
	test('should create cred', async () => {
		const payload = randomCredentialPayload();

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData } = response.body.data;

		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		expect(encryptedData).not.toBe(payload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.data).not.toBe(payload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['user', 'credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.user.id).toBe(owner.id);
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});

	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});

	test('should ignore ID in payload', async () => {
		const firstResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: '8', ...randomCredentialPayload() });

		expect(firstResponse.body.data.id).not.toBe('8');

		const secondResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: 8, ...randomCredentialPayload() });

		expect(secondResponse.body.data.id).not.toBe(8);
	});
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

describe('PATCH /credentials/:id', () => {
	test('should update owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should update non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);

		const credentialObject = new Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
		expect(credentialObject.getData()).toStrictEqual(patchPayload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.credentials.name).toBe(patchPayload.name); // updated
	});

	test('should update owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const patchPayload = randomCredentialPayload();

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData } = response.body.data;

		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);

		expect(encryptedData).not.toBe(patchPayload.data);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
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

	test('should update non-owned but shared cred for instance owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: secondMember });
		await shareCredentialWithUsers(savedCredential, [owner]);
		const patchPayload = randomCredentialPayload();

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);

		expect(response.statusCode).toBe(200);

		const shellCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(shellCredential.name).toBe(patchPayload.name); // updated
	});

	test('should fail with invalid inputs', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent
				.patch(`/credentials/${savedCredential.id}`)
				.send(invalidPayload);

			expect(response.statusCode).toBe(400);
		}
	});

	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.patch('/credentials/123').send(randomCredentialPayload());

		expect(response.statusCode).toBe(404);
	});
});

describe('GET /credentials/new', () => {
	test('should return default name for new credential or its increment', async () => {
		const name = config.getEnv('credentials.defaultName');
		let tempName = name;

		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);

			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await saveCredential({ ...randomCredentialPayload(), name: tempName }, { user: owner });
		}
	});

	test('should return name from query for new credential or its increment', async () => {
		const name = 'special credential name';
		let tempName = name;

		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);

			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await saveCredential({ ...randomCredentialPayload(), name: tempName }, { user: owner });
		}
	});
});

describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(response1.statusCode).toBe(200);

		validateMainCredentialData(response1.body.data);
		expect(response1.body.data.data).toBeUndefined();

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(response2.statusCode).toBe(200);

		validateMainCredentialData(response2.body.data);
		expect(response2.body.data.data).toBeDefined();
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(404);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
	});
});

function validateMainCredentialData(credential: ListQuery.Credentials.WithOwnedByAndSharedWith) {
	const { name, type, sharedWith, ownedBy } = credential;

	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');

	if (sharedWith) {
		expect(Array.isArray(sharedWith)).toBe(true);
	}

	if (ownedBy) {
		const { id, email, firstName, lastName } = ownedBy;

		expect(typeof id).toBe('string');
		expect(typeof email).toBe('string');
		expect(typeof firstName).toBe('string');
		expect(typeof lastName).toBe('string');
	}
}

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
	{},
	undefined,
];
