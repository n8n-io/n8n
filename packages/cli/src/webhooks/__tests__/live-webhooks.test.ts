import { mockLogger } from '@n8n/backend-test-utils';
import type { WebhookEntity, WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
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
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

jest.mock('@/webhooks/webhook-helpers');
jest.mock('@/workflow-execute-additional-data');

describe('LiveWebhooks', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const webhookService = mock<WebhookService>();
	const nodeTypes = mock<NodeTypes>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();

	let liveWebhooks: LiveWebhooks;

	beforeEach(() => {
		jest.clearAllMocks();
		liveWebhooks = new LiveWebhooks(
			mockLogger(),
			nodeTypes,
			webhookService,
			workflowRepository,
			workflowStaticDataService,
		);

		// Mock WorkflowExecuteAdditionalData.getBase to avoid DI issues
		(WorkflowExecuteAdditionalData.getBase as jest.Mock).mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);
	});

	describe('executeWebhook', () => {
		it('should use active version nodes when executing webhook', async () => {
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

			const draftNodes = [createWebhookNode('webhook-node-draft', [0, 0])];
			const activeNodes = [createWebhookNode('webhook-node-active', [100, 200])];

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId,
				nodes: activeNodes,
				connections: {},
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: activeVersion.versionId,
				nodes: draftNodes,
				connections: {},
				activeVersion,
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
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

		it('should pass workflowData with activeVersion nodes/connections to executeWebhook', async () => {
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

			// Draft version has different nodes than active version
			const draftNodes = [
				createWebhookNode('webhook-node-draft', 'Webhook'),
				createSetNode('set-node-draft', 'Set Draft', 'draft-version'),
			];
			const draftConnections: IConnections = {
				Webhook: { main: [[{ node: 'Set Draft', type: 'main' as const, index: 0 }]] },
			};

			// Active version nodes
			const activeNodes = [
				createWebhookNode('webhook-node-active', 'Webhook'),
				createSetNode('set-node-active', 'Set Active', 'published-version'),
			];
			const activeConnections: IConnections = {
				Webhook: { main: [[{ node: 'Set Active', type: 'main' as const, index: 0 }]] },
			};

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId,
				nodes: activeNodes,
				connections: activeConnections,
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				nodes: draftNodes,
				connections: draftConnections,
				activeVersion,
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
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

			// Verify that workflowData passed to executeWebhook has activeVersion nodes/connections
			expect(capturedWorkflowData).toBeDefined();
			expect(capturedWorkflowData!.nodes).toHaveLength(2);
			expect(capturedWorkflowData!.nodes[0].id).toBe('webhook-node-active');
			expect(capturedWorkflowData!.nodes[1].id).toBe('set-node-active');
			expect(capturedWorkflowData!.connections).toEqual(activeConnections);

			// Verify it does NOT have draft nodes
			expect(capturedWorkflowData!.nodes[0].id).not.toBe('webhook-node-draft');
			expect(capturedWorkflowData!.nodes[1].id).not.toBe('set-node-draft');
		});
	});
});
