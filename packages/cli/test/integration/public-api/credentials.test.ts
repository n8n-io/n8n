import type { CredentialPayload } from '@n8n/backend-test-utils';
import { createTeamProject, randomName, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';

import {
	affixRoleToSaveCredential,
	createCredentials,
	getCredentialSharings,
} from '../shared/db/credentials';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SaveCredentialFunction, SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

let saveCredential: SaveCredentialFunction;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);

	saveCredential = affixRoleToSaveCredential('credential:owner');

	await utils.initCredentialsTypes();
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
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
		const anotherMember = await createMemberWithApiKey();

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

describe('PUT /credentials/:id/transfer', () => {
	test('should transfer credential to project', async () => {
		/**
		 * Arrange
		 */
		const [firstProject, secondProject] = await Promise.all([
			createTeamProject('first-project', owner),
			createTeamProject('second-project', owner),
		]);

		const credentials = await createCredentials(
			{ name: 'Test', type: 'test', data: '' },
			firstProject,
		);

		/**
		 * Act
		 */
		const response = await authOwnerAgent.put(`/credentials/${credentials.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});

		/**
		 * Assert
		 */
		expect(response.statusCode).toBe(204);
	});

	test('should transfer the right credential, not the first one it finds', async () => {
		// ARRANGE
		const [firstProject, secondProject] = await Promise.all([
			createTeamProject('first-project', owner),
			createTeamProject('second-project', owner),
		]);

		const [firstCredential, secondCredential] = await Promise.all([
			createCredentials({ name: 'Test', type: 'test', data: '' }, firstProject),
			createCredentials({ name: 'Test', type: 'test', data: '' }, firstProject),
		]);

		// ACT
		const response = await authOwnerAgent.put(`/credentials/${secondCredential.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});

		// ASSERT
		expect(response.statusCode).toBe(204);

		{
			// second credential was moved
			const sharings = await getCredentialSharings(secondCredential);
			expect(sharings).toHaveLength(1);
			expect(sharings[0]).toMatchObject({ projectId: secondProject.id });
		}

		{
			// first credential was untouched
			const sharings = await getCredentialSharings(firstCredential);
			expect(sharings).toHaveLength(1);
			expect(sharings[0]).toMatchObject({ projectId: firstProject.id });
		}
	});

	test('if no destination project, should reject', async () => {
		/**
		 * Arrange
		 */
		const project = await createTeamProject('first-project', member);
		const credentials = await createCredentials({ name: 'Test', type: 'test', data: '' }, project);

		/**
		 * Act
		 */
		const response = await authOwnerAgent.put(`/credentials/${credentials.id}/transfer`).send({});

		/**
		 * Assert
		 */
		expect(response.statusCode).toBe(400);
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
