import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { createGetWorkflowVersionTool } from '../tools/get-workflow-version.tool';

const nodeWithCredentials: INode = {
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [0, 0],
	parameters: { url: 'https://example.com' },
	credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Secret' } },
};

describe('get-workflow-version MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowHistoryService: WorkflowHistoryService;
	let telemetry: Telemetry;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowHistoryService = mockInstance(WorkflowHistoryService);
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
	});

	const buildTool = () =>
		createGetWorkflowVersionTool(user, workflowFinderService, workflowHistoryService, telemetry);

	const callContext = {} as Parameters<ReturnType<typeof buildTool>['handler']>[1];

	describe('smoke tests', () => {
		test('creates tool correctly', () => {
			const tool = buildTool();

			expect(tool.name).toBe('get_workflow_version');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations?.readOnlyHint).toBe(true);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('returns version content with credentials stripped from nodes', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockResolvedValue(
				createWorkflowHistoryVersion({
					workflowId: 'wf-1',
					versionId: 'v1',
					nodes: [nodeWithCredentials],
					connections: { 'HTTP Request': { main: [] } },
					nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-1'] }],
				}),
			);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			const content = result.structuredContent as { nodes: Array<Record<string, unknown>> };
			expect(content).toMatchObject({
				versionId: 'v1',
				workflowId: 'wf-1',
				connections: { 'HTTP Request': { main: [] } },
				nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-1'] }],
			});
			expect(content.nodes).toHaveLength(1);
			expect(content.nodes[0]).not.toHaveProperty('credentials');
			expect(content.nodes[0]).toMatchObject({ name: 'HTTP Request' });
		});

		test('returns a structured friendly error when the version is not found', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockRejectedValue(
				new WorkflowHistoryVersionNotFoundError(''),
			);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'missing' }, callContext);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				versionId: 'missing',
				nodes: [],
				nodeGroups: [],
			});
			expect((result.structuredContent as { error: string }).error).toContain(
				"Version 'missing' was not found for this workflow",
			);
		});

		test('returns a structured error when the workflow is not accessible', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				versionId: 'v1',
				error: "Workflow not found or you don't have permission to access it.",
			});
			expect(workflowHistoryService.getVersion).not.toHaveBeenCalled();
		});
	});
});
