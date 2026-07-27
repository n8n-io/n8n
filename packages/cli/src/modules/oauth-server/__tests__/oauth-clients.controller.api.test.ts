import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createOwner, createMember } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';

const testServer = setupTestServer({ endpointGroups: ['mcp'], modules: ['oauth-server', 'mcp'] });

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

		const grantedAt = Date.now();
		await userConsentRepository.save({
			userId: owner.id,
			clientId: ownerClient.id,
			grantedAt,
			scope: ['workflow:read', 'execution:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: memberClient.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer.authAgentFor(owner).get('/mcp/oauth-clients');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			count: 1,
		});
		expect(response.body.data.data).toHaveLength(1);
		expect(response.body.data.data[0]).toMatchObject({
			id: ownerClient.id,
			grantedAt,
			scopes: ['workflow:read', 'execution:read'],
		});
	});

	test('should include the all-consents total for managers even on the mine view', async () => {
		const client = await oauthClientRepository.save({
			id: 'totals-client',
			name: 'Totals Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const ownerResponse = await testServer.authAgentFor(owner).get('/mcp/oauth-clients');

		expect(ownerResponse.statusCode).toBe(200);
		expect(ownerResponse.body.data.totals).toEqual({ mine: 1, all: 2 });
		expect(ownerResponse.body.data.data[0].owner).toBeUndefined();

		const memberResponse = await testServer.authAgentFor(member).get('/mcp/oauth-clients');

		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.data.totals).toEqual({ mine: 1 });
	});
});

describe('GET /rest/mcp/oauth-clients?ownership=all', () => {
	test("should return every user's consents with owner info for a manager", async () => {
		const sharedClient = await oauthClientRepository.save({
			id: 'all-shared-client',
			name: 'Shared Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
		const memberClient = await oauthClientRepository.save({
			id: 'all-member-client',
			name: 'Member Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: sharedClient.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: sharedClient.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: memberClient.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ ownership: 'all' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.data).toHaveLength(3);
		expect(response.body.data.totals).toEqual({ mine: 1, all: 3 });

		// a consent row is (client × owner): the shared client appears once per user
		const sharedRows = response.body.data.data.filter(
			(row: { id: string }) => row.id === sharedClient.id,
		);
		expect(sharedRows).toHaveLength(2);
		expect(sharedRows.map((row: { owner: { id: string } }) => row.owner.id).sort()).toEqual(
			[owner.id, member.id].sort(),
		);
		expect(sharedRows[0].owner).toMatchObject({
			id: expect.any(String),
			email: expect.any(String),
		});
	});

	test('should return 403 for a member', async () => {
		const response = await testServer
			.authAgentFor(member)
			.get('/mcp/oauth-clients')
			.query({ ownership: 'all' });

		expect(response.statusCode).toBe(403);
	});
});

describe('GET /rest/mcp/oauth-clients pagination and filters', () => {
	const saveClient = async (id: string, name: string) =>
		await oauthClientRepository.save({
			id,
			name,
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

	test('should page through results with take/skip while reporting the filtered total', async () => {
		const now = Date.now();
		for (let i = 0; i < 3; i++) {
			const client = await saveClient(`page-client-${i}`, `Page Client ${i}`);
			// distinct grantedAt so the DESC ordering is deterministic
			await userConsentRepository.save({
				userId: owner.id,
				clientId: client.id,
				grantedAt: now - i * 1000,
				scope: ['workflow:read'],
			});
		}

		const firstPage = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ take: 2, skip: 0 });

		expect(firstPage.statusCode).toBe(200);
		expect(firstPage.body.data.count).toBe(3);
		expect(firstPage.body.data.data.map((row: { id: string }) => row.id)).toEqual([
			'page-client-0',
			'page-client-1',
		]);

		const secondPage = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ take: 2, skip: 2 });

		expect(secondPage.body.data.count).toBe(3);
		expect(secondPage.body.data.data.map((row: { id: string }) => row.id)).toEqual([
			'page-client-2',
		]);
	});

	test('should filter by client name, case-insensitively', async () => {
		const cursor = await saveClient('name-cursor', 'Cursor');
		const claude = await saveClient('name-claude', 'Claude Code');
		await userConsentRepository.save({
			userId: owner.id,
			clientId: cursor.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: owner.id,
			clientId: claude.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ name: 'CURSOR' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.count).toBe(1);
		expect(response.body.data.data[0].id).toBe('name-cursor');
	});

	test('should filter by client type bucket derived from the name', async () => {
		const ide = await saveClient('type-ide', 'Cursor');
		const editor = await saveClient('type-editor', 'VS Code');
		const cli = await saveClient('type-cli', 'Claude Code');
		const web = await saveClient('type-web', 'ChatGPT');
		for (const client of [ide, editor, cli, web]) {
			await userConsentRepository.save({
				userId: owner.id,
				clientId: client.id,
				grantedAt: Date.now(),
				scope: ['workflow:read'],
			});
		}

		const ideResponse = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ type: 'ide' });

		// the IDE bucket covers both ide (Cursor) and editor (VS Code) brands
		expect(ideResponse.body.data.data.map((row: { id: string }) => row.id).sort()).toEqual([
			'type-editor',
			'type-ide',
		]);

		const webResponse = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ type: 'web' });

		expect(webResponse.body.data.data.map((row: { id: string }) => row.id)).toEqual(['type-web']);
	});

	test('should filter by the connected date bucket', async () => {
		const now = Date.now();
		const day = 24 * 60 * 60 * 1000;
		const recent = await saveClient('date-recent', 'Recent Client');
		const old = await saveClient('date-old', 'Old Client');
		await userConsentRepository.save({
			userId: owner.id,
			clientId: recent.id,
			grantedAt: now - 2 * day,
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: owner.id,
			clientId: old.id,
			grantedAt: now - 60 * day,
			scope: ['workflow:read'],
		});

		const last7 = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ connected: 'last7' });

		expect(last7.body.data.data.map((row: { id: string }) => row.id)).toEqual(['date-recent']);

		const older = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ connected: 'older' });

		expect(older.body.data.data.map((row: { id: string }) => row.id)).toEqual(['date-old']);
	});

	test('should return the distinct unfiltered owners in the all view', async () => {
		const client = await saveClient('owners-client', 'Owners Client');
		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.get('/mcp/oauth-clients')
			.query({ ownership: 'all', name: 'no such client' });

		expect(response.statusCode).toBe(200);
		// filters narrow the rows but not the owners offered by the filter dropdown
		expect(response.body.data.count).toBe(0);
		expect(response.body.data.owners.map((o: { id: string }) => o.id).sort()).toEqual(
			[owner.id, member.id].sort(),
		);

		const mineResponse = await testServer.authAgentFor(owner).get('/mcp/oauth-clients');
		expect(mineResponse.body.data.owners).toBeUndefined();
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
			scope: ['workflow:read'],
		});

		const response = await testServer.authAgentFor(owner).delete(`/mcp/oauth-clients/${client.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			success: true,
		});

		// last consent revoked → client registration garbage-collected
		const deletedClient = await oauthClientRepository.findOneBy({ id: client.id });
		expect(deletedClient).toBeNull();
	});

	test("should keep the client and other users' grants when revoking a shared client", async () => {
		const client = await oauthClientRepository.save({
			id: 'shared-client-id',
			name: 'Shared Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer.authAgentFor(owner).delete(`/mcp/oauth-clients/${client.id}`);

		expect(response.statusCode).toBe(200);

		// the owner's consent is gone, the member's grant and the client survive
		expect(
			await userConsentRepository.findOneBy({ userId: owner.id, clientId: client.id }),
		).toBeNull();
		expect(
			await userConsentRepository.findOneBy({ userId: member.id, clientId: client.id }),
		).not.toBeNull();
		expect(await oauthClientRepository.findOneBy({ id: client.id })).not.toBeNull();
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
			scope: ['workflow:read'],
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

	test("should allow a manager to revoke another user's grant", async () => {
		const client = await oauthClientRepository.save({
			id: 'admin-revoke-client',
			name: 'Admin Revoke Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});
		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.delete(`/mcp/oauth-clients/${client.id}`)
			.query({ userId: member.id });

		expect(response.statusCode).toBe(200);

		// the member's consent is gone, the owner's grant and the client survive
		expect(
			await userConsentRepository.findOneBy({ userId: member.id, clientId: client.id }),
		).toBeNull();
		expect(
			await userConsentRepository.findOneBy({ userId: owner.id, clientId: client.id }),
		).not.toBeNull();
		expect(await oauthClientRepository.findOneBy({ id: client.id })).not.toBeNull();
	});

	test('should garbage-collect the client when a manager revokes its last grant', async () => {
		const client = await oauthClientRepository.save({
			id: 'admin-gc-client',
			name: 'Admin GC Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.delete(`/mcp/oauth-clients/${client.id}`)
			.query({ userId: member.id });

		expect(response.statusCode).toBe(200);
		expect(await oauthClientRepository.findOneBy({ id: client.id })).toBeNull();
	});

	test("should return 403 when a member passes another user's userId", async () => {
		const client = await oauthClientRepository.save({
			id: 'member-forbidden-client',
			name: 'Member Forbidden Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(member)
			.delete(`/mcp/oauth-clients/${client.id}`)
			.query({ userId: owner.id });

		expect(response.statusCode).toBe(403);
		expect(
			await userConsentRepository.findOneBy({ userId: owner.id, clientId: client.id }),
		).not.toBeNull();
	});

	test('should treat a member passing their own userId like the default delete', async () => {
		const client = await oauthClientRepository.save({
			id: 'member-self-client',
			name: 'Member Self Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: member.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(member)
			.delete(`/mcp/oauth-clients/${client.id}`)
			.query({ userId: member.id });

		expect(response.statusCode).toBe(200);
		expect(
			await userConsentRepository.findOneBy({ userId: member.id, clientId: client.id }),
		).toBeNull();
	});

	test('should return 404 when the target user has no grant for the client', async () => {
		const client = await oauthClientRepository.save({
			id: 'no-consent-client',
			name: 'No Consent Client',
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});

		await userConsentRepository.save({
			userId: owner.id,
			clientId: client.id,
			grantedAt: Date.now(),
			scope: ['workflow:read'],
		});

		const response = await testServer
			.authAgentFor(owner)
			.delete(`/mcp/oauth-clients/${client.id}`)
			.query({ userId: member.id });

		expect(response.statusCode).toBe(404);
	});
});
