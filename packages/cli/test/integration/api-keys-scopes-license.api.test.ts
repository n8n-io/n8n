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
import { LicenseMocker } from './shared/license';

const testServer = utils.setupTestServer({ endpointGroups: ['apiKeys'] });
let licenseMocker: LicenseMocker;

beforeAll(() => {
	// Setup License mocker
	licenseMocker = new LicenseMocker();
	licenseMocker.mock(Container.get(License));
	licenseMocker.enable(LICENSE_FEATURES.API_KEY_SCOPES);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	mockInstance(GlobalConfig, { publicApi: { disabled: false } });
	// Reset to licensed by default
	licenseMocker.reset();
	licenseMocker.enable(LICENSE_FEATURES.API_KEY_SCOPES);
});

describe('API Key Scopes License Enforcement', () => {
	let member: User;

	beforeEach(async () => {
		member = await createUser({ role: GLOBAL_MEMBER_ROLE, password: randomValidPassword() });
	});

	describe('When feat:apiKeyScopes is NOT licensed', () => {
		test('POST /api-keys should ignore custom scopes and assign all available scopes', async () => {
			licenseMocker.disable(LICENSE_FEATURES.API_KEY_SCOPES);

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
			licenseMocker.disable(LICENSE_FEATURES.API_KEY_SCOPES);

			const createResponse = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Original Label', expiresAt: null, scopes: ['workflow:create'] });

			const apiKeyId = createResponse.body.data.id;

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
			const createResponse = await testServer
				.authAgentFor(member)
				.post('/api-keys')
				.send({ label: 'Original Label', expiresAt: null, scopes: ['workflow:create'] });

			const apiKeyId = createResponse.body.data.id;

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
