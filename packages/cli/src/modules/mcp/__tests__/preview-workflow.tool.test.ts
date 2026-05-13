import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { IConnections, INode } from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import { createPreviewWorkflowTool, previewWorkflow } from '../tools/preview-workflow.tool';

import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('preview-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const nodes: INode[] = [
		{
			id: 'node-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [10, 20],
			parameters: { path: 'secret-path' },
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' } },
		},
		{
			id: 'node-2',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [320, 20],
			parameters: { value: 'hidden' },
		},
	];

	const connections: IConnections = {
		Webhook: {
			main: [[{ node: 'Set', type: 'main', index: 0 }], null],
		},
	};

	it('creates tool with MCP Apps metadata', () => {
		const workflowFinderService = mockInstance(WorkflowFinderService);
		const telemetry = mockInstance(Telemetry);

		const tool = createPreviewWorkflowTool(user, workflowFinderService, telemetry);

		expect(tool.name).toBe('preview_workflow');
		expect(tool.config._meta).toEqual({
			ui: { resourceUri: 'ui://workflow-diagram/workflow-diagram.html' },
		});
		expect(tool.config.annotations).toEqual(
			expect.objectContaining({ readOnlyHint: true, idempotentHint: true, openWorldHint: false }),
		);
	});

	it('returns workflow preview data without node parameters or credentials', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes, connections })),
		});

		const output = await previewWorkflow('wf-1', user, workflowFinderService);

		expect(output).toEqual({
			workflowId: 'wf-1',
			name: 'My wf',
			nodes: [
				{ name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [10, 20] },
				{ name: 'Set', type: 'n8n-nodes-base.set', position: [320, 20] },
			],
			connections,
		});
		expect(JSON.stringify(output)).not.toContain('credentials');
		expect(JSON.stringify(output)).not.toContain('parameters');
	});

	it('handler returns a summary and tracks telemetry', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes, connections })),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const tool = createPreviewWorkflowTool(user, workflowFinderService, telemetry);

		const result = await tool.handler({ workflowId: 'wf-1' }, {} as never);

		expect(result.content).toEqual([{ type: 'text', text: 'Showing workflow My wf (2 nodes)' }]);
		expect(result.structuredContent).toEqual(
			expect.objectContaining({ workflowId: 'wf-1', name: 'My wf' }),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				tool_name: 'preview_workflow',
				results: expect.objectContaining({ success: true }),
			}),
		);
	});
});
