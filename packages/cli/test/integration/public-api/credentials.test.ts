import { LicenseState } from '@n8n/backend-common';
import type { CredentialPayload } from '@n8n/backend-test-utils';
import { createTeamProject, randomName, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { randomString } from 'n8n-workflow';

import { CREDENTIAL_BLANKING_VALUE } from '@/constants';
import { CredentialsService } from '@/credentials/credentials.service';

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

/**
 * Helper function to fetch and decrypt credential data
 */
async function getDecryptedCredentialData(
	credentialId: string,
): Promise<ICredentialDataDecryptedObject> {
	const credential = await Container.get(CredentialsRepository).findOneByOrFail({
		id: credentialId,
	});
	const credentialsService = Container.get(CredentialsService);
	return credentialsService.decrypt(credential, true);
}

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

	test('should create credential with isResolvable set to true', async () => {
		const payload = {
			name: 'test credential',
			type: 'githubApi',
			data: {
				accessToken: 'abcdefghijklmnopqrstuvwxyz',
				user: 'test',
				server: 'testServer',
			},
			isResolvable: true,
		};

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);
		const { id, isResolvable } = response.body;

		expect(isResolvable).toBe(true);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });
		expect(credential.isResolvable).toBe(true);
	});

	test('should create credential with isResolvable set to false', async () => {
		const payload = {
			name: 'test credential',
			type: 'githubApi',
			data: {
				accessToken: 'abcdefghijklmnopqrstuvwxyz',
				user: 'test',
				server: 'testServer',
			},
			isResolvable: false,
		};

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);
		const { id, isResolvable } = response.body;

		expect(isResolvable).toBe(false);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });
		expect(credential.isResolvable).toBe(false);
	});

	test('should default isResolvable to false when not provided', async () => {
		const payload = {
			name: 'test credential',
			type: 'githubApi',
			data: {
				accessToken: 'abcdefghijklmnopqrstuvwxyz',
				user: 'test',
				server: 'testServer',
			},
			// isResolvable not provided
		};

		const response = await authOwnerAgent.post('/credentials').send(payload);

		expect(response.statusCode).toBe(200);
		const { id, isResolvable } = response.body;

		expect(isResolvable).toBe(false);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });
		expect(credential.isResolvable).toBe(false);
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

describe('PATCH /credentials/:id', () => {
	test('should update owned credential for owner', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			name: 'Updated Credential Name',
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type } = response.body;

		expect(id).toBe(savedCredential.id);
		expect(name).toBe(updatePayload.name);
		expect(type).toBe(savedCredential.type);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.name).toBe(updatePayload.name);
		expect(updatedCredential.type).toBe(savedCredential.type);
	});

	test('should update credential data for owner', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			data: {
				accessToken: 'newAccessToken123456',
				user: 'updatedUser',
				server: 'updatedServer',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		// Data should be encrypted, so it shouldn't match the plain payload
		expect(updatedCredential.data).not.toBe(updatePayload.data);
		expect(updatedCredential.data).toBeDefined();
	});

	test('should update multiple fields at once', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			name: 'Completely Updated Credential',
			data: {
				accessToken: 'brandNewToken',
				user: 'newUser',
				server: 'newServer',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const { id, name, type } = response.body;

		expect(id).toBe(savedCredential.id);
		expect(name).toBe(updatePayload.name);
		expect(type).toBe(savedCredential.type);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.name).toBe(updatePayload.name);
	});

	test('should update owned credential for member', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: member });

		const updatePayload = {
			name: 'Member Updated Credential',
		};

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const { name } = response.body;

		expect(name).toBe(updatePayload.name);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.name).toBe(updatePayload.name);
	});

	test('should allow owner to update credential owned by member', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: member });

		const updatePayload = {
			name: 'Owner Updated Member Credential',
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.name).toBe(updatePayload.name);
	});

	test('should not allow member to update non-owned credential', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			name: 'Unauthorized Update',
		};

		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(403);

		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(unchangedCredential.name).toBe(savedCredential.name);
	});

	test('should fail if credential not found', async () => {
		const response = await authOwnerAgent.patch('/credentials/123').send({
			name: 'Does not matter',
		});

		expect(response.statusCode).toBe(404);
	});

	test('should fail with invalid credential type', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			type: 'invalidCredentialType',
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('not a known type');

		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(unchangedCredential.type).toBe(savedCredential.type);
	});

	test('should fail when data does not match credential type schema', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Send data that doesn't match the slackApi credential schema
		const updatePayload = {
			data: {
				invalidField: 'someValue',
				anotherInvalidField: 123,
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('request.body.data');

		// Verify credential was not updated
		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(unchangedCredential.data).toBe(savedCredential.data);
	});

	test('should update credential type to another valid type', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			type: 'ftp',
			data: {
				host: 'localhost',
				port: 21,
				username: 'testuser',
				password: 'testpass',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const { type } = response.body;
		expect(type).toBe('ftp');

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.type).toBe('ftp');
	});

	test('should preserve unchanged fields when updating', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });
		const originalName = savedCredential.name;
		const originalType = savedCredential.type;

		const updatePayload = {
			data: {
				accessToken: 'onlyUpdatingData',
				user: 'test',
				server: 'testServer',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const { name, type } = response.body;

		expect(name).toBe(originalName);
		expect(type).toBe(originalType);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.name).toBe(originalName);
		expect(updatedCredential.type).toBe(originalType);
	});

	test('should update isResolvable field', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		const updatePayload = {
			isResolvable: true,
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});

		expect(updatedCredential.isResolvable).toBe(true);
	});

	test('should fail to update isGlobal when sharing is not licensed', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Mock the license state to return false for sharing
		const licenseState = Container.get(LicenseState);
		const isSharingLicensedSpy = jest
			.spyOn(licenseState, 'isSharingLicensed')
			.mockReturnValue(false);

		const updatePayload = {
			isGlobal: true,
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toContain('not licensed for sharing credentials');

		// Verify credential was not updated
		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(unchangedCredential.isGlobal).toBeFalsy();

		// Restore original implementation
		isSharingLicensedSpy.mockRestore();
	});

	test('should fail to update isGlobal when user does not have credential:shareGlobally permission', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: member });

		// Mock the license state to return true for sharing
		const licenseState = Container.get(LicenseState);
		const isSharingLicensedSpy = jest
			.spyOn(licenseState, 'isSharingLicensed')
			.mockReturnValue(true);

		const updatePayload = {
			isGlobal: true,
		};

		// Member does not have credential:shareGlobally permission
		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toContain(
			'do not have permission to change global sharing for credentials',
		);

		// Verify credential was not updated
		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(unchangedCredential.isGlobal).toBeFalsy();

		// Restore original implementation
		isSharingLicensedSpy.mockRestore();
	});

	test('should successfully update isGlobal when licensed and user has permission', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Mock the license state to return true for sharing
		const licenseState = Container.get(LicenseState);
		const isSharingLicensedSpy = jest
			.spyOn(licenseState, 'isSharingLicensed')
			.mockReturnValue(true);

		const updatePayload = {
			isGlobal: true,
		};

		// Owner has credential:shareGlobally permission
		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// Verify credential was updated
		const updatedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(updatedCredential.isGlobal).toBe(true);

		// Restore original implementation
		isSharingLicensedSpy.mockRestore();
	});

	test('should require license when setting isGlobal to false', async () => {
		// First create a global credential
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Set it to global
		await Container.get(CredentialsRepository).update(savedCredential.id, { isGlobal: true });

		// Mock the license state to return false for sharing
		const licenseState = Container.get(LicenseState);
		const isSharingLicensedSpy = jest
			.spyOn(licenseState, 'isSharingLicensed')
			.mockReturnValue(false);

		const updatePayload = {
			isGlobal: false,
		};

		// Setting isGlobal to false should also require license
		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toContain('not licensed for sharing credentials');

		// Verify credential was not updated
		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(unchangedCredential.isGlobal).toBe(true);

		// Restore original implementation
		isSharingLicensedSpy.mockRestore();
	});

	test('should fail to update managed credentials', async () => {
		const managedCredential = await saveCredential(
			{ ...dbCredential(), isManaged: true },
			{ user: owner },
		);

		const updatePayload = {
			name: 'Trying to update managed credential',
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${managedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('Managed credentials cannot be updated');

		// Verify credential was not updated
		const unchangedCredential = await Container.get(CredentialsRepository).findOneByOrFail({
			id: managedCredential.id,
		});

		expect(unchangedCredential.name).toBe(managedCredential.name);
	});

	test('should replace entire data object when isPartialData is false', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Get original data to verify it has all fields
		const originalData = await getDecryptedCredentialData(savedCredential.id);
		expect(originalData.accessToken).toBeDefined();
		expect(originalData.server).toBeDefined();
		expect(originalData.user).toBeDefined();

		// Update with only some fields - entire data should be replaced
		const updatePayload = {
			data: {
				accessToken: 'onlyThisField',
			},
			isPartialData: false,
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// When isPartialData is false, the entire data object is replaced
		// So only the fields provided in the update will exist
		const updatedData = await getDecryptedCredentialData(savedCredential.id);
		expect(updatedData.accessToken).toBe('onlyThisField');
		expect(updatedData.server).toBeUndefined();
		expect(updatedData.user).toBeUndefined();
	});

	test('should replace entire data object when isPartialData is not provided (defaults to false)', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Get original data to verify it has all fields
		const originalData = await getDecryptedCredentialData(savedCredential.id);
		expect(originalData.accessToken).toBeDefined();
		expect(originalData.server).toBeDefined();
		expect(originalData.user).toBeDefined();

		// Update without isPartialData (defaults to false)
		const updatePayload = {
			data: {
				accessToken: 'onlyThisField',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// Without isPartialData, it defaults to false and replaces entire data object
		const updatedData = await getDecryptedCredentialData(savedCredential.id);
		expect(updatedData.accessToken).toBe('onlyThisField');
		expect(updatedData.server).toBeUndefined();
		expect(updatedData.user).toBeUndefined();
	});

	test('should merge data when isPartialData is true', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Get original data to verify it has all fields
		const originalData = await getDecryptedCredentialData(savedCredential.id);
		expect(originalData.accessToken).toBeDefined();
		expect(originalData.server).toBeDefined();
		expect(originalData.user).toBeDefined();

		const originalServer = originalData.server as string;
		const originalUser = originalData.user as string;

		// Update with partial data that should be merged
		const updatePayload = {
			data: {
				accessToken: 'updatedAccessToken',
				// user and server fields should be preserved from existing credential
			},
			isPartialData: true,
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// When isPartialData is true, the data is unredacted and merged
		// so existing fields (user, server) should be preserved
		const updatedData = await getDecryptedCredentialData(savedCredential.id);
		expect(updatedData.accessToken).toBe('updatedAccessToken');
		expect(updatedData.server).toBe(originalServer);
		expect(updatedData.user).toBe(originalUser);
	});

	test('should unredact values when isPartialData is true', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Get original data
		const originalData = await getDecryptedCredentialData(savedCredential.id);
		const originalAccessToken = originalData.accessToken as string;
		const originalServer = originalData.server as string;

		// Update with redacted accessToken (should keep original) and new user
		const updatePayload = {
			data: {
				accessToken: CREDENTIAL_BLANKING_VALUE, // Redacted value - should keep original
				user: 'newUserValue',
				// server is not provided - should be preserved
			},
			isPartialData: true,
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// Verify redacted value was unredacted (kept original)
		const updatedData = await getDecryptedCredentialData(savedCredential.id);
		expect(updatedData.accessToken).toBe(originalAccessToken); // Should keep original, not blanking value
		expect(updatedData.user).toBe('newUserValue'); // Should be updated
		expect(updatedData.server).toBe(originalServer); // Should be preserved
	});

	test('should preserve oauthTokenData when updating other fields', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });

		// Manually add oauthTokenData to the credential
		const credentialsService = Container.get(CredentialsService);
		const existingData = credentialsService.decrypt(
			await Container.get(CredentialsRepository).findOneByOrFail({ id: savedCredential.id }),
			true,
		);
		const dataWithOAuth = {
			...existingData,
			oauthTokenData: {
				access_token: 'test_access_token',
				refresh_token: 'test_refresh_token',
			},
		};

		// Update the credential with oauthTokenData
		const encryptedWithOAuth = credentialsService.createEncryptedData({
			id: savedCredential.id,
			name: savedCredential.name,
			type: savedCredential.type,
			data: dataWithOAuth,
		});
		await Container.get(CredentialsRepository).update(savedCredential.id, encryptedWithOAuth);

		// Update without including oauthTokenData in the payload
		const updatePayload = {
			data: {
				accessToken: 'newToken',
				user: 'test',
				server: 'testServer',
			},
		};

		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(updatePayload);

		expect(response.statusCode).toBe(200);

		// Verify oauthTokenData was preserved
		const updatedData = await getDecryptedCredentialData(savedCredential.id);
		expect(updatedData.oauthTokenData).toEqual({
			access_token: 'test_access_token',
			refresh_token: 'test_refresh_token',
		});
		// And other fields should be updated
		expect(updatedData.accessToken).toBe('newToken');
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
