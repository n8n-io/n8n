import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { McpServerTool } from '../database/entities/mcp-server-tool.entity';
import type { McpServerToolRepository } from '../database/repositories/mcp-server-tool.repository';
import { McpServerToolsService } from '../services/mcp-server-tools.service';
import type { McpServer } from '../database/entities/mcp-server.entity';
import type { McpServerRepository } from '../database/repositories/mcp-server.repository';
import { McpServerToolNameTakenError } from '../errors/mcp-server-tool-name-taken.error';
import { McpServerToolNotFoundError } from '../errors/mcp-server-tool-not-found.error';
import type { WorkflowToolListItem } from '../ports/workflow-tool.port';
import { mockMcpServerPorts } from './test-utils/ports';

const PROJECT_ID = 'project-1';
const SERVER_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a01';

function workflow(workflowId: string, name: string, description: string | null = null) {
	return { workflowId, name, description } satisfies WorkflowToolListItem;
}

function setup(workflows: WorkflowToolListItem[], unusable: string[] = [], added: string[] = []) {
	const servers = mock<McpServerRepository>();
	const tools = mock<McpServerToolRepository>();
	const { workflows: ports, textDrafts } = mockMcpServerPorts();
	servers.findInProject.mockResolvedValue(mock<McpServer>({ id: SERVER_ID }));
	tools.listByServer.mockResolvedValue(
		added.map((targetId) => mock<McpServerTool>({ targetId, kind: 'workflow' })),
	);
	ports.list.mockResolvedValue(workflows);
	ports.check.mockImplementation(async (_projectId, workflowId) =>
		unusable.includes(workflowId)
			? { callable: false, reason: 'not_published' }
			: { callable: true },
	);
	const service = new McpServerToolsService(
		servers,
		tools,
		ports,
		textDrafts,
		mock<EventService>(),
		mock<Logger>(),
	);
	return { service, ports };
}

describe('McpServerToolsService.findCandidates', () => {
	const many = Array.from({ length: 40 }, (_, i) =>
		workflow(`workflow-${i}`, `Workflow ${String(i).padStart(2, '0')}`),
	);

	it('checks only the workflows that it needs to fill the page', async () => {
		const { service, ports } = setup(many);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, { limit: 5 });

		expect(page.candidates.map(({ name }) => name)).toEqual([
			'Workflow 00',
			'Workflow 01',
			'Workflow 02',
			'Workflow 03',
			'Workflow 04',
		]);
		expect(page).toMatchObject({ unusable: 0, more: true });
		// One batch of 10 is enough for 5 rows and the proof of a sixth.
		expect(ports.check).toHaveBeenCalledTimes(10);
	});

	it('leaves out the workflows that cannot be a tool or are already tools, and counts only the first', async () => {
		const { service } = setup(
			[workflow('a', 'Alpha'), workflow('b', 'Bravo'), workflow('c', 'Charlie')],
			['b'],
			['c'],
		);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, { limit: 10 });

		expect(page.candidates).toEqual([
			{ workflowId: 'a', name: 'Alpha', description: null, reason: null },
		]);
		expect(page).toMatchObject({ unusable: 1, more: false });
	});

	it('leaves out a tool whose workflow the project no longer owns', async () => {
		const { service, ports } = setup([workflow('a', 'Alpha')], [], ['a']);
		ports.check.mockResolvedValue({ callable: false, reason: 'not_found' });

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, {
			limit: 10,
			includeUnusable: true,
		});

		expect(page.candidates).toEqual([]);
	});

	it('stops after 200 checks and says that more workflows exist', async () => {
		const unpublished = Array.from({ length: 500 }, (_, i) =>
			workflow(`w-${i}`, `Workflow ${String(i).padStart(3, '0')}`),
		);
		const { service, ports } = setup(
			unpublished,
			unpublished.map(({ workflowId }) => workflowId),
		);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, { limit: 1 });

		expect(ports.check).toHaveBeenCalledTimes(200);
		expect(page).toMatchObject({ candidates: [], unusable: 200, more: true });
	});

	it('lists the workflows that cannot be a tool, with the reason, on request', async () => {
		const { service } = setup([workflow('a', 'Alpha'), workflow('b', 'Bravo')], ['b']);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, {
			limit: 10,
			includeUnusable: true,
		});

		expect(page.candidates).toEqual([
			expect.objectContaining({ workflowId: 'a', reason: null }),
			expect.objectContaining({ workflowId: 'b', reason: 'not_published' }),
		]);
		expect(page.unusable).toBe(0);
	});

	it('matches the query on the name or the description, in any case', async () => {
		const { service, ports } = setup([
			workflow('a', 'Lead score'),
			workflow('b', 'Invoice', 'Scores the LEADS of a campaign'),
			workflow('c', 'Ticket history'),
		]);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, {
			query: 'lead',
			limit: 10,
		});

		expect(page.candidates.map(({ workflowId }) => workflowId)).toEqual(['b', 'a']);
		expect(ports.check).toHaveBeenCalledTimes(2);
	});
});

describe('McpServerToolsService reads for an approval card', () => {
	it('reads the names of the given workflows, with no check', async () => {
		const { service, ports } = setup([workflow('a', 'Alpha')]);

		await expect(service.workflowNames(PROJECT_ID, ['a'])).resolves.toEqual([
			{ workflowId: 'a', name: 'Alpha' },
		]);
		expect(ports.list).toHaveBeenCalledWith(PROJECT_ID, ['a']);
		expect(ports.check).not.toHaveBeenCalled();
	});
});

describe('McpServerToolsService.updateTool', () => {
	const TOOL_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a02';

	function setupTool() {
		const servers = mock<McpServerRepository>();
		const tools = mock<McpServerToolRepository>();
		const tool = mock<McpServerTool>({
			id: TOOL_ID,
			serverId: SERVER_ID,
			kind: 'workflow',
			targetId: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		servers.findInProject.mockResolvedValue(mock<McpServer>({ id: SERVER_ID }));
		tools.findInServer.mockResolvedValue(tool);
		tools.updateInServer.mockResolvedValue(tool);
		const { workflows, textDrafts } = mockMcpServerPorts();
		const service = new McpServerToolsService(
			servers,
			tools,
			workflows,
			textDrafts,
			mock<EventService>(),
			mock<Logger>(),
		);
		return { service, tools };
	}

	it('marks an edit of the builder as edited', async () => {
		const { service, tools } = setupTool();

		await service.updateTool(PROJECT_ID, SERVER_ID, TOOL_ID, { description: 'New' });

		expect(tools.updateInServer).toHaveBeenCalledWith(SERVER_ID, TOOL_ID, {
			description: 'New',
			draftSource: 'edited',
		});
	});

	it('keeps the draft source that the caller gives, such as ai for the Assistant', async () => {
		const { service, tools } = setupTool();

		await service.updateTool(PROJECT_ID, SERVER_ID, TOOL_ID, { description: 'New' }, 'ai');

		expect(tools.updateInServer).toHaveBeenCalledWith(SERVER_ID, TOOL_ID, {
			description: 'New',
			draftSource: 'ai',
		});
	});
});

describe('McpServerToolsService.draftTool saves a drafted name', () => {
	const TOOL_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a03';
	const ACTOR = { userId: 'user-1', source: 'ui' } as const;

	function setupDraft() {
		const servers = mock<McpServerRepository>();
		const tools = mock<McpServerToolRepository>();
		const { workflows, textDrafts } = mockMcpServerPorts();
		const tool = mock<McpServerTool>({
			id: TOOL_ID,
			serverId: SERVER_ID,
			kind: 'workflow',
			targetId: 'workflow-1',
			toolName: 'old_name',
			description: 'Old text.',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		servers.findInProject.mockResolvedValue(mock<McpServer>({ id: SERVER_ID }));
		tools.findInServer.mockResolvedValue(tool);
		tools.listByServer.mockResolvedValue([]);
		textDrafts.isAvailable.mockResolvedValue(true);
		textDrafts.draft.mockResolvedValue({
			status: 'drafted',
			text: JSON.stringify({ toolName: 'get_campaign', description: 'Returns one campaign.' }),
		});
		workflows.describe.mockResolvedValue({
			callable: true,
			name: 'Campaign',
			description: null,
			inputSchema: { type: 'object', additionalProperties: true },
			nodeNames: [],
		});
		const service = new McpServerToolsService(
			servers,
			tools,
			workflows,
			textDrafts,
			mock<EventService>(),
			mock<Logger>(),
		);
		const draft = async () =>
			await service.draftTool(mock<User>(), PROJECT_ID, SERVER_ID, TOOL_ID, ACTOR);
		return { draft, tools, tool };
	}

	it('tries again when another draft took the name first', async () => {
		const { draft, tools, tool } = setupDraft();
		const competing = mock<McpServerTool>({ id: 'other-tool', toolName: 'get_campaign' });
		tools.listByServer.mockResolvedValueOnce([]).mockResolvedValueOnce([tool, competing]);
		tools.updateInServer
			.mockRejectedValueOnce(new McpServerToolNameTakenError())
			.mockResolvedValueOnce(tool);

		await expect(draft()).resolves.toMatchObject({ status: 'drafted' });
		expect(tools.updateInServer).toHaveBeenCalledTimes(2);
		expect(tools.updateInServer).toHaveBeenNthCalledWith(
			1,
			SERVER_ID,
			TOOL_ID,
			expect.objectContaining({ toolName: 'get_campaign' }),
		);
		expect(tools.updateInServer).toHaveBeenNthCalledWith(
			2,
			SERVER_ID,
			TOOL_ID,
			expect.objectContaining({ toolName: 'get_campaign_2' }),
		);
	});

	it('does not try again on another conflict', async () => {
		const { draft, tools } = setupDraft();
		const conflict = new ConflictError('Another conflict');
		tools.updateInServer.mockRejectedValue(conflict);

		await expect(draft()).rejects.toBe(conflict);
		expect(tools.updateInServer).toHaveBeenCalledTimes(1);
	});

	it('stops after 10 tries when the name is taken each time', async () => {
		const { draft, tools } = setupDraft();
		tools.updateInServer.mockRejectedValue(new McpServerToolNameTakenError());

		await expect(draft()).rejects.toBeInstanceOf(McpServerToolNameTakenError);
		expect(tools.updateInServer).toHaveBeenCalledTimes(10);
	});

	it('gives a 404 when the tool is gone at save time', async () => {
		const { draft, tools } = setupDraft();
		tools.updateInServer.mockResolvedValue(null);

		await expect(draft()).rejects.toBeInstanceOf(McpServerToolNotFoundError);
		expect(tools.updateInServer).toHaveBeenCalledTimes(1);
	});
});
