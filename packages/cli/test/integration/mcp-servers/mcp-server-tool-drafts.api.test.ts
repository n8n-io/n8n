import type { McpServerToolResponse } from '@n8n/api-types';
import {
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { EventService, PostHogClient } from '@n8n/backend-services';
import { McpServer } from '@n8n/backend-module-mcp-servers';
import type { Project, User } from '@n8n/db';
import { WorkflowPublishedVersionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';
import type { MockInstance } from 'vitest';

import { TextDraftAdapter } from '@/modules/mcp-servers/text-draft.adapter';

import { createMember } from '../shared/db/users';
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
		workflowInputs: {
			values: [
				{ name: 'campaign_id', type: 'string' },
				{ name: 'days', type: 'number' },
			],
		},
	},
};

const SET: INode = {
	id: 'set',
	name: 'Shape the numbers',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [200, 0],
	parameters: {},
};

let editor: User;
let viewer: User;
let project: Project;
let isAvailable: MockInstance<TextDraftAdapter['isAvailable']>;
let draft: MockInstance<TextDraftAdapter['draft']>;

const base = (serverId: string) => `/projects/${project.id}/mcp-servers/${serverId}`;

function answer(value: object) {
	draft.mockResolvedValueOnce({ status: 'drafted', text: JSON.stringify(value) });
}

/** A server with one tool from the workflow "Campaign numbers", with the default text. */
async function setup() {
	const serverId = uuidv7();
	await Container.get(DataSource)
		.getRepository(McpServer)
		.insert({
			id: serverId,
			projectId: project.id,
			name: 'Marketing tools',
			slug: `marketing-tools-${serverId.slice(-8)}`,
			description: '',
		});
	const workflow = await createActiveWorkflow(
		{
			name: 'Campaign numbers',
			description: 'Reads the numbers of a campaign',
			nodes: [TRIGGER, SET],
			connections: { Start: { main: [[{ node: 'Shape the numbers', type: 'main', index: 0 }]] } },
		},
		project,
	);
	const added = await testServer
		.authAgentFor(editor)
		.post(`${base(serverId)}/tools`)
		.send({ workflowIds: [workflow.id] })
		.expect(200);
	const tool: McpServerToolResponse = added.body.data[0];
	return {
		serverId,
		tool,
		workflowId: workflow.id,
		draftUrl: `${base(serverId)}/tools/${tool.id}/draft`,
	};
}

beforeAll(async () => {
	editor = await createMember();
	viewer = await createMember();
});

beforeEach(async () => {
	await testDb.truncate(['McpServerTool', 'McpServer', 'WorkflowEntity', 'SharedWorkflow']);
	project = await createTeamProject('Marketing');
	await linkUserToProject(editor, project, 'project:editor');
	await linkUserToProject(viewer, project, 'project:viewer');
	vi.mocked(Container.get(PostHogClient).getFeatureFlagForInstance).mockImplementation(
		async (flag) => (flag === '155_custom_mcp_servers' ? 'test' : undefined),
	);
	const adapter = Container.get(TextDraftAdapter);
	isAvailable = vi.spyOn(adapter, 'isAvailable').mockResolvedValue(true);
	draft = vi.spyOn(adapter, 'draft');
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('POST /projects/:projectId/mcp-servers/:serverId/tools/:toolId/draft', () => {
	it('saves the draft of both fields, with the draft source "ai"', async () => {
		const { serverId, draftUrl } = await setup();
		answer({ toolName: 'get_campaign_numbers', description: 'Returns the numbers.' });

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(200);

		expect(response.body.data).toMatchObject({
			status: 'drafted',
			tool: {
				toolName: 'get_campaign_numbers',
				description: 'Returns the numbers.',
				draftSource: 'ai',
			},
		});
		const server = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(server.body.data.tools[0]).toMatchObject({
			toolName: 'get_campaign_numbers',
			description: 'Returns the numbers.',
			draftSource: 'ai',
		});
	});

	it('sends the workflow name, the description, the inputs, and the node names in one model call', async () => {
		const { draftUrl } = await setup();
		answer({ toolName: 'get_campaign_numbers', description: 'Returns the numbers.' });

		await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(200);

		expect(draft).toHaveBeenCalledTimes(1);
		const [user, prompt] = draft.mock.calls[0];
		expect(user.id).toBe(editor.id);
		expect(prompt).toContain('Campaign numbers');
		expect(prompt).toContain('Reads the numbers of a campaign');
		expect(prompt).toContain('campaign_id (string)');
		expect(prompt).toContain('days (number)');
		expect(prompt).toContain('Start, Shape the numbers');
	});

	it('"Generate" writes only the field that the builder asked for', async () => {
		const { tool, draftUrl } = await setup();
		answer({ toolName: 'ignored_name', description: 'Returns the numbers of one campaign.' });

		const response = await testServer
			.authAgentFor(editor)
			.post(draftUrl)
			.send({ field: 'description' })
			.expect(200);

		expect(response.body.data.tool).toMatchObject({
			toolName: tool.toolName,
			description: 'Returns the numbers of one campaign.',
			draftSource: 'ai',
		});
	});

	it('adds _2 when another tool of the server has the drafted name', async () => {
		const { serverId, draftUrl } = await setup();
		const other = await createActiveWorkflow(
			{ name: 'Get numbers', nodes: [TRIGGER], connections: {} },
			project,
		);
		await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [other.id] })
			.expect(200);
		answer({ toolName: 'get_numbers', description: 'Returns the numbers.' });

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(200);

		expect(response.body.data.tool.toolName).toBe('get_numbers_2');
	});

	it('gives two parallel drafts with the same name different names', async () => {
		const { serverId, draftUrl } = await setup();
		const other = await createActiveWorkflow(
			{ name: 'Campaign numbers again', nodes: [TRIGGER], connections: {} },
			project,
		);
		const added = await testServer
			.authAgentFor(editor)
			.post(`${base(serverId)}/tools`)
			.send({ workflowIds: [other.id] })
			.expect(200);
		draft.mockResolvedValue({
			status: 'drafted',
			text: JSON.stringify({ toolName: 'get_campaign_numbers', description: 'Returns them.' }),
		});

		const responses = await Promise.all([
			testServer.authAgentFor(editor).post(draftUrl).send({}),
			testServer
				.authAgentFor(editor)
				.post(`${base(serverId)}/tools/${added.body.data[0].id}/draft`)
				.send({}),
		]);

		expect(responses.map((response) => response.status)).toEqual([200, 200]);
		expect(responses.map((response) => response.body.data.tool.toolName).sort()).toEqual([
			'get_campaign_numbers',
			'get_campaign_numbers_2',
		]);
	});

	it('keeps the default text without the Assistant, and makes no model call', async () => {
		const { tool, draftUrl } = await setup();
		isAvailable.mockResolvedValue(false);

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(200);

		expect(response.body.data).toMatchObject({
			status: 'not_available',
			tool: {
				toolName: tool.toolName,
				description: 'Reads the numbers of a campaign',
				draftSource: 'defaults',
			},
		});
		expect(draft).not.toHaveBeenCalled();
	});

	it('keeps the default text and reports the error when the draft breaks the rules', async () => {
		const { serverId, tool, draftUrl } = await setup();
		answer({ toolName: 'Get Numbers', description: 'Returns the numbers.' });

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(503);

		expect(response.body.message).toContain('tool name');
		const server = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(server.body.data.tools[0]).toMatchObject({
			toolName: tool.toolName,
			draftSource: 'defaults',
		});
	});

	it('answers 402 and keeps the text when the person has no Assistant credits left', async () => {
		const { serverId, tool, draftUrl } = await setup();
		draft.mockResolvedValueOnce({ status: 'no_credits' });

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(402);

		expect(response.body.message).toContain('credits');
		const server = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(server.body.data.tools[0]).toMatchObject({
			toolName: tool.toolName,
			draftSource: 'defaults',
		});
	});

	it('reports a failed model call', async () => {
		const { draftUrl } = await setup();
		draft.mockRejectedValueOnce(new Error('Invalid API key: sk-ant-api03-abcdefghijklmnopqrstuv'));

		const response = await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(503);
		expect(JSON.stringify(response.body)).not.toContain('sk-ant-');
	});

	it.each([
		['drafted', undefined, 'both'],
		['drafted', 'toolName', 'toolName'],
		['invalid_answer', 'description', 'description'],
		['model_failed', undefined, 'both'],
		['not_available', undefined, 'both'],
		['no_credits', undefined, 'both'],
	] as const)('sends the event "%s" for the field %s', async (status, field, eventField) => {
		const { serverId, draftUrl } = await setup();
		if (status === 'drafted') answer({ toolName: 'get_numbers', description: 'Gives numbers.' });
		if (status === 'invalid_answer') answer({ description: '' });
		if (status === 'model_failed') draft.mockRejectedValueOnce(new Error('rate limited'));
		if (status === 'not_available') isAvailable.mockResolvedValue(false);
		if (status === 'no_credits') draft.mockResolvedValueOnce({ status: 'no_credits' });
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		await testServer.authAgentFor(editor).post(draftUrl).send({ field });

		expect(emit).toHaveBeenCalledWith('mcp-server-tool-drafted', {
			serverId,
			userId: editor.id,
			source: 'ui',
			field: eventField,
			status,
		});
	});

	it('refuses a broken tool, makes no model call, and keeps the text', async () => {
		const { serverId, tool, workflowId, draftUrl } = await setup();
		await Container.get(WorkflowRepository).update(workflowId, {
			activeVersionId: null,
			active: false,
		});
		await Container.get(WorkflowPublishedVersionRepository).removePublishedVersion(workflowId);

		await testServer.authAgentFor(editor).post(draftUrl).send({}).expect(400);

		expect(draft).not.toHaveBeenCalled();
		const server = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);
		expect(server.body.data.tools[0]).toMatchObject({
			toolName: tool.toolName,
			description: tool.description,
			draftSource: 'defaults',
			brokenReason: 'not_published',
		});
	});

	it('refuses an unknown field', async () => {
		const { draftUrl } = await setup();

		await testServer.authAgentFor(editor).post(draftUrl).send({ field: 'inputs' }).expect(400);
		expect(draft).not.toHaveBeenCalled();
	});

	it('refuses a project viewer', async () => {
		const { draftUrl } = await setup();

		await testServer.authAgentFor(viewer).post(draftUrl).send({}).expect(403);
		expect(draft).not.toHaveBeenCalled();
	});
});

describe('GET /projects/:projectId/mcp-servers/:serverId', () => {
	it.each([true, false])(
		'says if the Assistant can write drafts for the user (%s)',
		async (available) => {
			const { serverId } = await setup();
			isAvailable.mockResolvedValue(available);

			const response = await testServer.authAgentFor(editor).get(base(serverId)).expect(200);

			expect(response.body.data.toolDraftsAvailable).toBe(available);
		},
	);
});
