import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { agent as testAgent } from 'supertest';
import type SuperAgentTest from 'supertest/lib/agent';

import { ExternalHooks } from '@/external-hooks';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WaitingForms } from '@/webhooks/waiting-forms';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import { WebhookServer } from '@/webhooks/webhook-server';
import type { IWebhookResponseCallbackData } from '@/webhooks/webhook.types';
import { mockInstance } from '@test/mocking';
import { Workflow, type INode, type IWebhookData } from 'n8n-workflow';
import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import { NodeTypes } from '@/node-types';
import type { INodeType } from 'n8n-workflow';
import { WebhookService } from '@/webhooks/webhook.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { cloneDeep } from 'lodash';
import type { Logger } from 'n8n-core';

let agent: SuperAgentTest;

describe('WebhookServer', () => {
	const liveWebhooks = mockInstance(LiveWebhooks);
	const testWebhooks = mockInstance(TestWebhooks);
	const waitingWebhooks = mockInstance(WaitingWebhooks);
	mockInstance(WaitingForms);
	mockInstance(ExternalHooks);
	const globalConfig = Container.get(GlobalConfig);

	const mockResponse = (data = {}, headers = {}, status = 200) => {
		const response = mock<IWebhookResponseCallbackData>();
		response.responseCode = status;
		response.data = data;
		response.headers = headers;
		return response;
	};

	beforeAll(async () => {
		const server = new WebhookServer();
		// @ts-expect-error: testWebhooksEnabled is private
		server.testWebhooksEnabled = true;
		await server.start();
		agent = testAgent(server.app);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('CORS', () => {
		const corsOrigin = 'https://example.com';
		const tests = [
			['webhook', liveWebhooks],
			['webhookTest', testWebhooks],
		] as const;

		for (const [key, manager] of tests) {
			describe(`for ${key}`, () => {
				const pathPrefix = globalConfig.endpoints[key];

				it('should handle preflight requests', async () => {
					manager.getWebhookMethods.mockResolvedValueOnce(['GET']);

					const response = await agent
						.options(`/${pathPrefix}/abcd`)
						.set('origin', corsOrigin)
						.set('access-control-request-method', 'GET');
					expect(response.statusCode).toEqual(204);
					expect(response.body).toEqual({});
					expect(response.headers['access-control-allow-origin']).toEqual(corsOrigin);
					expect(response.headers['access-control-allow-methods']).toEqual('OPTIONS, GET');
				});

				it('should handle regular requests', async () => {
					manager.getWebhookMethods.mockResolvedValueOnce(['GET']);
					manager.executeWebhook.mockResolvedValueOnce(
						mockResponse({ test: true }, { key: 'value ' }),
					);

					const response = await agent
						.get(`/${pathPrefix}/abcd`)
						.set('origin', corsOrigin)
						.set('access-control-request-method', 'GET');
					expect(response.statusCode).toEqual(200);
					expect(response.body).toEqual({ test: true });
					expect(response.headers['access-control-allow-origin']).toEqual(corsOrigin);
					expect(response.headers.key).toEqual('value');
				});
			});
		}
	});

	describe('Routing for Waiting Webhooks', () => {
		const pathPrefix = globalConfig.endpoints.webhookWaiting;

		beforeEach(() => {
			waitingWebhooks.executeWebhook.mockImplementation(async (req) => {
				return {
					noWebhookResponse: false,
					responseCode: 200,
					data: {
						params: req.params,
					},
				};
			});
		});

		it('should handle URLs without suffix', async () => {
			const response = await agent.get(`/${pathPrefix}/12345`);

			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				params: { path: '12345' },
			});
		});

		it('should handle URLs with suffix', async () => {
			const response = await agent.get(`/${pathPrefix}/12345/suffix`);

			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				params: { path: '12345', suffix: 'suffix' },
			});
		});
	});
});

describe('API-created Workflow Webhook Registration', () => {
	const mockWorkflowRepository = mock<WorkflowRepository>();
	const mockNodeTypes = mockInstance(NodeTypes);
	const mockWebhookService = mockInstance(WebhookService);

	let activeWorkflowManager: ActiveWorkflowManager;
	const webhookNodeId = 'webhook-test-node-123';

	const mockWebhookNode: INode = {
		id: webhookNodeId,
		name: 'WebhookTrigger',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
		position: [100, 200],
		parameters: {
			httpMethod: 'POST',
			authentication: 'none',
			responseMode: 'onReceived',
			path: '', // Empty path - the core issue
		},
	};

	const mockWorkflow = {
		id: 'workflow-123',
		name: 'API Created Workflow',
		active: true,
		nodes: [mockWebhookNode],
		connections: {},
		settings: {},
		staticData: {},
		tags: '',
		timezone: 'UTC',
		schemaVersion: 1,
		triggerCount: 0,
		versionId: 'someVersionId',
		createdAt: new Date(),
		updatedAt: new Date(),
		meta: undefined,
		pinned: false,
		isArchived: false,
		tagMappings: [],
		shared: [],
		statistics: [],
		executions: [],
		parentFolder: null,
		generateId: jest.fn(),
		setUpdateDate: jest.fn(),
	} as unknown as WorkflowEntity;

	const mockWebhookNodeType: INodeType = {
		description: {
			displayName: 'Webhook',
			name: 'n8n-nodes-base.webhook',
			group: ['trigger'],
			version: 1,
			description: 'Webhook trigger node',
			defaults: { name: 'Webhook' },
			inputs: [],
			outputs: ['main'],
			properties: [
				{
					displayName: 'HTTP Method',
					name: 'httpMethod',
					type: 'options',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
					default: 'GET',
				},
				{
					displayName: 'Path',
					name: 'path',
					type: 'string',
					default: '',
				},
			],
		},
	} as INodeType;

	const mockWebhookData: IWebhookData = {
		workflowId: 'workflow-123',
		node: 'WebhookTrigger',
		path: '',
		httpMethod: 'POST',
		webhookId: undefined,
		userId: undefined,
		webhookDescription: {
			name: 'default',
			path: '',
			httpMethod: 'POST',
			restartWebhook: false,
			isFullPath: false,
		},
		workflowExecuteAdditionalData: {} as any,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockNodeTypes.getByNameAndVersion.mockReturnValue(mockWebhookNodeType);
		mockWebhookService.createWebhook.mockImplementation((webhook) => webhook as any);
		mockWebhookService.storeWebhook.mockResolvedValue(undefined);
		mockWebhookService.createWebhookIfNotExists.mockResolvedValue(undefined);
		mockWebhookService.populateCache.mockResolvedValue(undefined);
		mockWorkflowRepository.findById.mockResolvedValue(cloneDeep(mockWorkflow));
		mockWorkflowRepository.save.mockImplementation(async (entity) => entity as WorkflowEntity);

		// Mock WorkflowExecuteAdditionalData.getBase
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({
			webhookBaseUrl: 'http://localhost:5678/webhook',
		} as any);

		// Mock WebhookHelpers.getWorkflowWebhooks to return expected webhook data
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([mockWebhookData]);

		// Create proper logger mock with scoped method
		const mockLogger: Logger = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			scoped: jest.fn().mockReturnThis(),
		} as any;

		activeWorkflowManager = new ActiveWorkflowManager(
			mockLogger,
			{ error: jest.fn() } as any, // errorReporter
			{ add: jest.fn(), remove: jest.fn() } as any, // activeWorkflows
			{} as any, // activeExecutions
			{ run: jest.fn() } as any, // externalHooks
			mockNodeTypes,
			mockWebhookService,
			mockWorkflowRepository,
			{} as any, // activationErrorsService
			{} as any, // executionService
			{ saveStaticData: jest.fn() } as any, // workflowStaticDataService
			{} as any, // activeWorkflowsService
			{} as any, // workflowExecutionService
			{ isLeader: true } as any, // instanceSettings
			{} as any, // publisher
			{} as any, // workflowsConfig
		);
	});

	it('should assign node.id as webhookId and parameters.path for webhook nodes with empty path', async () => {
		const workflow = new Workflow({
			id: mockWorkflow.id,
			name: mockWorkflow.name,
			nodes: cloneDeep(mockWorkflow.nodes),
			connections: mockWorkflow.connections,
			active: mockWorkflow.active,
			nodeTypes: mockNodeTypes,
			staticData: mockWorkflow.staticData,
			settings: mockWorkflow.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase();

		// Execute the addWebhooks method
		await activeWorkflowManager.addWebhooks(workflow, additionalData, 'trigger', 'activate');

		// Verify that webhookId was set to node.id
		const updatedNode = workflow.getNode('WebhookTrigger') as INode;
		expect(updatedNode).toBeDefined();
		expect(updatedNode.webhookId).toBe(webhookNodeId);
		expect(updatedNode.parameters.path).toBe(webhookNodeId);

		// Verify webhook was stored with correct path
		expect(mockWebhookService.storeWebhook).toHaveBeenCalledWith(
			expect.objectContaining({
				webhookPath: webhookNodeId,
				workflowId: 'workflow-123',
				node: 'WebhookTrigger',
				method: 'POST',
			}),
		);

		// Verify database was updated
		expect(mockWorkflowRepository.save).toHaveBeenCalled();
	});

	it('should not modify webhook node if path and webhookId are already correctly set', async () => {
		// Setup a node that already has correct values
		const correctNode = {
			...mockWebhookNode,
			webhookId: webhookNodeId,
			parameters: {
				...mockWebhookNode.parameters,
				path: webhookNodeId,
			},
		};

		const workflowWithCorrectNode = {
			...mockWorkflow,
			nodes: [correctNode],
		};

		// Update mock to return webhook data with correct path
		const correctWebhookData = {
			...mockWebhookData,
			path: webhookNodeId,
		};
		jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([correctWebhookData]);

		const workflow = new Workflow({
			id: workflowWithCorrectNode.id,
			name: workflowWithCorrectNode.name,
			nodes: cloneDeep(workflowWithCorrectNode.nodes),
			connections: workflowWithCorrectNode.connections,
			active: workflowWithCorrectNode.active,
			nodeTypes: mockNodeTypes,
			staticData: workflowWithCorrectNode.staticData,
			settings: workflowWithCorrectNode.settings,
		});

		mockWorkflowRepository.findById.mockResolvedValue(
			cloneDeep(workflowWithCorrectNode) as unknown as WorkflowEntity,
		);

		const additionalData = await WorkflowExecuteAdditionalData.getBase();

		// Execute the addWebhooks method
		await activeWorkflowManager.addWebhooks(workflow, additionalData, 'trigger', 'activate');

		// Verify values remain unchanged
		const node = workflow.getNode('WebhookTrigger') as INode;
		expect(node).toBeDefined();
		expect(node.webhookId).toBe(webhookNodeId);
		expect(node.parameters.path).toBe(webhookNodeId);

		// Verify webhook was still stored correctly
		expect(mockWebhookService.storeWebhook).toHaveBeenCalledWith(
			expect.objectContaining({
				webhookPath: webhookNodeId,
			}),
		);
	});
});
