import { mockLogger } from '@n8n/backend-test-utils';
import type { WebhookEntity, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import type {
	IConnections,
	IHttpRequestMethods,
	INode,
	INodeType,
	IWebhookData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WebhookRequest } from '@/webhooks/webhook.types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type {
	WorkflowPublishedDataService,
	PublishedWorkflowData,
} from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

jest.mock('@/webhooks/webhook-helpers');
jest.mock('@/workflow-execute-additional-data');

describe('LiveWebhooks', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const webhookService = mock<WebhookService>();
	const nodeTypes = mock<NodeTypes>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();

	let liveWebhooks: LiveWebhooks;

	beforeEach(() => {
		jest.clearAllMocks();
		liveWebhooks = new LiveWebhooks(
			mockLogger(),
			nodeTypes,
			webhookService,
			workflowRepository,
			workflowStaticDataService,
			workflowPublishedDataService,
		);

		// Mock WorkflowExecuteAdditionalData.getBase to avoid DI issues
		(WorkflowExecuteAdditionalData.getBase as jest.Mock).mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);
	});

	describe('executeWebhook', () => {
		it('should use published version nodes when executing webhook', async () => {
			const workflowId = 'workflow-1';
			const nodeName = 'Webhook';
			const webhookPath = 'test-webhook';
			const httpMethod: IHttpRequestMethods = 'GET';

			const createWebhookNode = (id: string, position: [number, number]): INode => ({
				id,
				name: nodeName,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position,
				parameters: { path: webhookPath, httpMethod },
			});

			const activeNodes = [createWebhookNode('webhook-node-active', [100, 200])];

			const publishedData: PublishedWorkflowData = {
				id: workflowId,
				name: 'Test Workflow',
				nodes: activeNodes,
				connections: {},
				staticData: undefined,
				settings: undefined,
				shared: [
					{ role: 'workflow:owner', projectId: 'project-1' } as PublishedWorkflowData['shared'][0],
				],
			};

			const workflowEntity = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				isArchived: false,
			});

			const webhookEntity = mock<WebhookEntity>({
				workflowId,
				node: nodeName,
				webhookPath,
				method: httpMethod,
				isDynamic: false,
			});

			const webhookNodeType = mock<INodeType>({
				description: { name: nodeName, properties: [] },
				webhook: jest.fn(),
			});

			const webhookData = mock<IWebhookData>({
				httpMethod,
				path: webhookPath,
				node: nodeName,
				webhookDescription: {},
				workflowId,
			});

			webhookService.findWebhook.mockResolvedValue(webhookEntity);
			webhookService.getWebhookMethods.mockResolvedValue([httpMethod]);
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue(publishedData);
			workflowRepository.findOne.mockResolvedValue(workflowEntity);
			nodeTypes.getByNameAndVersion.mockReturnValue(webhookNodeType);
			webhookService.getNodeWebhooks.mockReturnValue([webhookData]);

			let capturedNodes: INode[] = [];
			(WebhookHelpers.executeWebhook as jest.Mock).mockImplementation(
				(workflow: Workflow, ...args: unknown[]) => {
					capturedNodes = Object.values(workflow.nodes);
					const webhookCallback = args[args.length - 1] as (
						error: Error | null,
						data: object,
					) => void;
					void webhookCallback(null, {});
				},
			);

			const request = mock<WebhookRequest>({ method: httpMethod, params: { path: webhookPath } });

			await liveWebhooks.executeWebhook(request, mock<Response>());

			expect(capturedNodes[0].id).toBe('webhook-node-active');
		});

		it('should pass workflowData with published version nodes/connections to executeWebhook', async () => {
			const workflowId = 'workflow-1';
			const nodeName = 'Webhook';
			const webhookPath = 'test-webhook';
			const httpMethod: IHttpRequestMethods = 'POST';

			const createWebhookNode = (id: string, name: string): INode => ({
				id,
				name,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: { path: webhookPath, httpMethod },
			});

			const createSetNode = (id: string, name: string, value: string): INode => ({
				id,
				name,
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [200, 0],
				parameters: {
					assignments: {
						assignments: [{ name: 'version', value, type: 'string' }],
					},
				},
			});

			// Active version nodes
			const activeNodes = [
				createWebhookNode('webhook-node-active', 'Webhook'),
				createSetNode('set-node-active', 'Set Active', 'published-version'),
			];
			const activeConnections: IConnections = {
				Webhook: { main: [[{ node: 'Set Active', type: 'main' as const, index: 0 }]] },
			};

			const publishedData: PublishedWorkflowData = {
				id: workflowId,
				name: 'Test Workflow',
				nodes: activeNodes,
				connections: activeConnections,
				staticData: undefined,
				settings: undefined,
				shared: [
					{ role: 'workflow:owner', projectId: 'project-1' } as PublishedWorkflowData['shared'][0],
				],
			};

			const workflowEntity = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				isArchived: false,
			});

			const webhookEntity = mock<WebhookEntity>({
				workflowId,
				node: nodeName,
				webhookPath,
				method: httpMethod,
				isDynamic: false,
			});

			const webhookNodeType = mock<INodeType>({
				description: { name: nodeName, properties: [] },
				webhook: jest.fn(),
			});

			const webhookData = mock<IWebhookData>({
				httpMethod,
				path: webhookPath,
				node: nodeName,
				webhookDescription: {},
				workflowId,
			});

			webhookService.findWebhook.mockResolvedValue(webhookEntity);
			webhookService.getWebhookMethods.mockResolvedValue([httpMethod]);
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue(publishedData);
			workflowRepository.findOne.mockResolvedValue(workflowEntity as WorkflowEntity);
			nodeTypes.getByNameAndVersion.mockReturnValue(webhookNodeType);
			webhookService.getNodeWebhooks.mockReturnValue([webhookData]);

			let capturedWorkflowData: IWorkflowBase | undefined;
			(WebhookHelpers.executeWebhook as jest.Mock).mockImplementation(
				(
					_workflow: Workflow,
					_webhookData: IWebhookData,
					workflowData: IWorkflowBase,
					...args: unknown[]
				) => {
					capturedWorkflowData = workflowData;
					const webhookCallback = args[args.length - 1] as (
						error: Error | null,
						data: object,
					) => void;
					void webhookCallback(null, {});
				},
			);

			const request = mock<WebhookRequest>({ method: httpMethod, params: { path: webhookPath } });

			await liveWebhooks.executeWebhook(request, mock<Response>());

			// Verify that workflowData passed to executeWebhook has published version nodes/connections
			expect(capturedWorkflowData).toBeDefined();
			expect(capturedWorkflowData!.nodes).toHaveLength(2);
			expect(capturedWorkflowData!.nodes[0].id).toBe('webhook-node-active');
			expect(capturedWorkflowData!.nodes[1].id).toBe('set-node-active');
			expect(capturedWorkflowData!.connections).toEqual(activeConnections);
		});
	});
});
