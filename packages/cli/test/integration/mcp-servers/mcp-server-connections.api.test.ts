import { CUSTOM_MCP_SERVERS_FLAG, CUSTOM_MCP_SERVERS_FLAG_VARIANT } from '@n8n/api-types';
import { EventService, PostHogClient, UrlService } from '@n8n/backend-services';
import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import { McpServerBlock, McpServerConnection } from '@n8n/backend-module-mcp-servers';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { AssignableProjectRole } from '@n8n/permissions';
import { DataSource } from '@n8n/typeorm';
import type { MockInstance } from 'vitest';

import { OAuthClient } from '@/modules/oauth-server/database/entities/oauth-client.entity';
import { RefreshToken } from '@/modules/oauth-server/database/entities/oauth-refresh-token.entity';

import { createMember, createOwner, createUser } from '../shared/db/users';
import { GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['mcp-servers'],
	modules: ['inbound-auth-core', 'oauth-jwe', 'oauth-server', 'mcp-servers'],
});

const CLAUDE_CODE = 'claude-code-client';
const CURSOR = 'cursor-client';

const ROLES: AssignableProjectRole[] = [
	'project:admin',
	'project:editor',
	'project:viewer',
	'project:chatUser',
];

let owner: User;
let outsider: User;
let maya: User;
let tom: User;
let project: Project;
const roleUsers = {} as Record<AssignableProjectRole, User>;
let ownerAgent: SuperAgentTest;
let emit: MockInstance<EventService['emit']>;
let server: { id: string; slug: string };

const agentFor = (role: AssignableProjectRole) => testServer.authAgentFor(roleUsers[role]);
const serverPath = (serverId = server.id, projectId = project.id) =>
	`/projects/${projectId}/mcp-servers/${serverId}`;
const resourceUrl = (slug: string) =>
	`${Container.get(UrlService).getInstanceBaseUrl()}/mcp-servers/${slug}`;

function setFlag(on: boolean) {
	const flags = on ? { [CUSTOM_MCP_SERVERS_FLAG]: CUSTOM_MCP_SERVERS_FLAG_VARIANT } : {};
	vi.mocked(Container.get(PostHogClient).getFeatureFlags).mockResolvedValue(flags);
}

async function createServer(slug: string) {
	const response = await ownerAgent
		.post(`/projects/${project.id}/mcp-servers`)
		.send({ name: 'Support desk', slug })
		.expect(200);
	return response.body.data as { id: string; slug: string };
}

async function addConnection(
	user: User,
	oauthClientId: string,
	clientName: string,
	firstUsedAt: Date,
	lastUsedAt: Date,
	serverId = server.id,
) {
	await Container.get(DataSource)
		.getRepository(McpServerConnection)
		.insert({ serverId, userId: user.id, oauthClientId, clientName, firstUsedAt, lastUsedAt });
}

async function addRefreshToken(user: User, resource: string, token: string) {
	await Container.get(DataSource)
		.getRepository(RefreshToken)
		.insert({
			token,
			clientId: CLAUDE_CODE,
			userId: user.id,
			expiresAt: Math.floor(Date.now() / 1000) + 3600,
			scope: [],
			resource,
		});
}

async function refreshTokens() {
	const rows = await Container.get(DataSource).getRepository(RefreshToken).find();
	return rows.map((row) => row.token).sort();
}

async function blockRows() {
	return await Container.get(DataSource).getRepository(McpServerBlock).find();
}

async function connectionRows() {
	return await Container.get(DataSource).getRepository(McpServerConnection).find();
}

beforeAll(async () => {
	owner = await createOwner();
	outsider = await createMember();
	maya = await createUser({
		role: GLOBAL_MEMBER_ROLE,
		firstName: 'Maya',
		lastName: 'Fischer',
		email: 'maya@acme.com',
	});
	tom = await createUser({
		role: GLOBAL_MEMBER_ROLE,
		firstName: 'Tom',
		lastName: 'Becker',
		email: 'tom@acme.com',
	});
	project = await createTeamProject('Support', owner);
	for (const role of ROLES) {
		roleUsers[role] = await createMember();
		await linkUserToProject(roleUsers[role], project, role);
	}
	await linkUserToProject(maya, project, 'project:viewer');
	await linkUserToProject(tom, project, 'project:viewer');
	ownerAgent = testServer.authAgentFor(owner);
	const clients = Container.get(DataSource).getRepository(OAuthClient);
	for (const [id, name] of [
		[CLAUDE_CODE, 'Claude Code'],
		[CURSOR, 'Cursor'],
	]) {
		await clients.save({
			id,
			name,
			redirectUris: ['https://example.com/callback'],
			grantTypes: ['authorization_code'],
			tokenEndpointAuthMethod: 'none',
		});
	}
});

beforeEach(async () => {
	await testDb.truncate([
		'McpServerConnection',
		'McpServerBlock',
		'McpServerTool',
		'McpServer',
		'RefreshToken',
	]);
	setFlag(true);
	server = await createServer('support-desk');
	emit = vi.spyOn(Container.get(EventService), 'emit');
});

afterEach(() => {
	emit.mockRestore();
});

describe('GET /projects/:projectId/mcp-servers/:serverId/connections', () => {
	it('lists each person and client with the first and the last use, and the blocks', async () => {
		await addConnection(
			maya,
			CLAUDE_CODE,
			'Claude Code',
			new Date('2026-11-07T10:00:00.000Z'),
			new Date('2026-11-24T10:00:00.000Z'),
		);
		await addConnection(
			tom,
			CURSOR,
			'Cursor',
			new Date('2026-11-09T10:00:00.000Z'),
			new Date('2026-11-25T08:00:00.000Z'),
		);
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);

		const response = await agentFor('project:viewer')
			.get(`${serverPath()}/connections`)
			.expect(200);

		expect(response.body.data).toEqual({
			// The last use first.
			connections: [
				{
					userId: tom.id,
					firstName: 'Tom',
					lastName: 'Becker',
					email: 'tom@acme.com',
					oauthClientId: CURSOR,
					clientName: 'Cursor',
					firstUsedAt: '2026-11-09T10:00:00.000Z',
					lastUsedAt: '2026-11-25T08:00:00.000Z',
				},
				{
					userId: maya.id,
					firstName: 'Maya',
					lastName: 'Fischer',
					email: 'maya@acme.com',
					oauthClientId: CLAUDE_CODE,
					clientName: 'Claude Code',
					firstUsedAt: '2026-11-07T10:00:00.000Z',
					lastUsedAt: '2026-11-24T10:00:00.000Z',
				},
			],
			blocks: [
				{
					userId: tom.id,
					firstName: 'Tom',
					lastName: 'Becker',
					email: 'tom@acme.com',
					blockedById: owner.id,
					blockedAt: expect.any(String),
				},
			],
		});
	});

	it('lists only the connections of this server', async () => {
		const other = await createServer('other-desk');
		await addConnection(maya, CLAUDE_CODE, 'Claude Code', new Date(), new Date(), other.id);

		const response = await ownerAgent.get(`${serverPath()}/connections`).expect(200);

		expect(response.body.data).toEqual({ connections: [], blocks: [] });
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 200],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await agentFor(role).get(`${serverPath()}/connections`).expect(status);
	});

	it('refuses a person outside the project', async () => {
		await testServer.authAgentFor(outsider).get(`${serverPath()}/connections`).expect(403);
	});

	it('answers 404 for an unknown server and when the flag is off', async () => {
		await ownerAgent
			.get(`${serverPath('0195b6e0-0000-7000-8000-000000000000')}/connections`)
			.expect(404);

		setFlag(false);
		await ownerAgent.get(`${serverPath()}/connections`).expect(404);
	});
});

describe('POST /projects/:projectId/mcp-servers/:serverId/blocks', () => {
	it('blocks the person, deletes their refresh tokens for this server, and sends the event', async () => {
		const other = await createServer('other-desk');
		await addRefreshToken(tom, resourceUrl(server.slug), 'tom-this-server');
		await addRefreshToken(tom, resourceUrl(other.slug), 'tom-other-server');
		await addRefreshToken(maya, resourceUrl(server.slug), 'maya-this-server');

		const response = await agentFor('project:editor')
			.post(`${serverPath()}/blocks`)
			.send({ userId: tom.id })
			.expect(200);

		expect(response.body.data).toMatchObject({
			userId: tom.id,
			firstName: 'Tom',
			blockedById: roleUsers['project:editor'].id,
		});
		expect(await blockRows()).toEqual([
			expect.objectContaining({ serverId: server.id, userId: tom.id }),
		]);
		expect(await refreshTokens()).toEqual(['maya-this-server', 'tom-other-server']);
		expect(emit).toHaveBeenCalledWith('mcp-server-person-blocked', {
			serverId: server.id,
			userId: roleUsers['project:editor'].id,
			blockedUserId: tom.id,
			source: 'ui',
		});
	});

	it('keeps one block and sends one event when the person is already blocked', async () => {
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);

		expect(await blockRows()).toHaveLength(1);
		const blockEvents = emit.mock.calls.filter(([name]) => name === 'mcp-server-person-blocked');
		expect(blockEvents).toHaveLength(1);
	});

	it('answers 404 for an unknown person', async () => {
		await ownerAgent
			.post(`${serverPath()}/blocks`)
			.send({ userId: '0195b6e0-0000-7000-8000-000000000000' })
			.expect(404);
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await agentFor(role).post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(status);
	});
});

describe('DELETE /projects/:projectId/mcp-servers/:serverId/blocks/:userId', () => {
	it('restores access: deletes the block, keeps the connections, and sends the event', async () => {
		await addConnection(tom, CURSOR, 'Cursor', new Date(), new Date());
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);

		await agentFor('project:admin').delete(`${serverPath()}/blocks/${tom.id}`).expect(200);

		expect(await blockRows()).toEqual([]);
		expect(await connectionRows()).toHaveLength(1);
		expect(emit).toHaveBeenCalledWith('mcp-server-access-restored', {
			serverId: server.id,
			userId: roleUsers['project:admin'].id,
			restoredUserId: tom.id,
			source: 'ui',
		});
	});

	it('answers 404 when the person is not blocked', async () => {
		await ownerAgent.delete(`${serverPath()}/blocks/${tom.id}`).expect(404);
	});

	it('deletes a refresh token that a refresh wrote during the block, so the person signs in again', async () => {
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);
		await addRefreshToken(tom, resourceUrl(server.slug), 'tom-during-block');
		await addRefreshToken(maya, resourceUrl(server.slug), 'maya-this-server');

		await ownerAgent.delete(`${serverPath()}/blocks/${tom.id}`).expect(200);

		expect(await refreshTokens()).toEqual(['maya-this-server']);
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);

		await agentFor(role).delete(`${serverPath()}/blocks/${tom.id}`).expect(status);
	});
});

describe('DELETE /projects/:projectId/mcp-servers/:serverId/connections/:userId', () => {
	it('removes a blocked person: deletes their connections and the block, with no event', async () => {
		await addConnection(tom, CURSOR, 'Cursor', new Date(), new Date());
		await addConnection(tom, CLAUDE_CODE, 'Claude Code', new Date(), new Date());
		await addConnection(maya, CLAUDE_CODE, 'Claude Code', new Date(), new Date());
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);
		emit.mockClear();

		await agentFor('project:editor').delete(`${serverPath()}/connections/${tom.id}`).expect(200);

		expect(await blockRows()).toEqual([]);
		expect(await connectionRows()).toEqual([expect.objectContaining({ userId: maya.id })]);
		expect(emit).not.toHaveBeenCalled();
	});

	it('refuses to remove a person who is not blocked', async () => {
		await addConnection(maya, CLAUDE_CODE, 'Claude Code', new Date(), new Date());

		await ownerAgent.delete(`${serverPath()}/connections/${maya.id}`).expect(400);

		expect(await connectionRows()).toHaveLength(1);
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await ownerAgent.post(`${serverPath()}/blocks`).send({ userId: tom.id }).expect(200);

		await agentFor(role).delete(`${serverPath()}/connections/${tom.id}`).expect(status);
	});
});

describe('DELETE /projects/:projectId/mcp-servers/:serverId', () => {
	it('deletes the refresh tokens of the server at once', async () => {
		const other = await createServer('other-desk');
		await addRefreshToken(tom, resourceUrl(server.slug), 'tom-this-server');
		await addRefreshToken(maya, resourceUrl(server.slug), 'maya-this-server');
		await addRefreshToken(maya, resourceUrl(other.slug), 'maya-other-server');

		await ownerAgent.delete(serverPath()).expect(200);

		expect(await refreshTokens()).toEqual(['maya-other-server']);
	});
});
