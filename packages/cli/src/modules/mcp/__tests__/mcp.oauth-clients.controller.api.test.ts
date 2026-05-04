import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';

const testServer = setupTestServer({ endpointGroups: ['mcp'], modules: ['mcp'] });

let owner: User;
let member: User;
let oauthClientRepository: OAuthClientRepository;
let userConsentRepository: UserConsentRepository;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	oauthClientRepository = Container.get(OAuthClientRepository);
	userConsentRepository = Container.get(UserConsentRepository);
});

afterEach(async () => {
	await testDb.truncate(['OAuthClient', 'UserConsent']);
});

describe('GET /rest/mcp/oauth-clients', () => {
	test('should return only the requesting user clients', async () => {
		const ownerClient = await oauthClientRepository.save({
			id: 'owner-list-client',
			name: 'Owner Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
		const memberClient = await oauthClientRepository.save({
			id: 'member-list-client',
			name: 'Member Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: ownerClient.id,
			grantedAt: Date.now(),
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: memberClient.id,
			grantedAt: Date.now(),
		});

		const response = await testServer.authAgentFor(owner).get('/mcp/oauth-clients');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			count: 1,
		});
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0].id).toBe(ownerClient.id);
	});
});

describe('GET /rest/mcp/oauth-clients/instance-stats', () => {
	test('should return instance-wide stats for an owner', async () => {
		const response = await testServer.authAgentFor(owner).get('/mcp/oauth-clients/instance-stats');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			count: expect.any(Number),
			limit: expect.any(Number),
			atCapacity: expect.any(Boolean),
		});
	});

	test('should report atCapacity=true when the instance limit is reached', async () => {
		const globalConfig = Container.get(GlobalConfig);
		const originalLimit = globalConfig.endpoints.mcpMaxRegisteredClients;
		globalConfig.endpoints.mcpMaxRegisteredClients = 1;

		try {
			await oauthClientRepository.save({
				id: 'capacity-client',
				name: 'Capacity Client',
				redirectUris: ['https://example.com/callback'],
				grantTypes: ['authorization_code'],
				tokenEndpointAuthMethod: 'none',
			});

			const response = await testServer
				.authAgentFor(owner)
				.get('/mcp/oauth-clients/instance-stats');

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toMatchObject({
				count: 1,
				limit: 1,
				atCapacity: true,
			});
		} finally {
			globalConfig.endpoints.mcpMaxRegisteredClients = originalLimit;
		}
	});

	test('should return 403 when a non-admin member calls the endpoint', async () => {
		const response = await testServer.authAgentFor(member).get('/mcp/oauth-clients/instance-stats');

		expect(response.statusCode).toBe(403);
	});
});

describe('DELETE /rest/mcp/oauth-clients/:clientId', () => {
	test('should allow a user to delete their own OAuth client', async () => {
		const client = await oauthClientRepository.save({
			id: 'owner-client-id',
			name: 'Owner Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
		});

		const response = await testServer.authAgentFor(owner).delete(`/mcp/oauth-clients/${client.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			success: true,
		});

		const deletedClient = await oauthClientRepository.findOneBy({ id: client.id });
		expect(deletedClient).toBeNull();
	});

	test("should return 404 when a user tries to delete another user's OAuth client", async () => {
		const client = await oauthClientRepository.save({
			id: 'owner-only-client',
			name: 'Owner Only Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
		});

		const response = await testServer
			.authAgentFor(member)
			.delete(`/mcp/oauth-clients/${client.id}`);

		expect(response.statusCode).toBe(404);

		// Verify the client was NOT deleted
		const existingClient = await oauthClientRepository.findOneBy({ id: client.id });
		expect(existingClient).not.toBeNull();
	});

	test('should return 404 when deleting a non-existent OAuth client', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.delete('/mcp/oauth-clients/non-existent-id');

		expect(response.statusCode).toBe(404);
	});
});
