import { testDb, randomValidPassword, mockInstance } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ApiKeyRepository, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { getApiKeyScopesForRole } from '@n8n/permissions';

import { License } from '@/license';

import { createUser } from './shared/db/users';
import * as utils from './shared/utils/';

// Setup license mock BEFORE test server initialization
const isLicensedMock = jest.fn(() => true);
mockInstance(License, {
	isLicensed: isLicensedMock,
});

const testServer = utils.setupTestServer({ endpointGroups: ['apiKeys'] });

beforeEach(async () => {
	await testDb.truncate(['User']);
	mockInstance(GlobalConfig, { publicApi: { disabled: false } });
	// Reset to licensed by default
	isLicensedMock.mockImplementation(() => true);
});

describe('API Key Scopes License Enforcement', () => {
	let member: User;

	beforeEach(async () => {
		member = await createUser({ role: GLOBAL_MEMBER_ROLE, password: randomValidPassword() });
	});

	describe('When feat:apiKeyScopes is NOT licensed', () => {
		test('POST /api-keys should ignore custom scopes and assign all available scopes', async () => {
			// Disable the API Key Scopes feature for this test
			isLicensedMock.mockImplementationOnce(() => false);

			const expiresAt = Date.now() + 1000;

			const response = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Test API Key', expiresAt, scopes: ['workflow:create'] });

			expect(response.statusCode).toBe(200);

			const storedApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
				userId: member.id,
			});

			// Should have all available scopes for member role, not just the requested one
			const expectedScopes = getApiKeyScopesForRole(member);
			expect(storedApiKey.scopes.sort()).toEqual(expectedScopes.sort());
			expect(storedApiKey.scopes).not.toEqual(['workflow:create']);
			expect(storedApiKey.scopes.length).toBeGreaterThan(1);
		});

		test('PATCH /api-keys/:id should ignore custom scopes and assign all available scopes', async () => {
			// Disable the API Key Scopes feature for both create and update calls
			isLicensedMock.mockImplementation(() => false);

			// Create an API key first (it will get all available scopes)
			const createResponse = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Original Label', expiresAt: null, scopes: ['workflow:create'] });

			const apiKeyId = createResponse.body.data.id;

			// Try to update it with a custom scope
			const updateResponse = await testServer
				.authAgentFor(member)
				.patch(`/api-keys/${apiKeyId}`)
				.send({ label: 'Updated Label', scopes: ['workflow:create'] });

			expect(updateResponse.statusCode).toBe(200);

			const updatedApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
				id: apiKeyId,
			});

			// Should still have all available scopes, not the custom one
			const expectedScopes = getApiKeyScopesForRole(member);
			expect(updatedApiKey.scopes.sort()).toEqual(expectedScopes.sort());
			expect(updatedApiKey.scopes).not.toEqual(['workflow:create']);
			expect(updatedApiKey.label).toBe('Updated Label');
		});
	});

	describe('When feat:apiKeyScopes IS licensed', () => {
		test('POST /api-keys should honor custom scopes', async () => {
			// API Key Scopes feature is licensed by default (set in beforeEach)
			const expiresAt = Date.now() + 1000;

			const response = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Test API Key', expiresAt, scopes: ['workflow:create'] });

			expect(response.statusCode).toBe(200);

			const storedApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
				userId: member.id,
			});

			// Should have only the requested scope
			expect(storedApiKey.scopes).toEqual(['workflow:create']);
		});

		test('PATCH /api-keys/:id should honor custom scopes', async () => {
			// API Key Scopes feature is licensed by default (set in beforeEach)
			// Create an API key with one scope
			const createResponse = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Original Label', expiresAt: null, scopes: ['workflow:create'] });

			const apiKeyId = createResponse.body.data.id;

			// Update it with a different scope
			const updateResponse = await testServer
				.authAgentFor(member)
				.patch(`/api-keys/${apiKeyId}`)
				.send({ label: 'Updated Label', scopes: ['workflow:list'] });

			expect(updateResponse.statusCode).toBe(200);

			const updatedApiKey = await Container.get(ApiKeyRepository).findOneByOrFail({
				id: apiKeyId,
			});

			// Should have the new custom scope
			expect(updatedApiKey.scopes).toEqual(['workflow:list']);
			expect(updatedApiKey.label).toBe('Updated Label');
		});
	});
});
