import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionRepository, User, type IExecutionResponse } from '@n8n/db';
import type { IConnections, INode, ITaskData } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import {
	createPreviewWorkflowExecutionTool,
	previewWorkflowExecution,
} from '../tools/preview-workflow-execution.tool';
import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

describe('preview-workflow-execution MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const instanceBaseUrl = 'http://localhost:5678';

	const snapshotNodes: INode[] = [
		{
			id: 'node-1',
			name: 'Snapshot Trigger',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [10, 20],
			parameters: { path: 'secret-path' },
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' } },
		},
		{
			id: 'node-2',
			name: 'Snapshot Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [320, 20],
			parameters: { value: 'hidden' },
		},
		{
			id: 'node-3',
			name: 'Unexecuted Node',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [620, 20],
			parameters: { value: 'not-run' },
		},
	];

	const currentNodes: INode[] = [
		{
			id: 'current-node',
			name: 'Current Workflow Node',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	];

	const snapshotConnections: IConnections = {
		'Snapshot Trigger': {
			main: [[{ node: 'Snapshot Set', type: 'main', index: 0 }]],
		},
		'Snapshot Set': {
			main: [[{ node: 'Unexecuted Node', type: 'main', index: 0 }]],
		},
	};

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

	const createExecution = (overrides: Partial<IExecutionResponse> = {}): IExecutionResponse => {
		const executionData = createEmptyRunExecutionData();
		executionData.resultData.runData = {
			'Snapshot Trigger': [
				{
					executionIndex: 0,
					startTime: 0,
					executionTime: 10,
					source: [],
					executionStatus: 'success',
					data: { main: [[{ json: { ok: true } }]] },
				},
			],
			'Snapshot Set': [
				{
					executionIndex: 1,
					startTime: 10,
					executionTime: 4,
					source: [],
					executionStatus: 'error',
					error: { message: 'Something failed' } as ITaskData['error'],
				},
			],
		};

		return {
			id: 'exec-1',
			workflowId: 'wf-1',
			mode: 'manual',
			status: 'error',
			startedAt: new Date('2025-01-01T00:00:00.000Z'),
			stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
			waitTill: null,
			finished: true,
			createdAt: new Date('2025-01-01T00:00:00.000Z'),
			storedAt: 'db',
			data: executionData,
			workflowData: {
				...createWorkflow({
					nodes: snapshotNodes,
					connections: snapshotConnections,
				}),
				name: 'Snapshot wf',
			},
			customData: {},
			annotation: { tags: [] },
			...overrides,
		} as IExecutionResponse;
	};

	it('creates tool with MCP Apps metadata', () => {
		const executionRepository = mockInstance(ExecutionRepository);
		const workflowFinderService = mockInstance(WorkflowFinderService);
		const telemetry = mockInstance(Telemetry);
		const nodeTypes = createNodeTypes();

		const tool = createPreviewWorkflowExecutionTool(
			user,
			executionRepository,
			workflowFinderService,
			telemetry,
			nodeTypes,
			instanceBaseUrl,
		);

		expect(tool.name).toBe('preview_workflow_execution');
		expect(tool.config._meta).toEqual({
			ui: { resourceUri: 'ui://workflow-diagram/workflow-diagram.html' },
		});
		expect(tool.config.annotations).toEqual(
			expect.objectContaining({ readOnlyHint: true, idempotentHint: true, openWorldHint: false }),
		);
	});

	it('returns a display-safe execution snapshot with node outcomes', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(
				createWorkflow({
					nodes: currentNodes,
					name: 'Current wf',
				}),
			),
		});
		const executionRepository = mockInstance(ExecutionRepository, {
			findWithUnflattenedData: jest.fn().mockResolvedValue(createExecution()),
		});
		const nodeTypes = createNodeTypes();

		const output = await previewWorkflowExecution(
			'wf-1',
			'exec-1',
			user,
			executionRepository,
			workflowFinderService,
			nodeTypes,
			instanceBaseUrl,
		);

		expect(output).toEqual(
			expect.objectContaining({
				workflowId: 'wf-1',
				workflowUrl: 'http://localhost:5678/workflow/wf-1/executions/exec-1',
				name: 'Snapshot wf',
				execution: {
					id: 'exec-1',
					workflowId: 'wf-1',
					mode: 'manual',
					status: 'error',
					startedAt: '2025-01-01T00:00:00.000Z',
					stoppedAt: '2025-01-01T00:01:00.000Z',
					waitTill: null,
				},
				connections: snapshotConnections,
			}),
		);
		expect(output.nodes.map((node) => node.name)).toEqual([
			'Snapshot Trigger',
			'Snapshot Set',
			'Unexecuted Node',
		]);
		expect(output.nodes).toEqual([
			expect.objectContaining({ name: 'Snapshot Trigger', executionStatus: 'success' }),
			expect.objectContaining({ name: 'Snapshot Set', executionStatus: 'error' }),
			expect.not.objectContaining({ executionStatus: expect.any(String) }),
		]);
		expect(JSON.stringify(output)).not.toContain('runData');
		expect(JSON.stringify(output)).not.toContain('secret-path');
		expect(JSON.stringify(output)).not.toContain('Header Auth');
		expect(JSON.stringify(output)).not.toContain('hidden');
	});

	it('inlines locally resolved file icons for execution previews', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes: currentNodes })),
		});
		const executionRepository = mockInstance(ExecutionRepository, {
			findWithUnflattenedData: jest.fn().mockResolvedValue(createExecution()),
		});
		const nodeTypes = createNodeTypes();
		const resolveIcon = jest.fn().mockReturnValue(__filename);

		const output = await previewWorkflowExecution(
			'wf-1',
			'exec-1',
			user,
			executionRepository,
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

	it('omits neutral statuses for non-final node runs', async () => {
		const execution = createExecution();
		execution.data.resultData.runData['Unexecuted Node'] = [
			{
				executionIndex: 2,
				startTime: 14,
				executionTime: 0,
				source: [],
				executionStatus: 'running',
			},
		];
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes: currentNodes })),
		});
		const executionRepository = mockInstance(ExecutionRepository, {
			findWithUnflattenedData: jest.fn().mockResolvedValue(execution),
		});
		const nodeTypes = createNodeTypes();

		const output = await previewWorkflowExecution(
			'wf-1',
			'exec-1',
			user,
			executionRepository,
			workflowFinderService,
			nodeTypes,
			instanceBaseUrl,
		);

		expect(output.nodes.find((node) => node.name === 'Unexecuted Node')).not.toHaveProperty(
			'executionStatus',
		);
	});

	it('handler returns a summary and tracks success telemetry', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes: currentNodes })),
		});
		const executionRepository = mockInstance(ExecutionRepository, {
			findWithUnflattenedData: jest.fn().mockResolvedValue(createExecution()),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const nodeTypes = createNodeTypes();
		const tool = createPreviewWorkflowExecutionTool(
			user,
			executionRepository,
			workflowFinderService,
			telemetry,
			nodeTypes,
			instanceBaseUrl,
		);

		const result = await tool.handler({ workflowId: 'wf-1', executionId: 'exec-1' }, {} as never);

		expect(result.content).toEqual([
			{
				type: 'text',
				text: 'Showing execution exec-1 for workflow Snapshot wf (1 successful, 1 failed nodes)',
			},
		]);
		expect(result.structuredContent).toEqual(
			expect.objectContaining({ workflowId: 'wf-1', name: 'Snapshot wf' }),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'preview_workflow_execution',
				results: expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						execution_id: 'exec-1',
						successful_node_count: 1,
						failed_node_count: 1,
					}),
				}),
			}),
		);
	});

	it('handler returns an MCP error result and tracks failure telemetry when execution is missing', async () => {
		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue(createWorkflow({ nodes: currentNodes })),
		});
		const executionRepository = mockInstance(ExecutionRepository, {
			findWithUnflattenedData: jest.fn().mockResolvedValue(undefined),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const nodeTypes = createNodeTypes();
		const tool = createPreviewWorkflowExecutionTool(
			user,
			executionRepository,
			workflowFinderService,
			telemetry,
			nodeTypes,
			instanceBaseUrl,
		);

		const result = await tool.handler({ workflowId: 'wf-1', executionId: 'missing' }, {} as never);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: "Execution 'missing' not found for workflow 'wf-1'",
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'preview_workflow_execution',
				results: {
					success: false,
					error: "Execution 'missing' not found for workflow 'wf-1'",
					error_reason: 'execution_not_found',
				},
			}),
		);
	});
});
