import { EventService, PostHogClient } from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { McpServer, McpServerTool } from '@n8n/backend-module-mcp-servers';
import { GLOBAL_MEMBER_ROLE, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';
import type { MockInstance } from 'vitest';

import { createAdmin, createMember, createUser } from '../shared/db/users';
import * as utils from '../shared/utils/';

/**
 * The share page of a server reads one of two endpoints. The signed-in one gives the
 * description and the tools to a person who can connect. The public one never does.
 */
const testServer = utils.setupTestServer({
	endpointGroups: ['mcp-servers'],
	modules: ['mcp-servers'],
});

const TRIGGER: INode = {
	id: 'trigger',
	name: 'Start',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: { inputSource: 'passthrough' },
};

let member: User;
let viewer: User;
let outsider: User;
let admin: User;
let project: Project;
let serverSlug: string;

const sharePath = (slug: string) => `/mcp-servers/share/${slug}`;
const publicPath = (slug: string) => `/mcp-servers/share/${slug}/public`;

function setFlag(on: boolean) {
	vi.mocked(Container.get(PostHogClient).getFeatureFlagForInstance).mockResolvedValue(
		on ? 'test' : undefined,
	);
}

async function createServer(slug: string, projectId: string) {
	const id = uuidv7();
	await Container.get(DataSource).getRepository(McpServer).insert({
		id,
		projectId,
		name: 'Sales tools',
		slug,
		description: 'Pipeline numbers for the sales team.',
	});
	return id;
}

async function deleteServer(slug: string) {
	await Container.get(DataSource)
		.getRepository(McpServer)
		.update({ slug }, { deletedAt: new Date() });
}

async function addTool(serverId: string, toolName: string, targetId: string, position: number) {
	await Container.get(DataSource)
		.getRepository(McpServerTool)
		.insert({
			id: uuidv7(),
			serverId,
			kind: 'workflow',
			targetId,
			toolName,
			description: `Description of ${toolName}`,
			draftSource: 'defaults',
			toolData: null,
			position,
		});
}

const PUBLIC_FIELDS = [
	'canConnect',
	'id',
	'name',
	'projectName',
	'projectType',
	'serverUrl',
	'slug',
];

beforeAll(async () => {
	member = await createUser({ role: GLOBAL_MEMBER_ROLE, firstName: 'Maya', lastName: 'Lind' });
	viewer = await createMember();
	outsider = await createMember();
	admin = await createAdmin();
});

beforeEach(async () => {
	await testDb.truncate(['McpServerTool', 'McpServer', 'WorkflowEntity', 'SharedWorkflow']);
	project = await createTeamProject('Marketing');
	await linkUserToProject(member, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	setFlag(true);
	serverSlug = `sales-tools-${uuidv7().slice(-8)}`;
	const serverId = await createServer(serverSlug, project.id);
	const workflow = await createActiveWorkflow(
		{ name: 'Pipeline summary', nodes: [TRIGGER], connections: {} },
		project,
	);
	await addTool(serverId, 'get_pipeline_summary', workflow.id, 0);
	await addTool(serverId, 'deleted_tool', uuidv7(), 1);
});

describe('GET /mcp-servers/share/:slug', () => {
	it('answers 401 to a person who is not signed in', async () => {
		await testServer.authlessAgent.get(sharePath(serverSlug)).expect(401);
	});

	it('answers 404 for an unknown server', async () => {
		await testServer.authAgentFor(member).get(sharePath('no-such-server')).expect(404);
	});

	it('answers 404 for a deleted server, whose slug stays reserved', async () => {
		await deleteServer(serverSlug);
		await testServer.authAgentFor(member).get(sharePath(serverSlug)).expect(404);
	});

	it('answers 404 when the flag is off', async () => {
		setFlag(false);
		await testServer.authAgentFor(member).get(sharePath(serverSlug)).expect(404);
	});

	it('gives a person who can connect the description and the tools that work', async () => {
		const response = await testServer.authAgentFor(viewer).get(sharePath(serverSlug)).expect(200);

		expect(response.body.data).toEqual({
			id: expect.any(String),
			slug: serverSlug,
			name: 'Sales tools',
			serverUrl: expect.stringMatching(new RegExp(`/mcp-servers/${serverSlug}$`)),
			projectName: 'Marketing',
			projectType: 'team',
			canConnect: true,
			description: 'Pipeline numbers for the sales team.',
			tools: [
				{ toolName: 'get_pipeline_summary', description: 'Description of get_pipeline_summary' },
			],
		});
	});

	// An instance admin holds `mcpServer:connect` globally, so they connect to every server.
	it('gives an instance admin who is not in the project the description and the tools', async () => {
		const response = await testServer.authAgentFor(admin).get(sharePath(serverSlug)).expect(200);

		expect(response.body.data).toMatchObject({ canConnect: true, tools: [expect.anything()] });
	});

	it('gives a signed-in person who is not in the project only the public page', async () => {
		const response = await testServer.authAgentFor(outsider).get(sharePath(serverSlug)).expect(200);

		expect(Object.keys(response.body.data).sort()).toEqual(PUBLIC_FIELDS);
		expect(response.body.data).toMatchObject({ canConnect: false, projectName: 'Marketing' });
	});

	it.each([
		{ firstName: 'Maya', lastName: 'Lind', projectName: 'Maya Lind' },
		{ firstName: 'Maya', lastName: '', projectName: 'Maya' },
		{ firstName: '', lastName: '', projectName: null },
	])(
		'names the owner "$firstName $lastName" of a personal project as $projectName, without the email',
		async ({ firstName, lastName, projectName }) => {
			const owner = await createUser({ role: GLOBAL_MEMBER_ROLE, firstName, lastName });
			const slug = `owner-tools-${uuidv7().slice(-8)}`;
			await createServer(slug, (await getPersonalProject(owner)).id);

			const response = await testServer.authAgentFor(outsider).get(sharePath(slug)).expect(200);

			expect(response.body.data).toMatchObject({ projectName, projectType: 'personal' });
			expect(JSON.stringify(response.body)).not.toContain(owner.email);
		},
	);
});

describe('page view telemetry', () => {
	let emit: MockInstance<EventService['emit']>;

	beforeEach(() => {
		emit = vi.spyOn(Container.get(EventService), 'emit');
	});

	afterEach(() => {
		emit.mockRestore();
	});

	const views = () => emit.mock.calls.filter(([name]) => name === 'mcp-server-share-viewed');

	it('sends one view with the user for a signed-in person who can connect', async () => {
		const response = await testServer.authAgentFor(viewer).get(sharePath(serverSlug)).expect(200);

		expect(views()).toEqual([
			[
				'mcp-server-share-viewed',
				{
					serverId: response.body.data.id,
					userId: viewer.id,
					canConnect: true,
					result: 'found',
				},
			],
		]);
	});

	it('sends one view with no user and no server for a public link that finds no server', async () => {
		await testServer.authlessAgent.get(publicPath('no-such-server')).expect(404);

		expect(views()).toEqual([
			[
				'mcp-server-share-viewed',
				{ serverId: undefined, userId: undefined, canConnect: false, result: 'not_found' },
			],
		]);
	});
});

describe('GET /mcp-servers/share/:slug/public', () => {
	it('answers 404 for an unknown server', async () => {
		await testServer.authlessAgent.get(publicPath('no-such-server')).expect(404);
	});

	it('answers 404 when the flag is off', async () => {
		setFlag(false);
		await testServer.authlessAgent.get(publicPath(serverSlug)).expect(404);
	});

	it('answers 404 for a deleted server, without the name of the project', async () => {
		await deleteServer(serverSlug);
		const response = await testServer.authlessAgent.get(publicPath(serverSlug)).expect(404);

		expect(JSON.stringify(response.body)).not.toContain('Marketing');
	});

	it('gives a person who is not signed in no description and no tools', async () => {
		const response = await testServer.authlessAgent.get(publicPath(serverSlug)).expect(200);

		expect(Object.keys(response.body.data).sort()).toEqual(PUBLIC_FIELDS);
		expect(response.body.data).toMatchObject({
			slug: serverSlug,
			name: 'Sales tools',
			projectName: 'Marketing',
			projectType: 'team',
			canConnect: false,
		});
	});

	it('gives only the public page also to a member who sends a session cookie', async () => {
		const response = await testServer.authAgentFor(member).get(publicPath(serverSlug)).expect(200);

		expect(response.body.data.canConnect).toBe(false);
		expect(response.body.data).not.toHaveProperty('tools');
	});
});
