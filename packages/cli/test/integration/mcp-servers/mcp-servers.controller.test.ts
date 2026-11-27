import { CUSTOM_MCP_SERVERS_FLAG, CUSTOM_MCP_SERVERS_FLAG_VARIANT } from '@n8n/api-types';
import { EventService, PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { AssignableProjectRole } from '@n8n/permissions';
import type { MockInstance } from 'vitest';

import { createAdmin, createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['mcp-servers'],
	modules: ['mcp-servers'],
});

let owner: User;
let admin: User;
let outsider: User;
let teamProject: Project;
const roleUsers = {} as Record<AssignableProjectRole, User>;
let ownerAgent: SuperAgentTest;
let outsiderAgent: SuperAgentTest;
let emit: MockInstance<EventService['emit']>;

const ROLES: AssignableProjectRole[] = [
	'project:admin',
	'project:editor',
	'project:viewer',
	'project:chatUser',
];

const agentFor = (role: AssignableProjectRole) => testServer.authAgentFor(roleUsers[role]);
const serversPath = (projectId = teamProject.id) => `/projects/${projectId}/mcp-servers`;

function setFlag(on: boolean) {
	vi.mocked(Container.get(PostHogClient).getFeatureFlagForInstance).mockImplementation(
		async (flag) =>
			on && flag === CUSTOM_MCP_SERVERS_FLAG ? CUSTOM_MCP_SERVERS_FLAG_VARIANT : undefined,
	);
}

async function createServer(
	body: { name: string; slug: string; description?: string },
	projectId = teamProject.id,
) {
	const response = await ownerAgent.post(serversPath(projectId)).send(body).expect(200);
	return response.body.data as { id: string; slug: string; updatedAt: string };
}

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	outsider = await createMember();
	teamProject = await createTeamProject('Marketing', owner);
	for (const role of ROLES) {
		roleUsers[role] = await createMember();
		await linkUserToProject(roleUsers[role], teamProject, role);
	}
	ownerAgent = testServer.authAgentFor(owner);
	outsiderAgent = testServer.authAgentFor(outsider);
});

beforeEach(async () => {
	await testDb.truncate(['McpServerTool', 'McpServer']);
	setFlag(true);
	emit = vi.spyOn(Container.get(EventService), 'emit');
});

afterEach(() => {
	emit.mockRestore();
});

describe('POST /projects/:projectId/mcp-servers', () => {
	const body = {
		name: 'Sales tools',
		slug: 'sales-tools',
		description: 'Pipeline numbers for the sales team.',
	};

	it('creates a server in the project and sends the event "created"', async () => {
		const response = await agentFor('project:admin').post(serversPath()).send(body).expect(200);

		expect(response.body.data).toMatchObject({
			projectId: teamProject.id,
			project: { name: 'Marketing', type: 'team' },
			name: 'Sales tools',
			slug: 'sales-tools',
			description: 'Pipeline numbers for the sales team.',
		});
		expect(emit).toHaveBeenCalledWith('mcp-server-created', {
			serverId: response.body.data.id,
			projectId: teamProject.id,
			userId: roleUsers['project:admin'].id,
			source: 'ui',
		});
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await agentFor(role).post(serversPath()).send(body).expect(status);
	});

	it('refuses a person outside the project', async () => {
		await outsiderAgent.post(serversPath()).send(body).expect(403);
	});

	it('answers 404 for a project that does not exist, and sends no event', async () => {
		await ownerAgent.post(serversPath('non-existing-id')).send(body).expect(404);

		expect(emit).not.toHaveBeenCalledWith('mcp-server-created', expect.anything());
	});

	it('creates a server in the personal project of its owner', async () => {
		const personal = await getPersonalProject(outsider);

		const response = await outsiderAgent.post(serversPath(personal.id)).send(body).expect(200);

		expect(response.body.data.project.type).toBe('personal');
	});

	it.each(['Sales Tools', 'sales--tools', 'sales-', 'a'.repeat(65)])(
		'refuses the slug %j',
		async (slug) => {
			await ownerAgent
				.post(serversPath())
				.send({ ...body, slug })
				.expect(400);
		},
	);

	it('refuses a slug that another server uses, also a deleted server', async () => {
		const other = await createTeamProject();
		const server = await createServer(body, other.id);
		await ownerAgent.post(serversPath()).send(body).expect(409);

		await ownerAgent.delete(`${serversPath(other.id)}/${server.id}`).expect(200);

		await ownerAgent.post(serversPath()).send(body).expect(409);
	});
});

describe('GET /projects/:projectId/mcp-servers/slug-available', () => {
	const check = async (slug: string, agent = ownerAgent) =>
		await agent.get(`${serversPath()}/slug-available`).query({ slug });

	it('tells if a slug is free, taken, or reserved by a deleted server', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		await createServer({ name: 'Support desk', slug: 'support-desk' });
		await ownerAgent.delete(`${serversPath()}/${server.id}`).expect(200);

		expect((await check('campaign-bot')).body.data).toEqual({ available: true, reason: null });
		expect((await check('support-desk')).body.data).toEqual({
			available: false,
			reason: 'taken',
		});
		expect((await check('sales-tools')).body.data).toEqual({
			available: false,
			reason: 'reserved',
		});
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		expect((await check('free', agentFor(role))).status).toBe(status);
	});

	it('refuses an invalid slug', async () => {
		expect((await check('Not A Slug')).status).toBe(400);
	});
});

describe('GET /projects/:projectId/mcp-servers', () => {
	it('lists the servers of the project, newest change first, without deleted servers', async () => {
		const first = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		const second = await createServer({ name: 'Support desk', slug: 'support-desk' });
		const deleted = await createServer({ name: 'Campaign bot', slug: 'campaign-bot' });
		await ownerAgent.delete(`${serversPath()}/${deleted.id}`).expect(200);
		await createServer({ name: 'Elsewhere', slug: 'elsewhere' }, (await createTeamProject()).id);
		await ownerAgent
			.patch(`${serversPath()}/${first.id}`)
			.send({ description: 'Updated' })
			.expect(200);

		const response = await agentFor('project:viewer').get(serversPath()).expect(200);

		expect(response.body.data.map((server: { id: string }) => server.id)).toEqual([
			first.id,
			second.id,
		]);
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 200],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		await agentFor(role).get(serversPath()).expect(status);
	});

	it('refuses a person outside the project', async () => {
		await outsiderAgent.get(serversPath()).expect(403);
	});

	it('answers 404 for a project that does not exist', async () => {
		await ownerAgent.get(serversPath('non-existing-id')).expect(404);
	});
});

describe('GET /mcp-servers', () => {
	it('lists the servers of each project in which the person can list servers', async () => {
		const own = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		const other = await createTeamProject('Other');
		const hidden = await createServer({ name: 'Hidden', slug: 'hidden' }, other.id);
		const viewer = roleUsers['project:viewer'];
		const personal = await getPersonalProject(viewer);
		const mine = await testServer
			.authAgentFor(viewer)
			.post(serversPath(personal.id))
			.send({ name: 'Mine', slug: 'mine' })
			.expect(200);

		const ids = async (agent: SuperAgentTest) =>
			((await agent.get('/mcp-servers').expect(200)).body.data as Array<{ id: string }>)
				.map((server) => server.id)
				.sort();

		expect(await ids(testServer.authAgentFor(viewer))).toEqual([own.id, mine.body.data.id].sort());
		expect(await ids(agentFor('project:admin'))).toEqual([own.id]);
		expect(await ids(agentFor('project:editor'))).toEqual([own.id]);
		expect(await ids(agentFor('project:chatUser'))).toEqual([]);
		expect(await ids(testServer.authAgentFor(admin))).toEqual(
			[own.id, hidden.id, mine.body.data.id].sort(),
		);
	});
});

describe('GET /projects/:projectId/mcp-servers/:serverId', () => {
	it('returns the server to a person with the read scope', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		const response = await agentFor('project:viewer')
			.get(`${serversPath()}/${server.id}`)
			.expect(200);

		expect(response.body.data).toMatchObject({ id: server.id, slug: 'sales-tools' });
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 200],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		await agentFor(role).get(`${serversPath()}/${server.id}`).expect(status);
	});

	it('answers 404 for a deleted server, a server of another project, and an unknown id', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		const other = await createTeamProject();
		const elsewhere = await createServer({ name: 'Elsewhere', slug: 'elsewhere' }, other.id);
		await ownerAgent.delete(`${serversPath()}/${server.id}`).expect(200);

		await ownerAgent.get(`${serversPath()}/${server.id}`).expect(404);
		await ownerAgent.get(`${serversPath()}/${elsewhere.id}`).expect(404);
		await ownerAgent.get(`${serversPath()}/not-a-uuid`).expect(404);
	});
});

describe('PATCH /projects/:projectId/mcp-servers/:serverId', () => {
	it('changes the name and the description, and keeps the slug', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		const response = await agentFor('project:editor')
			.patch(`${serversPath()}/${server.id}`)
			.send({ name: 'Revenue tools', description: 'For the revenue team.' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			name: 'Revenue tools',
			description: 'For the revenue team.',
			slug: 'sales-tools',
		});
	});

	it('refuses a slug and an empty change', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		const path = `${serversPath()}/${server.id}`;

		await ownerAgent.patch(path).send({ slug: 'new-slug' }).expect(400);
		await ownerAgent.patch(path).send({}).expect(400);
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		await agentFor(role).patch(`${serversPath()}/${server.id}`).send({ name: 'X' }).expect(status);
	});

	it('answers 404 for a deleted server', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		await ownerAgent.delete(`${serversPath()}/${server.id}`).expect(200);

		await ownerAgent.patch(`${serversPath()}/${server.id}`).send({ name: 'X' }).expect(404);
	});

	it('answers 404 for a server of another project and an id that is not a UUID', async () => {
		const other = await createTeamProject();
		const elsewhere = await createServer({ name: 'Elsewhere', slug: 'elsewhere' }, other.id);
		const projectAdmin = agentFor('project:admin');

		await projectAdmin.patch(`${serversPath()}/${elsewhere.id}`).send({ name: 'X' }).expect(404);
		await projectAdmin.patch(`${serversPath()}/not-a-uuid`).send({ name: 'X' }).expect(404);

		const response = await ownerAgent.get(`${serversPath(other.id)}/${elsewhere.id}`).expect(200);
		expect(response.body.data.name).toBe('Elsewhere');
	});
});

describe('DELETE /projects/:projectId/mcp-servers/:serverId', () => {
	it('hides the server, keeps its slug, and sends the event "deleted"', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		await agentFor('project:admin').delete(`${serversPath()}/${server.id}`).expect(200);

		expect((await ownerAgent.get(serversPath()).expect(200)).body.data).toEqual([]);
		await ownerAgent.delete(`${serversPath()}/${server.id}`).expect(404);
		expect(emit).toHaveBeenCalledWith('mcp-server-deleted', {
			serverId: server.id,
			projectId: teamProject.id,
			userId: roleUsers['project:admin'].id,
			source: 'ui',
		});
	});

	it.each([
		['project:admin', 200],
		['project:editor', 200],
		['project:viewer', 403],
		['project:chatUser', 403],
	] as const)('answers %s with %i', async (role, status) => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });

		await agentFor(role).delete(`${serversPath()}/${server.id}`).expect(status);
	});

	it('answers 404 for a server of another project and an id that is not a UUID', async () => {
		const other = await createTeamProject();
		const elsewhere = await createServer({ name: 'Elsewhere', slug: 'elsewhere' }, other.id);
		const projectAdmin = agentFor('project:admin');

		await projectAdmin.delete(`${serversPath()}/${elsewhere.id}`).expect(404);
		await projectAdmin.delete(`${serversPath()}/not-a-uuid`).expect(404);

		await ownerAgent.get(`${serversPath(other.id)}/${elsewhere.id}`).expect(200);
		expect(emit).not.toHaveBeenCalledWith('mcp-server-deleted', expect.anything());
	});
});

describe('with the flag off', () => {
	it('answers 404 on every route', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		setFlag(false);
		const path = `${serversPath()}/${server.id}`;

		await ownerAgent.get('/mcp-servers').expect(404);
		await ownerAgent.get(serversPath()).expect(404);
		await ownerAgent.post(serversPath()).send({ name: 'X', slug: 'x' }).expect(404);
		await ownerAgent.get(`${serversPath()}/slug-available`).query({ slug: 'x' }).expect(404);
		await ownerAgent.get(path).expect(404);
		await ownerAgent.patch(path).send({ name: 'X' }).expect(404);
		await ownerAgent.delete(path).expect(404);
	});

	it('changes nothing and sends no event', async () => {
		const server = await createServer({ name: 'Sales tools', slug: 'sales-tools' });
		emit.mockClear();
		setFlag(false);
		const path = `${serversPath()}/${server.id}`;

		await ownerAgent.post(serversPath()).send({ name: 'X', slug: 'x' }).expect(404);
		await ownerAgent.patch(path).send({ name: 'X' }).expect(404);
		await ownerAgent.delete(path).expect(404);
		setFlag(true);

		const slug = await ownerAgent.get(`${serversPath()}/slug-available`).query({ slug: 'x' });
		expect(slug.body.data).toEqual({ available: true, reason: null });
		expect((await ownerAgent.get(path).expect(200)).body.data.name).toBe('Sales tools');
		expect(emit).not.toHaveBeenCalledWith('mcp-server-created', expect.anything());
		expect(emit).not.toHaveBeenCalledWith('mcp-server-deleted', expect.anything());
	});

	// The scope check and the body check run before the flag gate.
	it('answers a person without the scope with 403 and an invalid slug with 400', async () => {
		setFlag(false);

		await agentFor('project:viewer').post(serversPath()).send({ name: 'X', slug: 'x' }).expect(403);
		await ownerAgent.post(serversPath()).send({ name: 'X', slug: 'Not A Slug' }).expect(400);
	});
});
