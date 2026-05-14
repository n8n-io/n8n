import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { IConnections, INode } from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import { createPreviewWorkflowTool, previewWorkflow } from '../tools/preview-workflow.tool';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
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
	const instanceBaseUrl = 'http://localhost:5678';

	const createNodeTypes = () =>
		mockInstance(NodeTypes, {
			getByNameAndVersion: jest.fn((nodeType: string) => {
				if (nodeType === 'n8n-nodes-base.webhook') {
					return {
						description: {
							name: 'webhook',
							displayName: 'Webhook',
							iconUrl: 'icons/n8n-nodes-base/dist/nodes/Webhook/webhook.svg',
							group: ['trigger'],
							version: 1,
							description: 'Starts workflow on webhook calls',
							defaults: { name: 'Webhook' },
							inputs: [],
							outputs: [],
							properties: [],
						},
					};
				}

				return {
					description: {
						name: 'set',
						displayName: 'Set',
						icon: 'node:set',
						iconColor: 'purple',
						group: ['transform'],
						version: 1,
						description: 'Sets data',
						defaults: { name: 'Set' },
						inputs: [],
						outputs: [],
						properties: [],
					},
				};
			}),
		});

	it('creates tool with MCP Apps metadata', () => {
		const workflowFinderService = mockInstance(WorkflowFinderService);
		const telemetry = mockInstance(Telemetry);
		const nodeTypes = createNodeTypes();

		const tool = createPreviewWorkflowTool(
			user,
			workflowFinderService,
			telemetry,
			nodeTypes,
			instanceBaseUrl,
		);

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
		const nodeTypes = createNodeTypes();

		const output = await previewWorkflow(
			'wf-1',
			user,
			workflowFinderService,
			nodeTypes,
			instanceBaseUrl,
		);

		expect(output).toEqual({
			workflowId: 'wf-1',
			workflowUrl: 'http://localhost:5678/workflow/wf-1',
			name: 'My wf',
			nodes: [
				{
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					icon: {
						type: 'file',
						src: 'http://localhost:5678/icons/n8n-nodes-base/dist/nodes/Webhook/webhook.svg',
					},
					position: [10, 20],
				},
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
					icon: { type: 'icon', name: 'node:set', color: 'purple' },
					position: [320, 20],
				},
			],
			connections,
		});
		expect(JSON.stringify(output)).not.toContain('credentials');
		expect(JSON.stringify(output)).not.toContain('parameters');
	});

	it('inlines locally resolved file icons for MCP app clients', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes, connections })),
		});
		const nodeTypes = createNodeTypes();
		const resolveIcon = jest.fn().mockReturnValue(__filename);

		const output = await previewWorkflow(
			'wf-1',
			user,
			workflowFinderService,
			nodeTypes,
			instanceBaseUrl,
			{ resolveIcon } as unknown as LoadNodesAndCredentials,
		);
		const [webhookNode] = output.nodes;

		expect(webhookNode.icon.type).toBe('file');
		if (webhookNode.icon.type !== 'file') throw new Error('Expected webhook icon to be a file');
		expect(webhookNode.icon.src).toMatch(/^data:image\/svg\+xml;base64,/);
		expect(resolveIcon).toHaveBeenCalledWith(
			'n8n-nodes-base',
			'/icons/n8n-nodes-base/dist/nodes/Webhook/webhook.svg',
		);
	});

	it('includes display-safe sticky note dimensions and content', async () => {
		const stickyNode: INode = {
			id: 'sticky-1',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-100, -80],
			parameters: {
				width: 360,
				height: 220,
				content: '## Daily Email Digest',
				color: 4,
			},
		};
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes: [stickyNode] })),
		});
		const nodeTypes = createNodeTypes();

		const output = await previewWorkflow(
			'wf-1',
			user,
			workflowFinderService,
			nodeTypes,
			instanceBaseUrl,
		);

		expect(output.nodes[0]).toEqual(
			expect.objectContaining({
				display: {
					variant: 'stickyNote',
					width: 360,
					height: 220,
					content: '## Daily Email Digest',
					color: 4,
				},
				position: [-100, -80],
			}),
		);
		expect(JSON.stringify(output)).not.toContain('parameters');
	});

	it('handler returns a summary and tracks telemetry', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes, connections })),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const nodeTypes = createNodeTypes();
		const tool = createPreviewWorkflowTool(
			user,
			workflowFinderService,
			telemetry,
			nodeTypes,
			instanceBaseUrl,
		);

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
