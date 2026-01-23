import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { generateUrlSignature, prepareUrlForSigning, WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

class TestWaitingWebhooks extends WaitingWebhooks {
	exposeCreateWorkflow(workflowData: IWorkflowBase): Workflow {
		return this.createWorkflow(workflowData);
	}
}

describe('WaitingWebhooks', () => {
	const SIGNING_SECRET = 'test-secret';
	const executionRepository = mock<ExecutionRepository>();
	const mockWebhookService = mock<WebhookService>();
	const mockInstanceSettings = mock<InstanceSettings>({
		hmacSignatureSecret: SIGNING_SECRET,
	});
	const waitingWebhooks = new TestWaitingWebhooks(
		mock(),
		mock(),
		executionRepository,
		mockWebhookService,
		mockInstanceSettings,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	it('should throw NotFoundError if there is no execution to resume', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(undefined);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(NotFoundError);
	});

	it('should throw ConflictError if the execution to resume is already running', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'running' }),
		);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(ConflictError);
	});

	it('should throw ConflictError if the execution to resume already finished', async () => {
		/**
		 * Arrange
		 */
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ finished: true, workflowData: { nodes: [] } }),
		);

		/**
		 * Act
		 */
		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		/**
		 * Assert
		 */
		await expect(promise).rejects.toThrowError(ConflictError);
	});

	describe('findAccessControlOptions', () => {
		it('should return * as allowed origins', async () => {
			const options = await waitingWebhooks.findAccessControlOptions();
			expect(options).toEqual({ allowedOrigins: '*' });
		});
	});

	describe('validateSignatureInRequest', () => {
		const EXAMPLE_HOST = 'example.com';
		const generateValidSignature = (host = EXAMPLE_HOST) =>
			generateUrlSignature(
				prepareUrlForSigning(new URL('/webhook/test', `http://${host}`)),
				SIGNING_SECRET,
			);

		const createMockRequest = (opts: { host?: string; signature: string }) =>
			mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=` + opts.signature,
				host: opts.host ?? EXAMPLE_HOST,
				query: { [WAITING_TOKEN_QUERY_PARAM]: opts.signature },
				headers: { host: opts.host ?? EXAMPLE_HOST },
			});

		it('should validate signature correctly', () => {
			/* Arrange */
			const signature = generateValidSignature();
			const mockReq = createMockRequest({ signature });

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should validate signature correctly when host contains a port', () => {
			/* Arrange */
			const signature = generateValidSignature('example.com:8080');
			const mockReq = createMockRequest({
				signature,
				host: 'example.com:8080',
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should validate signature correctly when n8n is behind a reverse proxy', () => {
			/* Arrange */
			const signature = generateValidSignature('proxy.example.com');
			const mockReq = mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=` + signature,
				host: 'proxy.example.com',
				query: { [WAITING_TOKEN_QUERY_PARAM]: signature },
				headers: {
					host: 'localhost',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'x-forwarded-host': 'proxy.example.com',
				},
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(true);
		});

		it('should return false when signature is missing', () => {
			/* Arrange */
			const mockReq = mock<express.Request>({
				url: '/webhook/test',
				hostname: 'example.com',
				query: {},
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});

		it('should return false when signature is empty', () => {
			/* Arrange */
			const mockReq = mock<express.Request>({
				url: `/webhook/test?${WAITING_TOKEN_QUERY_PARAM}=`,
				hostname: 'example.com',
				query: { [WAITING_TOKEN_QUERY_PARAM]: '' },
			});

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});

		it('should return false when signatures do not match', () => {
			/* Arrange */
			const wrongSignature = 'wrong-signature';
			const mockReq = createMockRequest({ signature: wrongSignature });

			/* Act */
			const result = waitingWebhooks.validateSignatureInRequest(mockReq);

			/* Assert */
			expect(result).toBe(false);
		});
	});

	describe('createWorkflow', () => {
		it('should handle old executions with missing activeVersionId field when active=true', () => {
			const workflowData = {
				id: 'workflow1',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: true,
				activeVersionId: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
				settings: {},
				staticData: {},
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// @ts-expect-error: createWorkflow typing is incorrect, will be fixed later
			const workflow = waitingWebhooks.exposeCreateWorkflow(workflowData);

			expect(workflow.active).toBe(true);
		});

		it('should handle old executions with missing activeVersionId field when active=false', () => {
			const workflowData = {
				id: 'workflow1',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
				activeVersionId: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
				settings: {},
				staticData: {},
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// @ts-expect-error: createWorkflow typing is incorrect, will be fixed later
			const workflow = waitingWebhooks.exposeCreateWorkflow(workflowData);

			expect(workflow.active).toBe(false);
		});

		it('should set active to true when activeVersionId exists', () => {
			const workflowData: IWorkflowBase = {
				id: 'workflow1',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: true,
				activeVersionId: 'version-123',
				settings: {},
				staticData: {},
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const workflow = waitingWebhooks.exposeCreateWorkflow(workflowData);

			expect(workflow.active).toBe(true);
		});

		it('should set active to false when activeVersionId is null', () => {
			const workflowData: IWorkflowBase = {
				id: 'workflow1',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
				activeVersionId: null,
				settings: {},
				staticData: {},
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const workflow = waitingWebhooks.exposeCreateWorkflow(workflowData);

			expect(workflow.active).toBe(false);
		});
	});

	describe('HITL and inputOverride handling in executeWebhook', () => {
		it('should set rewireOutputLogTo for HITL nodes', async () => {
			/**
			 * Arrange
			 */
			const executionId = 'test-execution-id';
			const lastNodeExecuted = 'HitlToolNode';

			const mockExecution = mock<IExecutionResponse>({
				id: executionId,
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: lastNodeExecuted,
									type: '@n8n/n8n-nodes-langchain.someHitlTool',
									typeVersion: 1,
									parameters: {},
									id: 'node-id',
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{
									startTime: 123,
									executionTime: 456,
									executionIndex: 0,
									source: [],
								},
							],
						},
						lastNodeExecuted,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: lastNodeExecuted,
							type: '@n8n/n8n-nodes-langchain.someHitlTool',
							typeVersion: 1,
							parameters: {},
							id: 'node-id',
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Explicitly set error to undefined to avoid mock function
			mockExecution.data.resultData.error = undefined;

			executionRepository.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (
						_workflow,
						_webhookData,
						_workflowData,
						_workflowStartNode,
						_mode,
						_pushRef,
						_runExecutionData,
						_executionId,
						_req,
						_res,
						callback,
					) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			/**
			 * Act
			 */
			await waitingWebhooks.executeWebhook(mockReq, mockRes);

			/**
			 * Assert
			 */
			const nodeExecutionStack = mockExecution.data.executionData!.nodeExecutionStack;
			expect(nodeExecutionStack[0].node.rewireOutputLogTo).toBe('ai_tool');
		});

		it('should preserve inputOverride for nodes that have it', async () => {
			/**
			 * Arrange
			 */
			const executionId = 'test-execution-id';
			const lastNodeExecuted = 'TestNode';
			const inputOverrideData = [{ json: { test: 'data' } }] as any;

			const mockExecution = mock<IExecutionResponse>({
				id: executionId,
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: lastNodeExecuted,
									type: 'n8n-nodes-base.wait',
									typeVersion: 1,
									parameters: {},
									id: 'node-id',
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{
									startTime: 123,
									executionTime: 456,
									executionIndex: 0,
									source: [{ previousNode: 'PreviousNode' }],
									inputOverride: inputOverrideData,
								},
							],
						},
						lastNodeExecuted,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: lastNodeExecuted,
							type: 'n8n-nodes-base.wait',
							typeVersion: 1,
							parameters: {},
							id: 'node-id',
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Explicitly set error to undefined to avoid mock function
			mockExecution.data.resultData.error = undefined;

			executionRepository.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (
						_workflow,
						_webhookData,
						_workflowData,
						_workflowStartNode,
						_mode,
						_pushRef,
						_runExecutionData,
						_executionId,
						_req,
						_res,
						callback,
					) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			// Mock the webhookService to return a valid webhook
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			/**
			 * Act
			 */
			await waitingWebhooks.executeWebhook(mockReq, mockRes);

			/**
			 * Assert
			 */
			const runDataArray = mockExecution.data.resultData.runData[lastNodeExecuted];

			// Should have one entry (the placeholder with inputOverride)
			expect(runDataArray).toHaveLength(1);
			expect(runDataArray[0].inputOverride).toEqual(inputOverrideData);
			expect(runDataArray[0].startTime).toBe(0);
			expect(runDataArray[0].executionTime).toBe(0);
			expect(runDataArray[0].source[0]).toMatchObject({ previousNode: 'PreviousNode' });
		});

		it('should handle HITL node with inputOverride', async () => {
			/**
			 * Arrange
			 */
			const executionId = 'test-execution-id';
			const lastNodeExecuted = 'HitlToolNode';
			const inputOverrideData = [{ json: { toolInput: 'test' } }] as any;

			const mockExecution = mock<IExecutionResponse>({
				id: executionId,
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: lastNodeExecuted,
									type: '@n8n/n8n-nodes-langchain.someHitlTool',
									typeVersion: 1,
									parameters: {},
									id: 'node-id',
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{
									startTime: 123,
									executionTime: 456,
									executionIndex: 0,
									source: [{ previousNode: 'Agent' }],
									inputOverride: inputOverrideData,
								},
							],
						},
						lastNodeExecuted,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: lastNodeExecuted,
							type: '@n8n/n8n-nodes-langchain.someHitlTool',
							typeVersion: 1,
							parameters: {},
							id: 'node-id',
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Explicitly set error to undefined to avoid mock function
			mockExecution.data.resultData.error = undefined;

			executionRepository.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (
						_workflow,
						_webhookData,
						_workflowData,
						_workflowStartNode,
						_mode,
						_pushRef,
						_runExecutionData,
						_executionId,
						_req,
						_res,
						callback,
					) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			/**
			 * Act
			 */
			await waitingWebhooks.executeWebhook(mockReq, mockRes);

			/**
			 * Assert
			 */
			const nodeExecutionStack = mockExecution.data.executionData!.nodeExecutionStack;
			const runDataArray = mockExecution.data.resultData.runData[lastNodeExecuted];

			// Should set rewireOutputLogTo for HITL node
			expect(nodeExecutionStack[0].node.rewireOutputLogTo).toBe('ai_tool');

			// Should preserve inputOverride
			expect(runDataArray).toHaveLength(1);
			expect(runDataArray[0].inputOverride).toEqual(inputOverrideData);
			expect(runDataArray[0].source[0]).toMatchObject({ previousNode: 'Agent' });
		});

		it('should not preserve inputOverride when it is not present', async () => {
			/**
			 * Arrange
			 */
			const executionId = 'test-execution-id';
			const lastNodeExecuted = 'TestNode';

			const mockExecution = mock<IExecutionResponse>({
				id: executionId,
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: lastNodeExecuted,
									type: 'n8n-nodes-base.wait',
									typeVersion: 1,
									parameters: {},
									id: 'node-id',
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{
									startTime: 123,
									executionTime: 456,
									executionIndex: 0,
									source: [],
									inputOverride: undefined,
								},
							],
						},
						lastNodeExecuted,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: lastNodeExecuted,
							type: 'n8n-nodes-base.wait',
							typeVersion: 1,
							parameters: {},
							id: 'node-id',
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Explicitly set error to undefined to avoid mock function
			mockExecution.data.resultData.error = undefined;

			executionRepository.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (
						_workflow,
						_webhookData,
						_workflowData,
						_workflowStartNode,
						_mode,
						_pushRef,
						_runExecutionData,
						_executionId,
						_req,
						_res,
						callback,
					) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);

			// Mock WorkflowExecuteAdditionalData
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			/**
			 * Act
			 */
			await waitingWebhooks.executeWebhook(mockReq, mockRes);

			/**
			 * Assert
			 */
			const runDataArray = mockExecution.data.resultData.runData[lastNodeExecuted];

			// Should have empty array after popping and not adding placeholder
			expect(runDataArray).toHaveLength(0);
		});

		it('should not set rewireOutputLogTo for non-HITL nodes', async () => {
			/**
			 * Arrange
			 */
			const executionId = 'test-execution-id';
			const lastNodeExecuted = 'WaitNode';

			const mockExecution = mock<IExecutionResponse>({
				id: executionId,
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: lastNodeExecuted,
									type: 'n8n-nodes-base.wait',
									typeVersion: 1,
									parameters: {},
									id: 'node-id',
									position: [0, 0],
									disabled: false,
									rewireOutputLogTo: undefined,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{
									startTime: 123,
									executionTime: 456,
									executionIndex: 0,
									source: [],
								},
							],
						},
						lastNodeExecuted,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: lastNodeExecuted,
							type: 'n8n-nodes-base.wait',
							typeVersion: 1,
							parameters: {},
							id: 'node-id',
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// Explicitly set error to undefined to avoid mock function
			mockExecution.data.resultData.error = undefined;

			executionRepository.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			// Mock the WebhookHelpers.executeWebhook
			jest
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (
						_workflow,
						_webhookData,
						_workflowData,
						_workflowStartNode,
						_mode,
						_pushRef,
						_runExecutionData,
						_executionId,
						_req,
						_res,
						callback,
					) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			// Mock the webhookService to return a valid webhook
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			/**
			 * Act
			 */
			await waitingWebhooks.executeWebhook(mockReq, mockRes);

			/**
			 * Assert
			 */
			const nodeExecutionStack = mockExecution.data.executionData!.nodeExecutionStack;
			expect(nodeExecutionStack[0].node.rewireOutputLogTo).toBeUndefined();
		});
	});
});
