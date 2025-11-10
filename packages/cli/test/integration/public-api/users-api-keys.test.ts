import type { ApiKeyWithRawValue } from '@n8n/api-types';
import { testDb, mockInstance } from '@n8n/backend-test-utils';
import { ApiKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { License } from '@/license';
import { PublicApiKeyService } from '@/services/public-api-key.service';

import {
	createMember,
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createUser,
} from '../shared/db/users';
import * as utils from '../shared/utils/';

const license = mockInstance(License, {
	getUsersLimit: jest.fn().mockReturnValue(-1),
	isApiKeyScopesEnabled: jest.fn().mockReturnValue(true),
});

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'WorkflowEntity',
		'CredentialsEntity',
		'User',
		'ApiKey',
	]);
});

describe('POST /users/:id/api-keys - Create API key for another user', () => {
	test('should fail due to missing API Key', async () => {
		const member = await createMember();
		const authAgent = testServer.publicApiAgentWithoutApiKey();

		await authAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Test Key',
				scopes: ['workflow:read'],
				expiresAt: null,
			})
			.expect(401);
	});

	test('should fail due to invalid API Key', async () => {
		const member = await createMember();
		const authAgent = testServer.publicApiAgentWithApiKey('invalid-key');

		await authAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Test Key',
				scopes: ['workflow:read'],
				expiresAt: null,
			})
			.expect(401);
	});

	test('should allow owner to create API key for another user', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);

		const response = await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Public API Key for Member',
				scopes: ['workflow:read', 'workflow:list'],
				expiresAt: null,
			})
			.expect(201);

		expect(response.body).toBeDefined();
		expect(response.body.rawApiKey).toBeDefined();
		expect(response.body.label).toBe('Public API Key for Member');
		expect(response.body.scopes).toEqual(['workflow:read', 'workflow:list']);

		// Verify the API key was created for the member
		const storedApiKey = await Container.get(ApiKeyRepository).findOneBy({
			userId: member.id,
			label: 'Public API Key for Member',
		});

		expect(storedApiKey).toBeDefined();
		expect(storedApiKey?.apiKey).toBe(response.body.rawApiKey);
	});

	test('should allow admin API key with apiKey:create scope to create API keys for users', async () => {
		const owner = await createOwnerWithApiKey({
			scopes: ['apiKey:create', 'user:list'],
		});
		const member = await createMember();

		const authAdminKeyAgent = testServer.publicApiAgentFor(owner);

		const response = await authAdminKeyAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'API Key Created by Admin API Key',
				scopes: ['workflow:read'],
				expiresAt: null,
			})
			.expect(201);

		expect(response.body).toBeDefined();
		expect(response.body.rawApiKey).toBeDefined();
		expect(response.body.label).toBe('API Key Created by Admin API Key');

		// Verify the API key was created for the member
		const storedApiKey = await Container.get(ApiKeyRepository).findOneBy({
			userId: member.id,
			label: 'API Key Created by Admin API Key',
		});

		expect(storedApiKey).toBeDefined();
		expect(storedApiKey?.apiKey).toBe(response.body.rawApiKey);
	});

	test('should reject member trying to create API key for another user', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();

		const authMemberAgent = testServer.publicApiAgentFor(member);

		await authMemberAgent
			.post(`/users/${owner.id}/api-keys`)
			.send({
				label: 'Unauthorized Key',
				scopes: ['workflow:read'],
				expiresAt: null,
			})
			.expect(403);
	});

	test('should reject if target user does not exist', async () => {
		const owner = await createOwnerWithApiKey();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);
		const fakeUserId = uuid(); // Generate a valid UUID that doesn't exist

		const response = await authOwnerAgent.post(`/users/${fakeUserId}/api-keys`).send({
			label: 'Key for Non-existent User',
			scopes: ['workflow:read'],
		});

		// Since expiresAt is now optional, this should now return 404 (user not found)
		// rather than 400 (validation error)
		expect(response.status).toBe(404);
		expect(response.body.message).toContain('not found');
	});

	test('should reject if scopes are invalid for target user role', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);

		const response = await authOwnerAgent.post(`/users/${member.id}/api-keys`).send({
			label: 'Invalid Scope Key',
			scopes: ['user:delete'], // Members shouldn't have this scope
		});

		expect(response.status).toBe(400);
	});

	test('should create API key with expiration', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);
		const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

		const response = await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Expiring Key',
				scopes: ['workflow:read'],
				expiresAt,
			})
			.expect(201);

		expect(response.body.expiresAt).toBe(expiresAt);
	});

	test('should create API key without expiration when expiresAt is omitted', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);

		const response = await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Non-Expiring Key',
				scopes: ['workflow:read'],
			})
			.expect(201);

		expect(response.body).toBeDefined();
		expect(response.body.rawApiKey).toBeDefined();
		expect(response.body.label).toBe('Non-Expiring Key');
		expect(response.body.scopes).toEqual(['workflow:read']);
		expect(response.body.expiresAt).toBeNull();

		// Verify the API key was created for the member
		const storedApiKey = await Container.get(ApiKeyRepository).findOneBy({
			userId: member.id,
			label: 'Non-Expiring Key',
		});

		expect(storedApiKey).toBeDefined();
		expect(storedApiKey?.apiKey).toBe(response.body.rawApiKey);
	});

	test('should reject if label is missing', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);

		await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				scopes: ['workflow:read'],
				expiresAt: null,
			})
			.expect(400);
	});

	test('should reject if scopes are missing', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);

		await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Missing Scopes',
				expiresAt: null,
			})
			.expect(400);
	});

	test('should reject if expiresAt is in the past', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMember();
		const authOwnerAgent = testServer.publicApiAgentFor(owner);
		const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

		await authOwnerAgent
			.post(`/users/${member.id}/api-keys`)
			.send({
				label: 'Past Expiration',
				scopes: ['workflow:read'],
				expiresAt: pastTimestamp,
			})
			.expect(400);
	});
});
