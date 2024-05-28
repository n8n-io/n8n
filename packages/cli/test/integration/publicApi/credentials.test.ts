import { Container } from 'typedi';

import type { User } from '@db/entities/User';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';

import { randomApiKey, randomName, randomString } from '../shared/random';
import * as utils from '../shared/utils/';
import type { CredentialPayload, SaveCredentialFunction } from '../shared/types';
import * as testDb from '../shared/testDb';
import { affixRoleToSaveCredential } from '../shared/db/credentials';
import { addApiKey, createUser, createUserShell } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

let saveCredential: SaveCredentialFunction;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await addApiKey(await createUserShell('global:owner'));
	member = await createUser({ role: 'global:member', apiKey: randomApiKey() });

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);

	saveCredential = affixRoleToSaveCredential('credential:owner');

	await utils.initCredentialsTypes();
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'Credentials']);
});

describe('POST /credentials', () => {
	test('should create credentials', async () => {
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

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.data).not.toBe(payload.data);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: { credentials: true },
			where: {
				credentialsId: credential.id,
				project: {
					type: 'personal',
					projectRelations: {
						userId: owner.id,
					},
				},
			},
		});

		expect(sharedCredential.role).toEqual('credential:owner');
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});

	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode === 400 || response.statusCode === 415).toBe(true);
		}
	});
});

describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);

		const { name, type } = response.body;

		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete non-owned cred for owner', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: member });

		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete owned cred for member', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: member });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);

		const { name, type } = response.body;

		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOneBy({});

		expect(deletedSharedCredential).toBeNull(); // deleted
	});

	test('should delete owned cred for member but leave others untouched', async () => {
		const anotherMember = await createUser({
			role: 'global:member',
			apiKey: randomApiKey(),
		});

		const savedCredential = await saveCredential(dbCredential(), { user: member });
		const notToBeChangedCredential = await saveCredential(dbCredential(), { user: member });
		const notToBeChangedCredential2 = await saveCredential(dbCredential(), {
			user: anotherMember,
		});

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);

		const { name, type } = response.body;

		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);

		const deletedCredential = await Container.get(CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});

		expect(deletedCredential).toBeNull(); // deleted

		const deletedSharedCredential = await Container.get(SharedCredentialsRepository).findOne({
			where: {
				credentialsId: savedCredential.id,
			},
		});

		expect(deletedSharedCredential).toBeNull(); // deleted

		await Promise.all(
			[notToBeChangedCredential, notToBeChangedCredential2].map(async (credential) => {
				const untouchedCredential = await Container.get(CredentialsRepository).findOneBy({
					id: credential.id,
				});

				expect(untouchedCredential).toEqual(credential); // not deleted

				const untouchedSharedCredential = await Container.get(SharedCredentialsRepository).findOne({
					where: {
						credentialsId: credential.id,
					},
				});

				expect(untouchedSharedCredential).toBeDefined(); // not deleted
			}),
		);
	});

	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);

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

describe('GET /credentials/schema/:credentialType', () => {
	test('should fail due to not found type', async () => {
		const response = await authOwnerAgent.get('/credentials/schema/testing');

		expect(response.statusCode).toBe(404);
	});

	test('should retrieve credential type', async () => {
		const response = await authOwnerAgent.get('/credentials/schema/ftp');

		const { additionalProperties, type, properties, required } = response.body;

		expect(additionalProperties).toBe(false);
		expect(type).toBe('object');
		expect(properties.host.type).toBe('string');
		expect(properties.port.type).toBe('number');
		expect(properties.username.type).toBe('string');
		expect(properties.password.type).toBe('string');
		expect(required).toEqual(expect.arrayContaining(['host', 'port']));
		expect(response.statusCode).toBe(200);
	});
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
	{},
	[],
	undefined,
];
