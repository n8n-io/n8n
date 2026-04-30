import { testDb } from '@n8n/backend-test-utils';
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
