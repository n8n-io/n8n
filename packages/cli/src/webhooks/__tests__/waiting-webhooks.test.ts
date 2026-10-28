import type { EventService } from '@n8n/backend-services';
import type { EndpointsConfig } from '@n8n/config';
import type { IExecutionResponse } from '@n8n/db';
import type { ExecutionSnapshot } from '@n8n/engine';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import { WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';
import type {
	INode,
	INodeParameters,
	IRunData,
	IWebhookData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';
import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, NotFoundError, NotImplementedError } from '@n8n/errors';
import type { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WaitingForms } from '@/webhooks/waiting-forms';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

class TestWaitingWebhooks extends WaitingWebhooks {
	exposeCreateWorkflow(workflowData: IWorkflowBase): Workflow {
		return this.createWorkflow(workflowData);
	}

	exposeValidateSignature(req: express.Request): { valid: boolean; webhookPath?: string } {
		return this.validateSignature(req);
	}

	exposeValidateToken(
		req: express.Request,
		execution: IExecutionResponse,
	): { valid: boolean; webhookPath?: string } {
		return this.validateToken(req, execution);
	}
}

describe('WaitingWebhooks', () => {
	const TEST_HMAC_SECRET = 'test-hmac-secret-key';
	const executionPersistence = mock<ExecutionPersistence>();
	const mockWebhookService = mock<WebhookService>();
	const mockInstanceSettings = mock<InstanceSettings>({ hmacSignatureSecret: TEST_HMAC_SECRET });
	const mockEventService = mock<EventService>();
	const mockEndpointsConfig = mock<EndpointsConfig>({
		webhookWaiting: 'webhook-waiting',
		formWaiting: 'form-waiting',
	});
	const waitingWebhooks = new TestWaitingWebhooks(
		mock(),
		mock(),
		executionPersistence,
		mockWebhookService,
		mockInstanceSettings,
		mockEventService,
		mockEndpointsConfig,
		mock(),
		mock(),
	);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('should throw NotFoundError if there is no execution to resume', async () => {
		/**
		 * Arrange
		 */
		executionPersistence.findSingleExecution.mockResolvedValue(undefined);

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

	describe('getWebhookMethods', () => {
		it('returns the configured method for a waiting webhook', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					data: {
						resultData: { lastNodeExecuted: 'Wait' },
					},
					workflowData: {
						id: 'workflow-id',
						name: 'Workflow',
						nodes: [
							{
								name: 'Wait',
								type: 'n8n-nodes-base.wait',
								typeVersion: 1,
								position: [0, 0],
								parameters: { resume: 'webhook', httpMethod: 'POST' },
							},
						],
						connections: {},
						staticData: {},
					},
				}),
			);
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					webhookDescription: { restartWebhook: true },
				},
				{
					httpMethod: 'GET',
					webhookDescription: { restartWebhook: true, nodeType: 'form' },
				},
			] as any);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			await expect(waitingWebhooks.getWebhookMethods('execution-id')).resolves.toEqual(['POST']);
		});
	});

	it('should throw ConflictError if the execution to resume was parked at a node boundary', async () => {
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				data: {
					waitReason: 'suspended',
					resumeToken: undefined,
					resultData: { lastNodeExecuted: undefined, error: undefined },
				},
			}),
		);

		const promise = waitingWebhooks.executeWebhook(
			mock<WaitingWebhookRequest>(),
			mock<express.Response>(),
		);

		await expect(promise).rejects.toThrowError(ConflictError);
	});

	it('should throw ConflictError if the execution to resume is already running', async () => {
		/**
		 * Arrange
		 */
		executionPersistence.findSingleExecution.mockResolvedValue(
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
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				finished: true,
				// Provide real values for the fields the Workflow constructor reads so
				// vitest-mock-extended keeps them as plain data rather than auto-mocking
				// them into functions (whose read-only `.mock` breaks ObservableObject).
				workflowData: { nodes: [], connections: {}, staticData: {} },
			}),
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
					resumeToken: 'a'.repeat(64),
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
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const mockStatus = vi.fn().mockReturnThis();
			const mockRender = vi.fn();
			const mockJson = vi.fn();
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
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
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
					resumeToken: 'a'.repeat(64),
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
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const mockStatus = vi.fn().mockReturnThis();
			const mockRender = vi.fn();
			const mockJson = vi.fn();
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
			expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token' });
			expect(mockRender).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	/*
	 * Regression test — a send-and-wait node id is recognised whether it arrives as a
	 * route suffix or inside the signature query value, and either way the request
	 * must pass HMAC validation.
	 * Ref: CAT-3881
	 * 2026-09-18
	 */
	describe('send-and-wait node id in the signature query value', () => {
		const nodeId = 'send-and-wait-node-id';
		const resumeToken = 'a'.repeat(64);

		const buildExecution = () =>
			mock<IExecutionResponse>({
				finished: false,
				status: 'waiting',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									id: nodeId,
									name: 'SendAndWaitNode',
									type: 'n8n-nodes-base.sendAndWait',
									parameters: { operation: SEND_AND_WAIT_OPERATION },
									typeVersion: 1,
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						lastNodeExecuted: 'SendAndWaitNode',
						runData: {
							SendAndWaitNode: [{ startTime: 0, executionTime: 0, executionIndex: 0, source: [] }],
						},
						error: undefined,
					},
					resumeToken,
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

		const buildRes = () =>
			mock<express.Response>({
				status: vi.fn().mockReturnThis(),
				render: vi.fn(),
				json: vi.fn(),
			});

		it('rejects with 401 when the node id rides the signature query instead of the route suffix and the HMAC is invalid', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(buildExecution());

			const executeWebhookSpy = vi.spyOn(WebhookHelpers, 'executeWebhook');

			const res = buildRes();
			// No route suffix; the node id is carried in the signature query value (old URL format).
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: undefined },
				method: 'GET',
				url: `/webhook-waiting/execution-id?approved=true&${WAITING_TOKEN_QUERY_PARAM}=${resumeToken}%2F${nodeId}`,
				headers: { host: 'example.com' },
			});

			const result = await waitingWebhooks.executeWebhook(req, res);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(executeWebhookSpy).not.toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('resumes when the node id is the route suffix and the HMAC is valid', async () => {
			const execution = buildExecution();
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'GET',
					path: nodeId,
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'GET',
						name: 'default',
						path: nodeId,
						nodeType: undefined,
					} as any,
				},
			] as any);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const executeWebhookSpy = vi
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			const res = buildRes();
			const signedPath = `/webhook-waiting/execution-id/${nodeId}?approved=true`;
			const signature = require('crypto')
				.createHmac('sha256', TEST_HMAC_SECRET)
				.update(signedPath)
				.digest('hex');
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: nodeId },
				method: 'GET',
				url: `${signedPath}&${WAITING_TOKEN_QUERY_PARAM}=${signature}`,
				headers: { host: 'example.com' },
			});

			const result = await waitingWebhooks.executeWebhook(req, res);

			expect(res.status).not.toHaveBeenCalledWith(401);
			expect(executeWebhookSpy).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('token stripping on resume', () => {
		const resumeToken = 'a'.repeat(64);

		const buildExecution = () =>
			mock<IExecutionResponse>({
				finished: false,
				status: 'waiting',
				data: {
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									id: 'wait-node-id',
									name: 'WaitNode',
									type: 'n8n-nodes-base.wait',
									parameters: { resume: 'webhook' },
									typeVersion: 1,
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						lastNodeExecuted: 'WaitNode',
						runData: {
							WaitNode: [{ startTime: 0, executionTime: 0, executionIndex: 0, source: [] }],
						},
						error: undefined,
					},
					resumeToken,
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							id: 'wait-node-id',
							name: 'WaitNode',
							type: 'n8n-nodes-base.wait',
							parameters: { resume: 'webhook' },
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

		it('removes the token from the request query and url before the node runs', async () => {
			/* Arrange */
			executionPersistence.findSingleExecution.mockResolvedValue(buildExecution());
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'GET',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'GET',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const executeWebhookSpy = vi
				.spyOn(WebhookHelpers, 'executeWebhook')
				.mockImplementation(
					async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback) => {
						callback(null, { noWebhookResponse: true });
						return undefined;
					},
				);

			const req = mock<WaitingWebhookRequest>({
				params: { path: 'execution-id', suffix: undefined },
				method: 'GET',
				url: `/webhook-waiting/execution-id?${WAITING_TOKEN_QUERY_PARAM}=${resumeToken}&foo=bar`,
				headers: { host: 'example.com' },
			});
			req.query = { [WAITING_TOKEN_QUERY_PARAM]: resumeToken, foo: 'bar' };

			/* Act */
			await waitingWebhooks.executeWebhook(req, mock<express.Response>());

			/* Assert */
			expect(executeWebhookSpy).toHaveBeenCalled();
			const [, , , , , , , , calledReq] = executeWebhookSpy.mock.calls[0];
			expect((calledReq as express.Request).query).not.toHaveProperty(WAITING_TOKEN_QUERY_PARAM);
			expect((calledReq as express.Request).query).toEqual({ foo: 'bar' });
			expect((calledReq as express.Request).url).not.toContain(resumeToken);
			expect((calledReq as express.Request).url).toBe('/webhook-waiting/execution-id?foo=bar');
		});
	});

	describe('form-resume redirect to form-waiting', () => {
		const buildExecution = (opts: { nodeType: string; nodeParameters?: INodeParameters }) =>
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: {
					resumeToken: undefined,
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									id: 'resume-node-id',
									name: 'ResumeNode',
									type: opts.nodeType,
									parameters: opts.nodeParameters ?? {},
									typeVersion: 1,
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						lastNodeExecuted: 'ResumeNode',
						runData: {
							ResumeNode: [{ startTime: 0, executionTime: 0, executionIndex: 0, source: [] }],
						},
						error: undefined,
					},
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							id: 'resume-node-id',
							name: 'ResumeNode',
							type: opts.nodeType,
							parameters: opts.nodeParameters ?? {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
					settings: {},
					staticData: {},
				},
			});

		const buildRes = () =>
			mock<express.Response>({
				redirect: vi.fn(),
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
				render: vi.fn(),
			});

		it('redirects a Wait node resuming on form submission', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecution({ nodeType: 'n8n-nodes-base.wait', nodeParameters: { resume: 'form' } }),
			);
			const res = buildRes();
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'exec-id', suffix: undefined },
				method: 'GET',
				originalUrl: '/webhook-waiting/exec-id?signature=abc',
			});

			const result = await waitingWebhooks.executeWebhook(req, res);

			expect(res.redirect).toHaveBeenCalledWith(307, '/form-waiting/exec-id?signature=abc');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('redirects a Form node', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecution({ nodeType: 'n8n-nodes-base.form' }),
			);
			const res = buildRes();
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'exec-id', suffix: 'my-suffix' },
				method: 'POST',
				originalUrl: '/webhook-waiting/exec-id/my-suffix?signature=abc',
			});

			const result = await waitingWebhooks.executeWebhook(req, res);

			expect(res.redirect).toHaveBeenCalledWith(
				307,
				'/form-waiting/exec-id/my-suffix?signature=abc',
			);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('does not redirect a Wait node resuming on webhook call', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecution({ nodeType: 'n8n-nodes-base.wait', nodeParameters: { resume: 'webhook' } }),
			);
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'GET',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'GET',
						name: 'default',
						path: '',
						nodeType: undefined,
					} as any,
				},
			] as any);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback) => {
					callback(null, { noWebhookResponse: true });
					return undefined;
				},
			);
			const res = buildRes();
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'exec-id', suffix: undefined },
				method: 'GET',
				originalUrl: '/webhook-waiting/exec-id?signature=abc',
			});

			await waitingWebhooks.executeWebhook(req, res);

			expect(res.redirect).not.toHaveBeenCalled();
		});

		it('does not redirect when the waiting endpoints are configured identically', async () => {
			const identicalEndpointsConfig = mock<EndpointsConfig>({
				webhookWaiting: 'webhook-waiting',
				formWaiting: 'webhook-waiting',
			});
			const webhooksWithIdenticalEndpoints = new TestWaitingWebhooks(
				mock(),
				mock(),
				executionPersistence,
				mockWebhookService,
				mockInstanceSettings,
				mockEventService,
				identicalEndpointsConfig,
				mock(),
				mock(),
			);
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecution({ nodeType: 'n8n-nodes-base.wait', nodeParameters: { resume: 'form' } }),
			);
			mockWebhookService.getNodeWebhooks.mockReturnValue([]);
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const res = buildRes();
			const req = mock<WaitingWebhookRequest>({
				params: { path: 'exec-id', suffix: undefined },
				method: 'GET',
				originalUrl: '/webhook-waiting/exec-id?signature=abc',
			});

			await expect(webhooksWithIdenticalEndpoints.executeWebhook(req, res)).rejects.toThrowError(
				NotFoundError,
			);
			expect(res.redirect).not.toHaveBeenCalled();
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
				activeVersionId: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
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
				activeVersionId: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
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
			mockExecution.data.resumeToken = undefined;

			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
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

			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

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

		it('rejects (does not hang) when executeWebhook throws before invoking the callback', async () => {
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
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						runData: {
							[lastNodeExecuted]: [
								{ startTime: 123, executionTime: 456, executionIndex: 0, source: [] },
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
				},
			});
			mockExecution.data.resultData.error = undefined;
			mockExecution.data.resumeToken = undefined;
			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const preCallbackError = new Error('response option expression failed');
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockRejectedValue(preCallbackError);

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
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});

			await expect(waitingWebhooks.executeWebhook(mockReq, mock<express.Response>())).rejects.toBe(
				preCallbackError,
			);
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
			mockExecution.data.resumeToken = undefined;

			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
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

			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

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
			mockExecution.data.resumeToken = undefined;

			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
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

			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

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
			mockExecution.data.resumeToken = undefined;

			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
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
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

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
			mockExecution.data.resumeToken = undefined;

			executionPersistence.findSingleExecution.mockResolvedValue(mockExecution);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: executionId, suffix: undefined },
				method: 'POST',
			});
			const mockRes = mock<express.Response>();

			// Mock the WebhookHelpers.executeWebhook
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
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

			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

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

	describe('execution-resumed event', () => {
		function createMockExecution(overrides: {
			nodeType: string;
			nodeName: string;
			nodeId: string;
			typeVersion?: number;
			nodeParameters?: Record<string, string>;
		}) {
			const { nodeType, nodeName, nodeId, typeVersion = 1, nodeParameters = {} } = overrides;
			return mock<IExecutionResponse>({
				id: 'test-execution-id',
				status: 'waiting',
				finished: false,
				mode: 'manual',
				data: {
					resumeToken: undefined,
					executionData: {
						nodeExecutionStack: [
							{
								node: {
									name: nodeName,
									type: nodeType,
									typeVersion,
									parameters: nodeParameters,
									id: nodeId,
									position: [0, 0],
									disabled: false,
								},
								data: {},
								source: null,
							},
						],
					},
					resultData: {
						error: undefined,
						runData: {
							[nodeName]: [{ startTime: 0, executionTime: 0, executionIndex: 0, source: [] }],
						},
						lastNodeExecuted: nodeName,
					},
				},
				workflowData: {
					id: 'workflow-id',
					name: 'Test Workflow',
					nodes: [
						{
							name: nodeName,
							type: nodeType,
							typeVersion,
							parameters: nodeParameters,
							id: nodeId,
							position: [0, 0],
						},
					],
					connections: {},
					active: false,
					activeVersionId: null,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		}

		function createMockRes(): express.Response {
			return mock<express.Response>({
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
				render: vi.fn(),
			});
		}

		beforeEach(() => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			executionPersistence.findSingleExecution.mockResolvedValue(
				createMockExecution({
					nodeType: 'n8n-nodes-base.wait',
					nodeName: 'WaitNode',
					nodeId: 'node-id',
				}),
			);
		});

		it('should emit once with the time captured before webhook invocation', async () => {
			const responseAt = new Date('2026-10-09T12:00:00.000Z');
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
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback, _dn, options) => {
					vi.setSystemTime(new Date(responseAt.getTime() + 5000));
					options?.onResume?.();
					callback(null, { noWebhookResponse: true });
					return undefined;
				},
			);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: undefined },
				method: 'POST',
			});
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(responseAt);
			try {
				await waitingWebhooks.executeWebhook(mockReq, createMockRes());
			} finally {
				vi.useRealTimers();
			}

			expect(mockEventService.emit).toHaveBeenCalledTimes(1);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'execution-resumed',
				expect.objectContaining({
					executionId: 'test-execution-id',
					workflowId: 'workflow-id',
					responseAt,
				}),
			);
		});

		it('should not emit when the resume request fails before the execution resumes', async () => {
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
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback) => {
					callback(new Error('Workflow Webhook Error: Workflow could not be started!'), {});
					return undefined;
				},
			);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: undefined },
				method: 'POST',
			});
			await expect(waitingWebhooks.executeWebhook(mockReq, createMockRes())).rejects.toThrow(
				'Workflow could not be started',
			);

			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});

		it('should not emit when no matching webhook found', async () => {
			mockWebhookService.getNodeWebhooks.mockReturnValue([]);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: undefined },
				method: 'POST',
			});
			await expect(waitingWebhooks.executeWebhook(mockReq, createMockRes())).rejects.toThrowError(
				NotFoundError,
			);

			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});

		it('should not emit for send-and-wait already-responded requests', async () => {
			const sendAndWaitNodeId = 'send-and-wait-node-id';
			executionPersistence.findSingleExecution.mockResolvedValue(
				createMockExecution({
					nodeType: 'n8n-nodes-base.sendAndWait',
					nodeName: 'SendAndWaitNode',
					nodeId: sendAndWaitNodeId,
					nodeParameters: { operation: SEND_AND_WAIT_OPERATION },
				}),
			);
			mockWebhookService.getNodeWebhooks.mockReturnValue([]);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: sendAndWaitNodeId },
				method: 'POST',
			});
			const result = await waitingWebhooks.executeWebhook(mockReq, createMockRes());

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});

		it('should not emit for form-resume execution (redirected, not resumed here)', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				createMockExecution({
					nodeType: 'n8n-nodes-base.wait',
					nodeName: 'WaitNode',
					nodeId: 'node-id',
					nodeParameters: { resume: 'form' },
				}),
			);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: undefined },
				method: 'GET',
				originalUrl: '/webhook-waiting/test-execution-id?signature=abc',
			});
			await waitingWebhooks.executeWebhook(mockReq, createMockRes());

			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});

		it('should not emit for active send-and-wait webhook call', async () => {
			const sendAndWaitNodeId = 'send-and-wait-node-id';
			executionPersistence.findSingleExecution.mockResolvedValue(
				createMockExecution({
					nodeType: 'n8n-nodes-base.emailSend',
					nodeName: 'SendAndWaitNode',
					nodeId: sendAndWaitNodeId,
					typeVersion: 2,
					nodeParameters: { operation: SEND_AND_WAIT_OPERATION },
				}),
			);
			// Webhook IS found — simulates an active send-and-wait response
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'POST',
					path: sendAndWaitNodeId,
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: sendAndWaitNodeId,
						nodeType: undefined,
					} as any,
				},
			] as any);
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, done, _dn, options) => {
					options?.onResume?.();
					done(null, { noWebhookResponse: true });
					return undefined;
				},
			);

			const mockReq = mock<WaitingWebhookRequest>({
				params: { path: 'test-execution-id', suffix: sendAndWaitNodeId },
				method: 'POST',
			});
			await waitingWebhooks.executeWebhook(mockReq, createMockRes());

			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});

		it('should not emit for a matched form webhook', async () => {
			const waitingForms = new WaitingForms(
				mock(),
				mock(),
				executionPersistence,
				mockWebhookService,
				mockInstanceSettings,
				mockEventService,
				mockEndpointsConfig,
				mock(),
				mock(),
			);
			executionPersistence.findSingleExecution.mockResolvedValue(
				createMockExecution({
					nodeType: 'n8n-nodes-base.wait',
					nodeName: 'WaitNode',
					nodeId: 'node-id',
					nodeParameters: { resume: 'form' },
				}),
			);
			mockWebhookService.getNodeWebhooks.mockReturnValue([
				mock<IWebhookData>({
					httpMethod: 'POST',
					path: '',
					webhookDescription: {
						restartWebhook: true,
						httpMethod: 'POST',
						name: 'default',
						path: '',
						nodeType: 'form',
					},
				}),
			]);
			vi.spyOn(WebhookHelpers, 'executeWebhook').mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback, _dn, options) => {
					options?.onResume?.();
					callback(null, { noWebhookResponse: true });
					return undefined;
				},
			);

			await waitingForms.executeWebhook(
				mock<WaitingWebhookRequest>({
					params: { path: 'test-execution-id', suffix: undefined },
					method: 'POST',
				}),
				createMockRes(),
			);

			expect(WebhookHelpers.executeWebhook).toHaveBeenCalledTimes(1);
			expect(mockEventService.emit).not.toHaveBeenCalledWith(
				'execution-resumed',
				expect.anything(),
			);
		});
	});
});

describe('WaitingWebhooks on an engine v2 execution', () => {
	const EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const executionReader = mock<EngineV2ExecutionReader>();
	const webhookService = mock<WebhookService>();
	const executionPersistence = mock<ExecutionPersistence>();
	const waitingWebhooks = new WaitingWebhooks(
		mock(),
		mock(),
		executionPersistence,
		webhookService,
		mock<InstanceSettings>(),
		mock<EventService>(),
		mock<EndpointsConfig>({ webhookWaiting: 'webhook-waiting', formWaiting: 'form-waiting' }),
		dataPlane,
		executionReader,
	);

	const waitNode = {
		id: 'wait-id',
		name: 'Wait',
		type: 'n8n-nodes-base.wait',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: { resume: 'webhook' },
	};
	// Plain objects, not `mock()`: the route clones the node, and a proxy cannot be cloned.
	const snapshot = (status: ExecutionSnapshot['status']) =>
		({ id: EXECUTION_ID, status, workflow: { nodes: [waitNode] } }) as unknown as ExecutionSnapshot;
	const target = { stepId: 'step-1', nodeId: 'wait-id' };
	const request = (query: Record<string, string>, headers: Record<string, string> = {}) => {
		const url = `/webhook-waiting/${EXECUTION_ID}?${new URLSearchParams(query).toString()}`;
		return mock<WaitingWebhookRequest>({
			method: 'GET',
			params: { path: EXECUTION_ID, suffix: undefined },
			query,
			url,
			originalUrl: url,
			headers: { host: 'localhost', ...headers },
		});
	};
	const response = () => {
		const res = mock<express.Response>();
		res.status.mockReturnValue(res);
		return res;
	};

	/** Lets the data plane name the waiting step of `node`, and returns the execution the reader maps. */
	const acceptResume = ({
		node = waitNode,
		path = '',
		runData = {},
	}: { node?: INode; path?: string; runData?: IRunData } = {}) => {
		dataPlane.locateResumeTarget.mockResolvedValue({
			ok: true,
			value: { execution: snapshot('waiting'), target },
		});
		const execution = {
			id: EXECUTION_ID,
			mode: 'manual',
			status: 'waiting',
			workflowData: { id: 'wf-1', name: 'wf', nodes: [{ ...node }], connections: {} },
			data: { resultData: { runData } },
		} as unknown as IExecutionResponse;
		executionReader.fromSnapshot.mockResolvedValue(execution);
		webhookService.getNodeWebhooks.mockReturnValue([
			{
				httpMethod: 'GET',
				path,
				webhookDescription: { restartWebhook: true, httpMethod: 'GET', name: 'default', path },
			} as unknown as IWebhookData,
		]);
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
		const executeWebhookSpy = vi
			.spyOn(WebhookHelpers, 'executeWebhook')
			.mockImplementation(
				async (_w, _wd, _wfd, _wsn, _m, _pr, _red, _eid, _req, _res, callback) => {
					callback(null, { noWebhookResponse: true });
					return EXECUTION_ID;
				},
			);
		return { execution, executeWebhookSpy };
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('announces no extra methods to a preflight, without the v1 lookup', async () => {
		await expect(waitingWebhooks.getWebhookMethods(EXECUTION_ID)).resolves.toEqual([]);

		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it.each([
		['without a token', {}],
		['with an empty token', { [WAITING_TOKEN_QUERY_PARAM]: '' }],
	])('answers 401 %s, before it asks the data plane', async (_, query) => {
		const res = response();

		await expect(waitingWebhooks.executeWebhook(request(query), res)).resolves.toEqual({
			noWebhookResponse: true,
		});

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
		expect(dataPlane.locateResumeTarget).not.toHaveBeenCalled();
	});

	it("relays the data plane's refusal of the token as 401, without its reason", async () => {
		dataPlane.locateResumeTarget.mockResolvedValue({
			ok: false,
			status: 401,
			error: 'invalid_token',
		});
		const res = response();

		await waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 'bad' }), res);

		expect(dataPlane.locateResumeTarget).toHaveBeenCalledWith(EXECUTION_ID, { token: 'bad' });
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
	});

	it('answers 404 for an execution the data plane does not have', async () => {
		dataPlane.locateResumeTarget.mockResolvedValue({ ok: false, status: 404, error: 'not_found' });

		await expect(
			waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response()),
		).rejects.toThrow(NotFoundError);
	});

	it.each([
		[409, 'ambiguous', ConflictError],
		[501, 'unimplemented', NotImplementedError],
		[400, 'invalid_request', BadRequestError],
	])("answers the data plane's %s refusal with its own status", async (status, error, expected) => {
		dataPlane.locateResumeTarget.mockResolvedValue({ ok: false, status, error });

		await expect(
			waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response()),
		).rejects.toThrow(expected);
	});

	it.each([
		['queued', 'is running already'],
		['running', 'is running already'],
		['waiting', 'is running already'],
		['completed', 'has finished already'],
	] as const)(
		'answers 409 when no step accepts the request and the execution is %s',
		async (status, message) => {
			dataPlane.locateResumeTarget.mockResolvedValue({
				ok: true,
				value: { execution: snapshot(status), target: null },
			});

			const answer = waitingWebhooks.executeWebhook(
				request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }),
				response(),
			);

			await expect(answer).rejects.toThrow(ConflictError);
			await expect(answer).rejects.toThrow(`The execution "${EXECUTION_ID}" ${message}.`);
		},
	);

	it('runs the waiting node under its own execution id, with the step and token the data plane named', async () => {
		const { executeWebhookSpy } = acceptResume();
		const req = request({ [WAITING_TOKEN_QUERY_PARAM]: 'token' });

		await expect(waitingWebhooks.executeWebhook(req, response())).resolves.toEqual({
			noWebhookResponse: true,
		});

		expect(dataPlane.locateResumeTarget).toHaveBeenCalledWith(EXECUTION_ID, { token: 'token' });
		const [, , , startNode, , , runExecutionData, executionId, calledReq, , , , options] =
			executeWebhookSpy.mock.calls[0];
		expect(executionId).toBe(EXECUTION_ID);
		expect(startNode.name).toBe('Wait');
		expect(runExecutionData?.resultData.lastNodeExecuted).toBe('Wait');
		expect(runExecutionData?.executionData?.nodeExecutionStack[0]?.node.name).toBe('Wait');
		// The node never sees the token.
		expect(options).toEqual(
			expect.objectContaining({ engineResume: { stepId: 'step-1', token: 'token' } }),
		);
		expect(calledReq.url).toBe(`/webhook-waiting/${EXECUTION_ID}`);
		expect(calledReq.params).toEqual({});
	});

	it('reads the webhook path that follows the token in the query', async () => {
		acceptResume({ path: 'my-suffix' });

		await expect(
			waitingWebhooks.executeWebhook(
				request({ [WAITING_TOKEN_QUERY_PARAM]: 'token/my-suffix' }),
				response(),
			),
		).resolves.toEqual({ noWebhookResponse: true });

		expect(dataPlane.locateResumeTarget).toHaveBeenCalledWith(EXECUTION_ID, { token: 'token' });
	});

	it('answers 404 when the reader cannot map the snapshot to an execution', async () => {
		acceptResume();
		executionReader.fromSnapshot.mockResolvedValue(undefined);

		await expect(
			waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response()),
		).rejects.toThrow(NotFoundError);
	});

	it('answers 404 when the workflow has no node with the id of the waiting step', async () => {
		acceptResume({ node: { ...waitNode, id: 'other-id' } });

		await expect(
			waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response()),
		).rejects.toThrow('Could not find node to process webhook.');
	});

	it('removes the auth cookie before the node gets the request', async () => {
		const { executeWebhookSpy } = acceptResume();

		await waitingWebhooks.executeWebhook(
			request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }, { cookie: 'n8n-auth=x' }),
			response(),
		);

		expect(executeWebhookSpy.mock.calls[0][8].headers.cookie).not.toContain('n8n-auth');
	});

	it('redirects the resume of a form wait to the form-waiting route', async () => {
		acceptResume({ node: { ...waitNode, parameters: { resume: 'form' } } });
		const res = response();

		await expect(
			waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), res),
		).resolves.toEqual({ noWebhookResponse: true });

		expect(res.redirect).toHaveBeenCalledWith(307, expect.stringContaining('/form-waiting/'));
	});

	it('sets the CORS headers before the node runs', async () => {
		acceptResume();
		const res = response();

		await waitingWebhooks.executeWebhook(
			request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }, { origin: 'https://example.com' }),
			res,
		);

		expect(res.setHeader).toHaveBeenCalledWith(
			'Access-Control-Allow-Origin',
			'https://example.com',
		);
	});

	it('keeps the earlier runs of the waiting node', async () => {
		const earlierRun = { startTime: 1, executionTime: 1, executionIndex: 0, source: [] };
		const waitingRun = { startTime: 2, executionTime: 0, executionIndex: 1, source: [] };
		const { execution } = acceptResume({ runData: { Wait: [earlierRun, waitingRun] } });

		await waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response());

		expect(execution.data.resultData.runData.Wait).toEqual([earlierRun]);
	});

	it('disables a copy of the waiting node, not the workflow node', async () => {
		const { execution } = acceptResume();

		await waitingWebhooks.executeWebhook(request({ [WAITING_TOKEN_QUERY_PARAM]: 't' }), response());

		expect(execution.data.executionData?.nodeExecutionStack[0].node.disabled).toBe(true);
		expect(execution.workflowData.nodes[0].disabled).toBeUndefined();
	});
});
