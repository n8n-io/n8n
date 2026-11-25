import type { McpServerToolCandidate, McpServerToolResponse } from '@n8n/api-types';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	deleteWorkflowAndWebhooks,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService, PostHogClient } from '@n8n/backend-services';
import { McpServer, McpServerTool } from '@n8n/backend-module-mcp-servers';
import type { Project, User } from '@n8n/db';
import {
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';

import { createMember, createOwner } from '../shared/db/users';
import * as utils from '../shared/utils/';

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
	parameters: {
		inputSource: 'workflowInputs',
		workflowInputs: { values: [{ name: 'email', type: 'string' }] },
	},
};

const MANUAL_TRIGGER: INode = {
	id: 'manual',
	name: 'Manual',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const FORM: INode = {
	id: 'form',
	name: 'Form',
	type: 'n8n-nodes-base.form',
	typeVersion: 1,
	position: [200, 0],
	parameters: {},
};

let owner: User;
let admin: User;
let editor: User;
let viewer: User;
let chatUser: User;
let outsider: User;
let project: Project;

function enableFlag(on = true) {
	vi.mocked(Container.get(PostHogClient).getFeatureFlagForInstance).mockImplementation(
		async (flag) => (on && flag === '155_custom_mcp_servers' ? 'test' : undefined),
	);
}

async function createServer(inProject = project) {
	const id = uuidv7();
	await Container.get(DataSource)
		.getRepository(McpServer)
		.insert({
			id,
			projectId: inProject.id,
			name: 'Marketing tools',
			slug: `marketing-tools-${id.slice(-8)}`,
			description: 'Campaign numbers for the marketing team.',
		});
	return id;
}

/** A published workflow that starts with "When Executed by Another Workflow". */
async function createToolWorkflow(name: string, attributes: Record<string, unknown> = {}) {
	return await createActiveWorkflow(
		{ name, nodes: [TRIGGER], connections: {}, ...attributes },
		project,
	);
}

const base = (serverId: string) => `/projects/${project.id}/mcp-servers/${serverId}`;

beforeAll(async () => {
	owner = await createOwner();
	admin = await createMember();
	editor = await createMember();
	viewer = await createMember();
	chatUser = await createMember();
	outsider = await createMember();
});

beforeEach(async () => {
	await testDb.truncate(['McpServerTool', 'McpServer', 'WorkflowEntity', 'SharedWorkflow']);
	project = await createTeamProject('Marketing');
	await linkUserToProject(admin, project, 'project:admin');
	await linkUserToProject(editor, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	await linkUserToProject(chatUser, project, 'project:chatUser');
	enableFlag();
});

describe('GET /projects/:projectId/mcp-servers/:serverId/tool-candidates', () => {
	it('lists the workflows of the project, each with the reason why it cannot be a tool', async () => {
		const serverId = await createServer();
		const callable = await createToolWorkflow('Get campaign numbers', {
			description: 'Numbers of a campaign',
		});
		const unpublished = await createWorkflow({ name: 'Draft only', nodes: [TRIGGER] }, project);
		const noTrigger = await createActiveWorkflow(
			{ name: 'Manual start', nodes: [MANUAL_TRIGGER], connections: {} },
			project,
		);
		const withForm = await createToolWorkflow('Ask with a form', {
			nodes: [TRIGGER, FORM],
			connections: { Start: { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
		});
		const closed = await createToolWorkflow('Closed', { settings: { callerPolicy: 'none' } });
		await createToolWorkflow('Other project', {}).then(async (workflow) => {
			// Moves the workflow out of the project, so that the picker does not show it.
			const other = await createTeamProject('Other');
			await Container.get(SharedWorkflowRepository).update(
				{ workflowId: workflow.id },
				{ projectId: other.id },
			);
		});
		const archived = await createToolWorkflow('Archived');
		await Container.get(WorkflowRepository).update(archived.id, { isArchived: true });

		const response = await testServer
			.authAgentFor(editor)
			.get(`${base(serverId)}/tool-candidates`)
			.expect(200);

		const candidates: McpServerToolCandidate[] = response.body.data;
		expect(candidates).toHaveLength(5);
		expect(candidates).toEqual(
			expect.arrayContaining([
				{
					workflowId: callable.id,
					name: 'Get campaign numbers',
					description: 'Numbers of a campaign',
					reason: null,
				},
				expect.objectContaining({ workflowId: unpublished.id, reason: 'not_published' }),
				expect.objectContaining({ workflowId: noTrigger.id, reason: 'missing_trigger' }),
				expect.objectContaining({ workflowId: withForm.id, reason: 'incompatible_nodes' }),
				expect.objectContaining({ workflowId: closed.id, reason: 'caller_policy' }),
			]),
		);
	});

	it('marks a workflow that the server already has as "already added"', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);

		const response = await testServer
			.authAgentFor(editor)
			.get(`${base(serverId)}/tool-candidates`)
			.expect(200);

		expect(response.body.data).toEqual([
			expect.objectContaining({ workflowId: workflow.id, reason: 'already_added' }),
		]);
	});
});

describe('POST /projects/:projectId/mcp-servers/:serverId/tools', () => {
	it('saves each new tool with the default text and the draft source "defaults"', async () => {
		const serverId = await createServer();
		const first = await createToolWorkflow('Get campaign numbers', {
			description: 'Numbers of a campaign',
		});
		const second = await createToolWorkflow('Summarize: ticket history');

		const response = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [first.id, second.id] })
			.expect(200);

		const tools: McpServerToolResponse[] = response.body.data;
		expect(tools).toEqual([
			expect.objectContaining({
				serverId,
				kind: 'workflow',
				targetId: first.id,
				toolName: 'get_campaign_numbers',
				description: 'Numbers of a campaign',
				draftSource: 'defaults',
				position: 0,
				brokenReason: null,
			}),
			expect.objectContaining({
				targetId: second.id,
				toolName: 'summarize_ticket_history',
				description: '',
				position: 1,
			}),
		]);
	});

	it('adds _2 when the default name exists in the server', async () => {
		const serverId = await createServer();
		const first = await createToolWorkflow('Report');
		const second = await createToolWorkflow('report!');
		const third = await createToolWorkflow('REPORT');

		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [first.id] })
			.expect(200);
		const response = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [second.id, third.id] })
			.expect(200);

		expect(response.body.data.map((tool: McpServerToolResponse) => tool.toolName)).toEqual([
			'report_2',
			'report_3',
		]);
	});

	it('sends the event "tool added" for each new tool', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);

		expect(emit).toHaveBeenCalledWith('mcp-server-tool-added', {
			serverId,
			userId: editor.id,
			toolKind: 'workflow',
			source: 'ui',
		});
		emit.mockRestore();
	});

	it('refuses a workflow that cannot be a tool, and saves nothing', async () => {
		const serverId = await createServer();
		const callable = await createToolWorkflow('Get campaign numbers');
		const unpublished = await createWorkflow({ name: 'Draft only', nodes: [TRIGGER] }, project);

		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [callable.id, unpublished.id] })
			.expect(400);

		const detail = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(detail.body.data.tools).toEqual([]);
	});

	it('refuses a workflow that the server already has', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		const agent = testServer.authAgentFor(editor);

		await agent
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);
		await agent
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(409);
	});

	it('refuses a workflow of another project', async () => {
		const serverId = await createServer();
		const other = await createTeamProject('Other');
		const workflow = await createActiveWorkflow(
			{ name: 'Elsewhere', nodes: [TRIGGER], connections: {} },
			other,
		);

		await testServer
			.authAgentFor(owner)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(400);
	});

	it('saves one tool when the same workflow comes twice', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');

		const response = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id, workflow.id] })
			.expect(200);

		expect(response.body.data.map((tool: McpServerToolResponse) => tool.toolName)).toEqual([
			'get_campaign_numbers',
		]);
	});

	it('refuses an unknown workflow id, and saves nothing', async () => {
		const serverId = await createServer();
		const callable = await createToolWorkflow('Get campaign numbers');

		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [callable.id, 'does-not-exist'] })
			.expect(400);

		const detail = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(detail.body.data.tools).toEqual([]);
	});

	it('cuts a long workflow description to 2000 characters', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers', {
			description: 'a'.repeat(2500),
		});

		const response = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);

		expect(response.body.data[0].description).toBe('a'.repeat(2000));
	});
});

describe('PATCH /projects/:projectId/mcp-servers/:serverId/tools/:toolId', () => {
	async function addTool(serverId: string, name = 'Get campaign numbers') {
		const workflow = await createToolWorkflow(name);
		const response = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);
		const [tool]: McpServerToolResponse[] = response.body.data;
		return tool;
	}

	it('edits the tool name and the description, and sets the draft source to "edited"', async () => {
		const serverId = await createServer();
		const tool = await addTool(serverId);

		const response = await testServer
			.authAgentFor(editor)
			.patch(`${base(serverId)}/tools/${tool.id}`)
			.send({ toolName: 'campaign_numbers', description: 'Use it for campaign questions.' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: tool.id,
			toolName: 'campaign_numbers',
			description: 'Use it for campaign questions.',
			draftSource: 'edited',
		});
	});

	it.each(['Campaign', 'campaign-numbers', 'a'.repeat(65)])(
		'refuses the tool name %j',
		async (toolName) => {
			const serverId = await createServer();
			const tool = await addTool(serverId);

			await testServer
				.authAgentFor(editor)
				.patch(`${base(serverId)}/tools/${tool.id}`)
				.send({ toolName })
				.expect(400);
		},
	);

	it('refuses a tool name that another tool of the server has', async () => {
		const serverId = await createServer();
		const first = await addTool(serverId, 'First');
		const second = await addTool(serverId, 'Second');

		await testServer
			.authAgentFor(editor)
			.patch(`${base(serverId)}/tools/${second.id}`)
			.send({ toolName: first.toolName })
			.expect(409);
	});

	it('accepts a description of 2000 characters and refuses 2001 characters', async () => {
		const serverId = await createServer();
		const tool = await addTool(serverId);
		const agent = testServer.authAgentFor(editor);

		await agent
			.patch(`${base(serverId)}/tools/${tool.id}`)
			.send({ description: 'a'.repeat(2000) })
			.expect(200);
		await agent
			.patch(`${base(serverId)}/tools/${tool.id}`)
			.send({ description: 'b'.repeat(2001) })
			.expect(400);

		const detail = await agent.get(base(serverId)).expect(200);
		expect(detail.body.data.tools[0].description).toBe('a'.repeat(2000));
	});

	it('answers 404 for a tool of another server', async () => {
		const serverId = await createServer();
		const otherServerId = await createServer();
		const tool = await addTool(otherServerId);

		await testServer
			.authAgentFor(editor)
			.patch(`${base(serverId)}/tools/${tool.id}`)
			.send({ description: 'x' })
			.expect(404);
	});
});

describe('DELETE /projects/:projectId/mcp-servers/:serverId/tools/:toolId', () => {
	it('removes the tool', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		const agent = testServer.authAgentFor(editor);
		const added = await agent
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);

		await agent.delete(`${base(serverId)}/tools/${added.body.data[0].id}`).expect(200);

		const detail = await agent.get(base(serverId)).expect(200);
		expect(detail.body.data.tools).toEqual([]);
	});
});

describe('GET /projects/:projectId/mcp-servers/:serverId', () => {
	it('returns the server with its tools', async () => {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);

		const response = await testServer.authAgentFor(viewer).get(base(serverId)).expect(200);

		expect(response.body.data).toMatchObject({
			id: serverId,
			projectId: project.id,
			name: 'Marketing tools',
			description: 'Campaign numbers for the marketing team.',
			tools: [{ toolName: 'get_campaign_numbers', brokenReason: null }],
		});
	});

	it('keeps a broken tool in the list, with the reason', async () => {
		const serverId = await createServer();
		const unpublish = await createToolWorkflow('Unpublish me');
		const remove = await createToolWorkflow('Delete me');
		const retrigger = await createToolWorkflow('Change my trigger');
		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [unpublish.id, remove.id, retrigger.id] })
			.expect(200);

		const workflows = Container.get(WorkflowRepository);
		await workflows.update(unpublish.id, { activeVersionId: null, active: false });
		await Container.get(WorkflowPublishedVersionRepository).removePublishedVersion(unpublish.id);
		await deleteWorkflowAndWebhooks(remove.id);
		await Container.get(WorkflowHistoryRepository).update(
			{ workflowId: retrigger.id },
			{ nodes: [MANUAL_TRIGGER] },
		);

		const response = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);

		expect(
			response.body.data.tools.map((tool: McpServerToolResponse) => [
				tool.toolName,
				tool.brokenReason,
			]),
		).toEqual([
			['unpublish_me', 'not_published'],
			['delete_me', 'deleted'],
			['change_my_trigger', 'missing_trigger'],
		]);
	});

	it('answers 404 for a server of another project', async () => {
		const other = await createTeamProject('Other', owner);
		const serverId = await createServer(other);

		await testServer.authAgentFor(owner).get(base(serverId)).expect(404);
	});
});

describe('access', () => {
	type Call = [string, (serverId: string, toolId: string) => [string, string, object?]];
	const calls: Call[] = [
		['candidates', (s) => ['get', `${base(s)}/tool-candidates`]],
		['add', (s) => ['post', `${base(s)}/tools`, { workflowIds: ['x'] }]],
		['edit', (s, t) => ['patch', `${base(s)}/tools/${t}`, { description: 'x' }]],
		['draft', (s, t) => ['post', `${base(s)}/tools/${t}/draft`, {}]],
		['remove', (s, t) => ['delete', `${base(s)}/tools/${t}`]],
	];

	async function setup() {
		const serverId = await createServer();
		const workflow = await createToolWorkflow('Get campaign numbers');
		const added = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [workflow.id] })
			.expect(200);
		return { serverId, toolId: added.body.data[0].id as string };
	}

	async function send(user: User, [method, url, body]: [string, string, object?]) {
		const agent = testServer.authAgentFor(user);
		const request =
			method === 'get'
				? agent.get(url)
				: method === 'post'
					? agent.post(url)
					: method === 'patch'
						? agent.patch(url)
						: agent.delete(url);
		return await (body ? request.send(body) : request);
	}

	it.each(calls)('a project viewer cannot call "%s"', async (_name, call) => {
		const { serverId, toolId } = await setup();
		expect((await send(viewer, call(serverId, toolId))).status).toBe(403);
	});

	it.each(calls)('a chat user cannot call "%s"', async (_name, call) => {
		const { serverId, toolId } = await setup();
		expect((await send(chatUser, call(serverId, toolId))).status).toBe(403);
	});

	it.each(calls)('a person outside the project cannot call "%s"', async (_name, call) => {
		const { serverId, toolId } = await setup();
		expect((await send(outsider, call(serverId, toolId))).status).toBe(403);
	});

	it.each(calls)(
		'an editor cannot call "%s" on a server of another project through this project',
		async (_name, call) => {
			const other = await createTeamProject('Other', owner);
			const otherServerId = await createServer(other);
			const otherToolId = uuidv7();
			const tools = Container.get(DataSource).getRepository(McpServerTool);
			await tools.insert({
				id: otherToolId,
				serverId: otherServerId,
				kind: 'workflow',
				targetId: null,
				toolName: 'other_tool',
				description: 'A tool of another project.',
				draftSource: 'defaults',
				position: 0,
			});

			expect((await send(editor, call(otherServerId, otherToolId))).status).toBe(404);
			expect(await tools.findBy({ serverId: otherServerId })).toEqual([
				expect.objectContaining({
					id: otherToolId,
					toolName: 'other_tool',
					description: 'A tool of another project.',
				}),
			]);
		},
	);

	it('a project viewer reads the server and its tools, a chat user and an outsider cannot', async () => {
		const { serverId } = await setup();

		await testServer.authAgentFor(viewer).get(base(serverId)).expect(200);
		await testServer.authAgentFor(chatUser).get(base(serverId)).expect(403);
		await testServer.authAgentFor(outsider).get(base(serverId)).expect(403);
	});

	it.each([
		['project admin', () => admin],
		['project editor', () => editor],
		['instance owner', () => owner],
	])(
		'a %s reads the server, lists the candidates, and adds, edits, and removes a tool',
		async (_role, user) => {
			const serverId = await createServer();
			const workflow = await createToolWorkflow('Get campaign numbers');
			const agent = testServer.authAgentFor(user());

			await agent.get(base(serverId)).expect(200);
			await agent.get(`${base(serverId)}/tool-candidates`).expect(200);
			const added = await agent
				.post(`${base(serverId)}/tools`)
				.send({ workflowIds: [workflow.id] })
				.expect(200);
			const toolId = added.body.data[0].id as string;
			await agent
				.patch(`${base(serverId)}/tools/${toolId}`)
				.send({ description: 'Campaign numbers.' })
				.expect(200);
			await agent.delete(`${base(serverId)}/tools/${toolId}`).expect(200);
		},
	);

	it('answers 404 on every route when the flag is off', async () => {
		const { serverId, toolId } = await setup();
		enableFlag(false);

		await testServer.authAgentFor(editor).get(base(serverId)).expect(404);
		for (const [, call] of calls) {
			expect((await send(editor, call(serverId, toolId))).status).toBe(404);
		}
	});

	it('keeps the tools of a deleted server out of reach', async () => {
		const { serverId, toolId } = await setup();
		await Container.get(DataSource)
			.getRepository(McpServer)
			.update(serverId, { deletedAt: new Date() });

		await testServer.authAgentFor(editor).get(base(serverId)).expect(404);
		await testServer
			.authAgentFor(editor)
			.delete(`${base(serverId)}/tools/${toolId}`)
			.expect(404);
		expect(await Container.get(DataSource).getRepository(McpServerTool).countBy({ serverId })).toBe(
			1,
		);
	});
});
