import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { McpServerTool } from '../mcp-server-tool.entity';
import type { McpServerToolRepository } from '../mcp-server-tool.repository';
import { McpServerToolsService } from '../mcp-server-tools.service';
import type { McpServer } from '../mcp-server.entity';
import type { McpServerRepository } from '../mcp-server.repository';
import type { TextDraftPort } from '../tools/text-draft-port';
import type { WorkflowToolListItem, WorkflowToolPort } from '../tools/workflow-tool-port';

const PROJECT_ID = 'project-1';
const SERVER_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a01';

function workflow(workflowId: string, name: string, description: string | null = null) {
	return { workflowId, name, description } satisfies WorkflowToolListItem;
}

function setup(workflows: WorkflowToolListItem[], unusable: string[] = [], added: string[] = []) {
	const servers = mock<McpServerRepository>();
	const tools = mock<McpServerToolRepository>();
	const ports = mock<WorkflowToolPort>();
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
		mock<TextDraftPort>(),
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

	it('leaves out the workflows that cannot be a tool, and counts them', async () => {
		const { service } = setup(
			[workflow('a', 'Alpha'), workflow('b', 'Bravo'), workflow('c', 'Charlie')],
			['b'],
			['c'],
		);

		const page = await service.findCandidates(PROJECT_ID, SERVER_ID, { limit: 10 });

		expect(page.candidates).toEqual([
			{ workflowId: 'a', name: 'Alpha', description: null, reason: null },
		]);
		expect(page).toMatchObject({ unusable: 2, more: false });
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
