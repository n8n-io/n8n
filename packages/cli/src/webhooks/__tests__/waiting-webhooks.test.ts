import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { RESUME_TOKEN_QUERY_PARAM } from 'n8n-core';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';

class TestWaitingWebhooks extends WaitingWebhooks {
	exposeCreateWorkflow(workflowData: IWorkflowBase): Workflow {
		return this.createWorkflow(workflowData);
	}

	exposeValidateToken(
		req: express.Request,
		execution: IExecutionResponse,
	): { valid: boolean; webhookPath?: string } {
		return this.validateToken(req, execution);
	}
}

describe('WaitingWebhooks', () => {
	const executionRepository = mock<ExecutionRepository>();
	const mockInstanceSettings = mock<InstanceSettings>();
	const waitingWebhooks = new TestWaitingWebhooks(
		mock(),
		mock(),
		executionRepository,
		mock(),
		mockInstanceSettings,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
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
		const VALID_TOKEN = 'a'.repeat(64); // 32 bytes hex = 64 chars

		const createMockRequest = (opts: { host?: string; token?: string }) =>
			mock<express.Request>({
				url: `/webhook/test${opts.token ? `?${RESUME_TOKEN_QUERY_PARAM}=${opts.token}` : ''}`,
				headers: { host: opts.host ?? EXAMPLE_HOST },
			});

		const createMockExecution = (token?: string) =>
			mock<IExecutionResponse>({
				data: { resumeToken: token },
			});

		it('should validate token correctly when tokens match', () => {
			/* Arrange */
			const mockReq = createMockRequest({ token: VALID_TOKEN });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: undefined });
		});

		it('should return false when provided token is missing', () => {
			/* Arrange */
			const mockReq = createMockRequest({});
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: false });
		});

		it('should return false when stored token is missing', () => {
			/* Arrange */
			const mockReq = createMockRequest({ token: VALID_TOKEN });
			const mockExecution = createMockExecution(undefined);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: false });
		});

		it('should return false when tokens do not match', () => {
			/* Arrange */
			const wrongToken = 'b'.repeat(64);
			const mockReq = createMockRequest({ token: wrongToken });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: false, webhookPath: undefined });
		});

		it('should return false when token lengths differ', () => {
			/* Arrange */
			const shortToken = 'abc123';
			const mockReq = createMockRequest({ token: shortToken });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: false });
		});

		it('should work regardless of host or URL path', () => {
			/* Arrange - different hosts and paths should not affect validation */
			const mockReq = createMockRequest({ host: 'different.host.com:8080', token: VALID_TOKEN });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: undefined });
		});

		it('should extract suffix from token when appended (backwards compat)', () => {
			/* Arrange - URL format: ?signature=token/suffix */
			const tokenWithSuffix = `${VALID_TOKEN}/my-suffix`;
			const mockReq = createMockRequest({ token: tokenWithSuffix });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'my-suffix' });
		});

		it('should handle nested suffix paths (backwards compat)', () => {
			/* Arrange - URL format: ?signature=token/path/to/suffix */
			const tokenWithNestedSuffix = `${VALID_TOKEN}/path/to/suffix`;
			const mockReq = createMockRequest({ token: tokenWithNestedSuffix });
			const mockExecution = createMockExecution(VALID_TOKEN);

			/* Act */
			const result = waitingWebhooks.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'path/to/suffix' });
		});
	});

	describe('executeWebhook - token validation', () => {
		const STORED_TOKEN = 'a'.repeat(64);

		it('should return 401 with HTML for send-and-wait requests with invalid token', async () => {
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
					resumeToken: STORED_TOKEN,
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
			// Request has wrong token
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: nodeId },
				method: 'GET',
				url: `/webhook/execution-id/${nodeId}?${RESUME_TOKEN_QUERY_PARAM}=wrong-token`,
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

		it('should return 401 with JSON for non-send-and-wait requests with invalid token', async () => {
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
					resumeToken: STORED_TOKEN,
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
			// Request has wrong token
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: 'wait-node-id' },
				method: 'GET',
				url: `/webhook/execution-id/wait-node-id?${RESUME_TOKEN_QUERY_PARAM}=wrong-token`,
				headers: { host: 'example.com' },
			});

			/* Act */
			const result = await waitingWebhooks.executeWebhook(req, res);

			/* Assert */
			expect(mockStatus).toHaveBeenCalledWith(401);
			expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' });
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
});
