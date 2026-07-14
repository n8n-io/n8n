import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowsConfig } from '@n8n/config';
import type { WebhookEntity, WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
import type { Response } from 'express';
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
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import type { NodeTypes } from '@/node-types';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WebhookRequest } from '@/webhooks/webhook.types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

vi.mock('@/webhooks/webhook-helpers');
vi.mock('@/workflow-execute-additional-data');

const WORKFLOW_ID = 'workflow-1';
const NODE_NAME = 'Webhook';
const WEBHOOK_PATH = 'test-webhook';

describe('LiveWebhooks', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const webhookService = mock<WebhookService>();
	const nodeTypes = mock<NodeTypes>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService: false });
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();

	let liveWebhooks: LiveWebhooks;

	beforeEach(() => {
		vi.clearAllMocks();
		liveWebhooks = new LiveWebhooks(
			mockLogger(),
			nodeTypes,
			webhookService,
			workflowRepository,
			workflowStaticDataService,
			workflowsConfig,
			workflowPublishedDataService,
		);

		// Mock WorkflowExecuteAdditionalData.getBase to avoid DI issues
		(WorkflowExecuteAdditionalData.getBase as Mock).mockResolvedValue(
			mock<IWorkflowExecuteAdditionalData>(),
		);
	});

	/**
	 * Wires up the standard `executeWebhook` mock setup (`findWebhook`,
	 * `getWebhookMethods`, `findOne`, `getByNameAndVersion`, `getNodeWebhooks`,
	 * and the `WebhookHelpers.executeWebhook` shim that drives the callback).
	 *
	 * Callers supply the `workflowEntity` for the case they're exercising and
	 * optionally an `onExecuteWebhook` hook to capture what the shim sees.
	 */
	function setupExecuteWebhookMocks(
		workflowEntity: WorkflowEntity,
		{
			httpMethod = 'GET',
			onExecuteWebhook,
		}: {
			httpMethod?: IHttpRequestMethods;
			onExecuteWebhook?: (args: {
				workflow: Workflow;
				webhookData: IWebhookData;
				workflowData: IWorkflowBase;
			}) => void;
		} = {},
	): WebhookRequest {
		const webhookEntity = mock<WebhookEntity>({
			workflowId: WORKFLOW_ID,
			node: NODE_NAME,
			webhookPath: WEBHOOK_PATH,
			method: httpMethod,
			isDynamic: false,
		});

		const webhookNodeType = mock<INodeType>({
			description: { name: NODE_NAME, properties: [] },
			webhook: vi.fn(),
		});

		const webhookData = mock<IWebhookData>({
			httpMethod,
			path: WEBHOOK_PATH,
			node: NODE_NAME,
			webhookDescription: { nodeType: undefined } as never,
			workflowId: WORKFLOW_ID,
		});

		webhookService.findWebhook.mockResolvedValue(webhookEntity);
		webhookService.getWebhookMethods.mockResolvedValue([httpMethod]);
		workflowRepository.findOne.mockResolvedValue(workflowEntity);
		nodeTypes.getByNameAndVersion.mockReturnValue(webhookNodeType);
		webhookService.getNodeWebhooks.mockReturnValue([webhookData]);

		(WebhookHelpers.executeWebhook as Mock).mockImplementation(
			// eslint-disable-next-line @typescript-eslint/require-await
			async (
				workflow: Workflow,
				wd: IWebhookData,
				workflowData: IWorkflowBase,
				...args: unknown[]
			) => {
				onExecuteWebhook?.({ workflow, webhookData: wd, workflowData });
				const webhookCallback = args[args.length - 1] as (
					error: Error | null,
					data: object,
				) => void;
				void webhookCallback(null, {});
			},
		);

		return mock<WebhookRequest>({
			method: httpMethod,
			params: { path: WEBHOOK_PATH },
		});
	}

	describe('executeWebhook', () => {
		it('should use active version nodes when executing webhook', async () => {
			const httpMethod: IHttpRequestMethods = 'GET';

			const createWebhookNode = (id: string, position: [number, number]): INode => ({
				id,
				name: NODE_NAME,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position,
				parameters: { path: WEBHOOK_PATH, httpMethod },
			});

			const draftNodes = [createWebhookNode('webhook-node-draft', [0, 0])];
			const activeNodes = [createWebhookNode('webhook-node-active', [100, 200])];

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId: WORKFLOW_ID,
				nodes: activeNodes,
				connections: {},
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				name: 'Test Workflow',
				active: true,
				activeVersionId: activeVersion.versionId,
				nodes: draftNodes,
				connections: {},
				staticData: {},
				activeVersion,
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
			});

			let capturedNodes: INode[] = [];
			const request = setupExecuteWebhookMocks(workflowEntity, {
				httpMethod,
				onExecuteWebhook: ({ workflow }) => {
					capturedNodes = Object.values(workflow.nodes);
				},
			});

			await liveWebhooks.executeWebhook(request, mock<Response>());

			expect(capturedNodes[0].id).toBe('webhook-node-active');
		});

		it('should pass workflowData with activeVersion nodes/connections to executeWebhook', async () => {
			const httpMethod: IHttpRequestMethods = 'POST';

			const createWebhookNode = (id: string, name: string): INode => ({
				id,
				name,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: { path: WEBHOOK_PATH, httpMethod },
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
				workflowId: WORKFLOW_ID,
				nodes: activeNodes,
				connections: activeConnections,
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				nodes: draftNodes,
				connections: draftConnections,
				staticData: {},
				activeVersion,
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
			});

			let capturedWorkflowData: IWorkflowBase | undefined;
			const request = setupExecuteWebhookMocks(workflowEntity, {
				httpMethod,
				onExecuteWebhook: ({ workflowData }) => {
					capturedWorkflowData = workflowData;
				},
			});

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

		it('rejects (does not hang) when executeWebhook throws before invoking the callback', async () => {
			const webhookNode: INode = {
				id: 'webhook-node',
				name: NODE_NAME,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: { path: WEBHOOK_PATH, httpMethod: 'GET' },
			};

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId: WORKFLOW_ID,
				nodes: [webhookNode],
				connections: {},
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				name: 'Test Workflow',
				active: true,
				activeVersionId: activeVersion.versionId,
				nodes: [webhookNode],
				connections: {},
				staticData: {},
				activeVersion,
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
			});

			const request = setupExecuteWebhookMocks(workflowEntity);
			const preCallbackError = new Error('response option expression failed');
			(WebhookHelpers.executeWebhook as Mock).mockRejectedValue(preCallbackError);

			await expect(liveWebhooks.executeWebhook(request, mock<Response>())).rejects.toBe(
				preCallbackError,
			);
		});
	});

	describe('executeWebhook (with publication service)', () => {
		beforeEach(() => {
			Object.assign(workflowsConfig, { useWorkflowPublicationService: true });
		});

		afterEach(() => {
			Object.assign(workflowsConfig, { useWorkflowPublicationService: false });
		});

		it('should use published version nodes when executing webhook', async () => {
			const activeNodes: INode[] = [
				{
					id: 'webhook-node-active',
					name: NODE_NAME,
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [100, 200],
					parameters: { path: WEBHOOK_PATH, httpMethod: 'GET' },
				},
			];

			const workflowEntity = mock<WorkflowEntity>({
				id: WORKFLOW_ID,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				isArchived: false,
				staticData: {},
				shared: [{ role: 'workflow:owner', project: { id: 'project-1', projectRelations: [] } }],
			});

			const publishedVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId: WORKFLOW_ID,
				nodes: activeNodes,
				connections: {},
			});
			workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue({
				workflow: workflowEntity,
				publishedVersion,
			});

			let capturedNodes: INode[] = [];
			const request = setupExecuteWebhookMocks(workflowEntity, {
				onExecuteWebhook: ({ workflow }) => {
					capturedNodes = Object.values(workflow.nodes);
				},
			});

			await liveWebhooks.executeWebhook(request, mock<Response>());

			expect(capturedNodes[0].id).toBe('webhook-node-active');
		});
	});

	describe('findAccessControlOptions', () => {
		const httpMethod: IHttpRequestMethods = 'GET';

		const buildWebhookNode = (id: string, allowedOrigins: string): INode => ({
			id,
			name: NODE_NAME,
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				path: WEBHOOK_PATH,
				httpMethod,
				options: { allowedOrigins },
			},
		});

		const setupFindAccessControlMocks = (workflowEntity: WorkflowEntity | null) => {
			const webhookEntity = mock<WebhookEntity>({
				workflowId: WORKFLOW_ID,
				node: NODE_NAME,
				webhookPath: WEBHOOK_PATH,
				method: httpMethod,
				isDynamic: false,
			});

			webhookService.findWebhook.mockResolvedValue(webhookEntity);
			webhookService.getWebhookMethods.mockResolvedValue([httpMethod]);
			workflowRepository.findOne.mockResolvedValue(workflowEntity);
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { name: NODE_NAME, properties: [] },
					webhook: vi.fn(),
				}),
			);
		};

		it('returns access control options from the active version, not the draft', async () => {
			const draftOrigin = 'https://draft.example.com';
			const activeOrigin = 'https://active.example.com';

			const workflowEntity = {
				id: WORKFLOW_ID,
				activeVersionId: 'v1',
				nodes: [buildWebhookNode('webhook-node-draft', draftOrigin)],
				activeVersion: {
					versionId: 'v1',
					workflowId: WORKFLOW_ID,
					nodes: [buildWebhookNode('webhook-node-active', activeOrigin)],
					connections: {},
				},
			} as unknown as WorkflowEntity;

			setupFindAccessControlMocks(workflowEntity);

			const result = await liveWebhooks.findAccessControlOptions(WEBHOOK_PATH, httpMethod);

			expect(result).toEqual({ allowedOrigins: activeOrigin });
			expect(workflowRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ relations: { activeVersion: true } }),
			);
		});

		it('returns undefined when the workflow has no active version', async () => {
			const workflowEntity = {
				id: WORKFLOW_ID,
				activeVersionId: null,
				nodes: [buildWebhookNode('webhook-node-draft', 'https://draft.example.com')],
				activeVersion: null,
			} as unknown as WorkflowEntity;

			setupFindAccessControlMocks(workflowEntity);

			const result = await liveWebhooks.findAccessControlOptions(WEBHOOK_PATH, httpMethod);

			expect(result).toBeUndefined();
		});
	});

	describe('route family scoping', () => {
		const workflowId = 'workflow-1';
		const nodeName = 'Trigger';
		const webhookPath = 'my-path';
		const httpMethod: IHttpRequestMethods = 'GET';

		const setupMocks = (
			declaredNodeType: 'form' | 'webhook' | 'mcp' | undefined,
			nodeTypeName = 'n8n-nodes-base.webhook',
		) => {
			const node: INode = {
				id: 'trigger-node',
				name: nodeName,
				type: nodeTypeName,
				typeVersion: 1,
				position: [0, 0],
				parameters: { path: webhookPath, httpMethod },
			};

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId,
				nodes: [node],
				connections: {},
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: workflowId,
				name: 'Test Workflow',
				active: true,
				activeVersionId: 'v1',
				nodes: [node],
				connections: {},
				staticData: {},
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
				description: {
					name: nodeTypeName,
					properties: [],
					webhooks: [{ nodeType: declaredNodeType, name: 'default' } as never],
				},
				webhook: vi.fn(),
			});

			const webhookData = mock<IWebhookData>({
				httpMethod,
				path: webhookPath,
				node: nodeName,
				webhookDescription: { nodeType: declaredNodeType } as never,
				workflowId,
			});

			webhookService.findWebhook.mockResolvedValue(webhookEntity);
			webhookService.getWebhookMethods.mockResolvedValue([httpMethod]);
			workflowRepository.findOne.mockResolvedValue(workflowEntity);
			nodeTypes.getByNameAndVersion.mockReturnValue(webhookNodeType);
			webhookService.getNodeWebhooks.mockReturnValue([webhookData]);

			// eslint-disable-next-line @typescript-eslint/require-await
			(WebhookHelpers.executeWebhook as Mock).mockImplementation(async (...args: unknown[]) => {
				const webhookCallback = args[args.length - 1] as (
					error: Error | null,
					data: object,
				) => void;
				void webhookCallback(null, {});
			});
		};

		const buildRequest = () =>
			mock<WebhookRequest>({ method: httpMethod, params: { path: webhookPath } });

		it('executes a form trigger on the form route family', async () => {
			setupMocks('form', 'n8n-nodes-base.formTrigger');

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'form'),
			).resolves.toBeDefined();
		});

		it('returns a not-found error when a form trigger is requested on the webhook route family', async () => {
			setupMocks('form', 'n8n-nodes-base.formTrigger');

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'webhook'),
			).rejects.toBeInstanceOf(WebhookNotFoundError);
		});

		it('executes a regular webhook on the webhook route family', async () => {
			setupMocks(undefined);

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'webhook'),
			).resolves.toBeDefined();
		});

		it('returns a not-found error when a regular webhook is requested on the form route family', async () => {
			setupMocks(undefined);

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'form'),
			).rejects.toBeInstanceOf(WebhookNotFoundError);
		});

		it('executes an mcp trigger on the mcp route family', async () => {
			setupMocks('mcp', '@n8n/n8n-nodes-langchain.mcpTrigger');

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'mcp'),
			).resolves.toBeDefined();
		});

		it('returns a not-found error when an mcp trigger is requested on the form route family', async () => {
			setupMocks('mcp', '@n8n/n8n-nodes-langchain.mcpTrigger');

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>(), 'form'),
			).rejects.toBeInstanceOf(WebhookNotFoundError);
		});

		it('executes without family scoping when expectedNodeType is not provided', async () => {
			setupMocks('form', 'n8n-nodes-base.formTrigger');

			await expect(
				liveWebhooks.executeWebhook(buildRequest(), mock<Response>()),
			).resolves.toBeDefined();
		});
	});
});
