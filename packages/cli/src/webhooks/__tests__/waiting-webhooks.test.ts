import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

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

	exposeValidateSignature(
		req: express.Request,
		suffix?: string,
	): { valid: boolean; webhookPath?: string } {
		return this.validateSignature(req, suffix);
	}
}

describe('WaitingWebhooks', () => {
	const TEST_HMAC_SECRET = 'test-hmac-secret-key';
	const executionRepository = mock<ExecutionRepository>();
	const mockWebhookService = mock<WebhookService>();
	const mockInstanceSettings = mock<InstanceSettings>({ hmacSignatureSecret: TEST_HMAC_SECRET });
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

	describe('validateSignature', () => {
		const EXAMPLE_HOST = 'example.com';

		// Helper to generate proper HMAC signature for a URL
		const generateTestSignature = (urlPath: string) => {
			const crypto = require('crypto');
			return crypto.createHmac('sha256', TEST_HMAC_SECRET).update(urlPath).digest('hex');
		};

		const createMockRequest = (opts: { host?: string; signature?: string; path?: string }) => {
			const urlPath = opts.path ?? '/webhook/test';
			const fullUrl = opts.signature
				? `${urlPath}?${WAITING_TOKEN_QUERY_PARAM}=${opts.signature}`
				: urlPath;
			return mock<express.Request>({
				url: fullUrl,
				headers: { host: opts.host ?? EXAMPLE_HOST },
			});
		};

		it('should validate signature correctly when HMAC matches', () => {
			/* Arrange */
			const urlPath = '/webhook/test';
			const validSignature = generateTestSignature(urlPath);
			const mockReq = createMockRequest({ signature: validSignature, path: urlPath });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: undefined });
		});

		it('should return false when signature is missing', () => {
			/* Arrange */
			const mockReq = createMockRequest({});

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: false });
		});

		it('should return false when signature is invalid', () => {
			/* Arrange */
			const wrongSignature = 'b'.repeat(64);
			const mockReq = createMockRequest({ signature: wrongSignature });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: false, webhookPath: undefined });
		});

		it('should return false when signature length is wrong', () => {
			/* Arrange */
			const shortSignature = 'abc123';
			const mockReq = createMockRequest({ signature: shortSignature });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: false, webhookPath: undefined });
		});

		it('should extract suffix from signature when appended (backwards compat)', () => {
			/* Arrange - URL format: ?signature=hmac/suffix */
			const urlPath = '/webhook/test';
			const validSignature = generateTestSignature(urlPath);
			const signatureWithSuffix = `${validSignature}/my-suffix`;
			const mockReq = createMockRequest({ signature: signatureWithSuffix, path: urlPath });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'my-suffix' });
		});

		it('should handle nested suffix paths (backwards compat)', () => {
			/* Arrange - URL format: ?signature=hmac/path/to/suffix */
			const urlPath = '/webhook/test';
			const validSignature = generateTestSignature(urlPath);
			const signatureWithNestedSuffix = `${validSignature}/path/to/suffix`;
			const mockReq = createMockRequest({ signature: signatureWithNestedSuffix, path: urlPath });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'path/to/suffix' });
		});

		it('should strip suffix from pathname when provided as second argument', () => {
			/* Arrange - Signature was generated for base path, but request includes suffix in pathname */
			const basePath = '/form-waiting/123';
			const suffix = 'n8n-execution-status';
			const pathWithSuffix = `${basePath}/${suffix}`;
			const validSignature = generateTestSignature(basePath);
			const mockReq = createMockRequest({ signature: validSignature, path: pathWithSuffix });

			/* Act */
			const result = waitingWebhooks.exposeValidateSignature(mockReq, suffix);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: undefined });
		});

		it('should fail validation when suffix is in pathname but not stripped', () => {
			/* Arrange - Signature was generated for base path, but request includes suffix in pathname
			 * Without passing suffix, validation should fail because paths don't match */
			const basePath = '/form-waiting/123';
			const suffix = 'n8n-execution-status';
			const pathWithSuffix = `${basePath}/${suffix}`;
			const validSignature = generateTestSignature(basePath);
			const mockReq = createMockRequest({ signature: validSignature, path: pathWithSuffix });

			/* Act - Note: not passing suffix parameter */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert - Should fail because signature was for /form-waiting/123 but URL is /form-waiting/123/n8n-execution-status */
			expect(result).toEqual({ valid: false, webhookPath: undefined });
		});

		it('should validate signature correctly when nodeId suffix is part of signed URL (send-and-wait)', () => {
			/* Arrange - Send-and-wait URLs include nodeId in the signed path along with query params.
			 * The signature is computed from pathname + query params (excluding signature itself). */
			const nodeId = '3a3e4b33-52d1-41f9-9c69-2829030062ff';
			const pathWithNodeId = `/webhook-waiting/123/${nodeId}`;
			const pathWithParams = `${pathWithNodeId}?approved=true`;
			// Signature generated for full path including nodeId and query params
			const validSignature = generateTestSignature(pathWithParams);
			// Construct URL with both approved and signature params
			const fullUrl = `${pathWithNodeId}?approved=true&${WAITING_TOKEN_QUERY_PARAM}=${validSignature}`;
			const mockReq = mock<express.Request>({
				url: fullUrl,
				headers: { host: EXAMPLE_HOST },
			});

			/* Act - Don't pass suffix because nodeId is part of signed URL */
			const result = waitingWebhooks.exposeValidateSignature(mockReq);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: undefined });
		});
	});

	describe('executeWebhook - signature validation', () => {
		it('should return 401 with HTML for send-and-wait requests with invalid signature', async () => {
			/* Arrange */
			const nodeId = 'send-and-wait-node-id';
			const execution = mock<IExecutionResponse>({
				finished: false,
				status: 'waiting',
				data: {
					resultData: {
						lastNodeExecuted: 'SendAndWaitNode',
						runData: {},
						error: undefined,
					},
					validateSignature: true, // New executions have this flag
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							id: nodeId,
							name: 'SendAndWaitNode',
							type: 'n8n-nodes-base.sendAndWait',
							parameters: { operation: SEND_AND_WAIT_OPERATION },
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
					active: false,
					settings: {},
					staticData: {},
				},
			});
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const mockStatus = jest.fn().mockReturnThis();
			const mockRender = jest.fn();
			const mockJson = jest.fn();
			const res = mock<express.Response>({
				status: mockStatus,
				render: mockRender,
				json: mockJson,
			});
			// Request has wrong signature
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: nodeId },
				method: 'GET',
				url: `/webhook/execution-id/${nodeId}?${WAITING_TOKEN_QUERY_PARAM}=wrong-signature`,
				headers: { host: 'example.com' },
			});

			/* Act */
			const result = await waitingWebhooks.executeWebhook(req, res);

			/* Assert */
			expect(mockStatus).toHaveBeenCalledWith(401);
			expect(mockRender).toHaveBeenCalledWith('form-invalid-token');
			expect(mockJson).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should return 401 with JSON for non-send-and-wait requests with invalid signature', async () => {
			/* Arrange */
			const execution = mock<IExecutionResponse>({
				finished: false,
				status: 'waiting',
				data: {
					resultData: {
						lastNodeExecuted: 'WaitNode',
						runData: {},
						error: undefined,
					},
					validateSignature: true, // New executions have this flag
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							id: 'wait-node-id',
							name: 'WaitNode',
							type: 'n8n-nodes-base.wait',
							parameters: { operation: 'webhook' },
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
					active: false,
					settings: {},
					staticData: {},
				},
			});
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const mockStatus = jest.fn().mockReturnThis();
			const mockRender = jest.fn();
			const mockJson = jest.fn();
			const res = mock<express.Response>({
				status: mockStatus,
				render: mockRender,
				json: mockJson,
			});
			// Request has wrong signature
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: 'wait-node-id' },
				method: 'GET',
				url: `/webhook/execution-id/wait-node-id?${WAITING_TOKEN_QUERY_PARAM}=wrong-signature`,
				headers: { host: 'example.com' },
			});

			/* Act */
			const result = await waitingWebhooks.executeWebhook(req, res);

			/* Assert */
			expect(mockStatus).toHaveBeenCalledWith(401);
			expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid signature' });
			expect(mockRender).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
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
			mockExecution.data.validateSignature = undefined;

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
			mockExecution.data.validateSignature = undefined;

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
			mockExecution.data.validateSignature = undefined;

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
			mockExecution.data.validateSignature = undefined;

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
			mockExecution.data.validateSignature = undefined;

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
