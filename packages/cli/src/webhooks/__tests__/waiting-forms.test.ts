import type { IExecutionResponse } from '@n8n/db';
import type { ExecutionSnapshot } from '@n8n/engine';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import { getHtmlSandboxCSP, WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';
import {
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
	WAITING_FORMS_EXECUTION_STATUS,
	type IWebhookData,
	type IWorkflowBase,
	type Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WaitingForms } from '@/webhooks/waiting-forms';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import type { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type { WaitingWebhookRequest } from '../webhook.types';

class TestWaitingForms extends WaitingForms {
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

describe('WaitingForms', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	const mockInstanceSettings = mock<InstanceSettings>();
	const waitingForms = new TestWaitingForms(
		mock(),
		mock(),
		executionPersistence,
		mock(),
		mockInstanceSettings,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('findCompletionPage', () => {
		it('should return lastNodeExecuted if it is a non-disabled form completion node', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					Form1: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
				},
			});

			const result = waitingForms.findCompletionPage(workflow, {}, 'Form1');
			expect(result).toBe('Form1');
		});

		it('should return undefined if lastNodeExecuted is disabled', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					Form1: {
						disabled: true,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
				},
			});

			const result = waitingForms.findCompletionPage(workflow, {}, 'Form1');
			expect(result).toBeUndefined();
		});

		it('should return undefined if lastNodeExecuted is not a form node', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					NonForm: {
						disabled: undefined,
						type: 'other-node-type',
						parameters: {},
					},
				},
			});

			const result = waitingForms.findCompletionPage(workflow, {}, 'NonForm');
			expect(result).toBeUndefined();
		});

		it('should return undefined if lastNodeExecuted operation is not completion', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue([]),
				nodes: {
					Form1: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'page',
						},
					},
				},
			});

			const result = waitingForms.findCompletionPage(workflow, {}, 'Form1');
			expect(result).toBeUndefined();
		});

		it('should find first valid completion form in parent nodes if lastNodeExecuted is not valid', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue(['Form1', 'Form2', 'Form3']),
				nodes: {
					LastNode: {
						disabled: undefined,
						type: 'other-node-type',
						parameters: {},
					},
					Form1: {
						disabled: true,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
					Form2: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
					Form3: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
				},
			});

			const runData = {
				Form2: [],
				Form3: [],
			};

			const result = waitingForms.findCompletionPage(workflow, runData, 'LastNode');
			expect(result).toBe('Form3');
		});

		it('should return undefined if no valid completion form is found in parent nodes', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue(['Form1', 'Form2']),
				nodes: {
					LastNode: {
						disabled: undefined,
						type: 'other-node-type',
						parameters: {},
					},
					Form1: {
						disabled: true,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
					Form2: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'submit',
						},
					},
				},
			});

			const result = waitingForms.findCompletionPage(workflow, {}, 'LastNode');
			expect(result).toBeUndefined();
		});

		it('should skip parent nodes without runData', () => {
			const workflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue(['Form1', 'Form2', 'Form3']),
				nodes: {
					LastNode: {
						disabled: undefined,
						type: 'other-node-type',
						parameters: {},
					},
					Form1: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
					Form2: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
					Form3: {
						disabled: undefined,
						type: FORM_NODE_TYPE,
						parameters: {
							operation: 'completion',
						},
					},
				},
			});

			const runData = {
				Form2: [],
			};

			const result = waitingForms.findCompletionPage(workflow, runData, 'LastNode');
			expect(result).toBe('Form2');
		});

		it('should not render a form for an execution parked at a node boundary', async () => {
			const execution = mock<IExecutionResponse>({
				status: 'waiting',
				data: { waitReason: 'suspended', resumeToken: undefined, resultData: { error: undefined } },
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: {},
				params: { path: '123', suffix: undefined },
			});
			const res = mock<express.Response>();

			const result = await waitingForms.executeWebhook(req, res);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.render).not.toHaveBeenCalled();
		});

		const statusPoll = async (waitReason?: 'suspended') => {
			const execution = mock<IExecutionResponse>({
				status: 'waiting',
				data: {
					waitReason,
					resumeToken: undefined,
					executionData: {
						nodeExecutionStack: [{ node: { type: FORM_NODE_TYPE, parameters: {} } }],
					},
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);
			const req = mock<WaitingWebhookRequest>({
				headers: {},
				params: { path: '123', suffix: WAITING_FORMS_EXECUTION_STATUS },
			});
			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);
			return res;
		};

		it('should report form-waiting when the run paused at a form node', async () => {
			const res = await statusPoll();
			expect(res.send).toHaveBeenCalledWith('form-waiting');
		});

		it('should report plain waiting for a run parked before a form node', async () => {
			const res = await statusPoll('suspended');
			expect(res.send).toHaveBeenCalledWith('waiting');
		});

		it('should return status of execution if suffix is WAITING_FORMS_EXECUTION_STATUS', async () => {
			const execution = mock<IExecutionResponse>({
				status: 'success',
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: {},
				params: {
					path: '123',
					suffix: WAITING_FORMS_EXECUTION_STATUS,
				},
			});

			const res = mock<express.Response>();

			const result = await waitingForms.executeWebhook(req, res);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.send).toHaveBeenCalledWith(execution.status);
		});

		it('should set CORS headers when origin header is present for status endpoint', async () => {
			const execution = mock<IExecutionResponse>({
				status: 'success',
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { origin: 'null' },
				params: {
					path: '123',
					suffix: WAITING_FORMS_EXECUTION_STATUS,
				},
			});

			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});

		it('should not override existing Access-Control-Allow-Origin header', async () => {
			const execution = mock<IExecutionResponse>({
				status: 'success',
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { origin: 'null' },
				params: {
					path: '123',
					suffix: WAITING_FORMS_EXECUTION_STATUS,
				},
			});

			const res = mock<express.Response>();
			res.setHeader.mockImplementation(() => res);
			res.getHeader.mockReturnValue('https://example.com');

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});
		it('should set CORS headers to wildcard when origin header is missing for status endpoint', async () => {
			const execution = mock<IExecutionResponse>({
				status: 'success',
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { origin: undefined },
				params: {
					path: '123',
					suffix: WAITING_FORMS_EXECUTION_STATUS,
				},
			});

			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});

		it('should not set CORS headers for non-status endpoints', async () => {
			const execution = mock<IExecutionResponse>({
				finished: true,
				status: 'success',
				data: {
					resultData: {
						lastNodeExecuted: 'LastNode',
						runData: {},
						error: undefined,
					},
					resumeToken: undefined, // Old execution without token - skip validation
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'LastNode',
							type: 'other-node-type',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { origin: 'null', host: 'localhost:5678' },
				params: {
					path: '123',
					suffix: undefined,
				},
				url: '/form-waiting/123',
			});

			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).not.toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				expect.anything(),
			);
		});

		it('should handle old executions with missing activeVersionId field when active=true', () => {
			const execution = mock<IExecutionResponse>({
				workflowData: {
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
				},
			});

			const workflow = waitingForms.exposeCreateWorkflow(execution.workflowData);

			expect(workflow.active).toBe(true);
		});

		it('should handle old executions with missing activeVersionId field when active=false', () => {
			const execution = mock<IExecutionResponse>({
				workflowData: {
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
				},
			});

			const workflow = waitingForms.exposeCreateWorkflow(execution.workflowData);

			expect(workflow.active).toBe(false);
		});

		it('should set active to true when activeVersionId exists', () => {
			const execution = mock<IExecutionResponse>({
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					active: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
					activeVersionId: 'version-123',
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			const workflow = waitingForms.exposeCreateWorkflow(execution.workflowData);

			expect(workflow.active).toBe(true);
		});

		it('should set active to false when activeVersionId is null', () => {
			const execution = mock<IExecutionResponse>({
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					active: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
					activeVersionId: null,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			const workflow = waitingForms.exposeCreateWorkflow(execution.workflowData);

			expect(workflow.active).toBe(false);
		});
	});

	describe('executeWebhook - default completion page', () => {
		it('should set CSP header when rendering default completion page', async () => {
			const execution = mock<IExecutionResponse>({
				finished: true,
				status: 'success',
				data: {
					resultData: {
						lastNodeExecuted: 'LastNode',
						runData: {},
						error: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
					},
					resumeToken: undefined, // Old execution without token
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'LastNode',
							type: 'other-node-type',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { host: 'localhost:5678' },
				params: {
					path: '123',
					suffix: undefined,
				},
				url: '/form-waiting/123',
			});

			const res = mock<express.Response>();

			const result = await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
			expect(res.render).toHaveBeenCalledWith('form-trigger-completion', {
				title: 'Form Submitted',
				message: 'Your response has been recorded',
				formTitle: 'Form Submitted',
			});
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should include sandbox directive in CSP header for security', async () => {
			const execution = mock<IExecutionResponse>({
				finished: true,
				status: 'success',
				data: {
					resultData: {
						lastNodeExecuted: 'LastNode',
						runData: {},
						error: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
					},
					resumeToken: undefined, // Old execution without token
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'LastNode',
							type: 'other-node-type',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { host: 'localhost:5678' },
				params: {
					path: '123',
					suffix: undefined,
				},
				url: '/form-waiting/123',
			});

			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
		});
	});

	describe('executeWebhook - token validation', () => {
		it('should return 401 when resumeToken is set but request has no token', async () => {
			const execution = mock<IExecutionResponse>({
				finished: false,
				status: 'waiting',
				data: {
					resultData: {
						lastNodeExecuted: 'FormNode',
						runData: {},
						error: undefined,
					},
					resumeToken: 'a'.repeat(64),
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { host: 'localhost:5678' },
				params: {
					path: '123',
					suffix: undefined,
				},
				url: '/form-waiting/123', // No token in URL
			});

			const mockRender = vi.fn();
			const mockStatus = vi.fn().mockReturnValue({ render: mockRender });
			const res = mock<express.Response>({
				status: mockStatus,
			});

			const result = await waitingForms.executeWebhook(req, res);

			expect(mockStatus).toHaveBeenCalledWith(401);
			expect(mockRender).toHaveBeenCalledWith('form-invalid-token');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should skip token validation when resumeToken is undefined (backwards compat)', async () => {
			const execution = mock<IExecutionResponse>({
				finished: true,
				status: 'success',
				data: {
					resultData: {
						lastNodeExecuted: 'LastNode',
						runData: {},
						error: undefined,
					},
					resumeToken: undefined, // Must be explicitly set to undefined; vitest-mock-extended returns a truthy mock if omitted
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'LastNode',
							type: 'other-node-type',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
			executionPersistence.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: { host: 'localhost:5678' },
				params: {
					path: '123',
					suffix: undefined,
				},
				url: '/form-waiting/123', // No token, but validation is skipped
			});

			const res = mock<express.Response>();

			// Should not throw or return 401 - should proceed to render completion page
			const result = await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});

	describe('validateToken - backwards compat webhook path extraction', () => {
		const TEST_TOKEN = 'a'.repeat(64);

		const createMockRequest = (opts: { host?: string; signature?: string; path?: string }) => {
			const urlPath = opts.path ?? '/form-waiting/123';
			const fullUrl = opts.signature
				? `${urlPath}?${WAITING_TOKEN_QUERY_PARAM}=${opts.signature}`
				: urlPath;
			return mock<express.Request>({
				url: fullUrl,
				headers: { host: opts.host ?? 'localhost:5678' },
			});
		};

		const createMockExecution = (token: string) =>
			mock<IExecutionResponse>({
				data: { resumeToken: token },
			});

		it('should extract webhook path from token when appended (backwards compat)', () => {
			/* Arrange - URL format: ?signature=token/suffix */
			const tokenWithSuffix = `${TEST_TOKEN}/my-custom-suffix`;
			const mockReq = createMockRequest({ signature: tokenWithSuffix });
			const mockExecution = createMockExecution(TEST_TOKEN);

			/* Act */
			const result = waitingForms.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'my-custom-suffix' });
		});

		it('should handle nested suffix paths in token (backwards compat)', () => {
			/* Arrange - URL format: ?signature=token/path/to/suffix */
			const tokenWithNestedSuffix = `${TEST_TOKEN}/path/to/suffix`;
			const mockReq = createMockRequest({ signature: tokenWithNestedSuffix });
			const mockExecution = createMockExecution(TEST_TOKEN);

			/* Act */
			const result = waitingForms.exposeValidateToken(mockReq, mockExecution);

			/* Assert */
			expect(result).toEqual({ valid: true, webhookPath: 'path/to/suffix' });
		});

		it('should reject when token does not match', () => {
			const mockReq = createMockRequest({ signature: 'b'.repeat(64) });
			const mockExecution = createMockExecution(TEST_TOKEN);

			const result = waitingForms.exposeValidateToken(mockReq, mockExecution);

			expect(result).toEqual({ valid: false, webhookPath: undefined });
		});
	});

	describe('cookie sanitization (n8nUserAuth)', () => {
		const buildExecutionWithResumeNode = (resumeNodeType: string) =>
			mock<IExecutionResponse>({
				finished: true,
				status: 'success',
				data: {
					resultData: {
						lastNodeExecuted: 'ResumeNode',
						runData: {},
						error: undefined,
					},
					resumeToken: undefined,
				},
				workflowData: {
					id: 'workflow1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'ResumeNode',
							type: resumeNodeType,
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
					active: false,
					activeVersionId: undefined,
					settings: {},
					staticData: {},
					isArchived: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

		const buildReqWithAuthCookie = () =>
			({
				method: 'GET',
				headers: { host: 'localhost:5678', cookie: 'n8n-auth=jwt.token; other=value' },
				cookies: { 'n8n-auth': 'jwt.token', other: 'value' },
				params: { path: '123', suffix: undefined },
				url: '/form-waiting/123',
			}) as unknown as WaitingWebhookRequest;

		it('preserves the n8n-auth cookie when the resume node is a Form node', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecutionWithResumeNode(FORM_NODE_TYPE),
			);

			const req = buildReqWithAuthCookie();
			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(req.headers.cookie).toContain('n8n-auth=jwt.token');
			expect(req.cookies['n8n-auth']).toBe('jwt.token');
		});

		it('strips the n8n-auth cookie when the resume node is not allowlisted', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(
				buildExecutionWithResumeNode('other-node-type'),
			);

			const req = buildReqWithAuthCookie();
			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(req.headers.cookie).not.toContain('n8n-auth=');
			expect(req.headers.cookie).toContain('other=value');
			expect(req.cookies['n8n-auth']).toBeUndefined();
		});

		it('strips the n8n-auth cookie when the execution cannot be resolved', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(undefined);

			const req = buildReqWithAuthCookie();
			const res = mock<express.Response>();

			try {
				await waitingForms.executeWebhook(req, res);
			} catch {
				// NotFoundError is expected for missing execution; we still want to verify sanitize ran first.
			}

			expect(req.headers.cookie).not.toContain('n8n-auth=');
			expect(req.cookies['n8n-auth']).toBeUndefined();
		});
	});
});

describe('WaitingForms on an engine v2 execution', () => {
	const EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';
	const dataPlane = mock<EngineDataPlaneProxyService>();
	const executionReader = mock<EngineV2ExecutionReader>();
	const webhookService = mock<WebhookService>();
	const waitingForms = new WaitingForms(
		mock(),
		mock(),
		mock<ExecutionPersistence>(),
		webhookService,
		mock<InstanceSettings>(),
		mock(),
		mock(),
		dataPlane,
		executionReader,
	);

	const formNode = { id: 'form-id', name: 'Form', type: FORM_NODE_TYPE, parameters: {} };
	const waitNode = {
		id: 'wait-id',
		name: 'Wait',
		type: WAIT_NODE_TYPE,
		parameters: { resume: 'webhook' },
	};
	// Plain objects, not `mock()`: the route clones the node, and a proxy cannot be cloned.
	const snapshot = (status: ExecutionSnapshot['status']) =>
		({
			id: EXECUTION_ID,
			status,
			workflow: { nodes: [formNode, waitNode] },
		}) as unknown as ExecutionSnapshot;
	const request = (suffix: string | undefined, headers: Record<string, string> = {}) =>
		mock<WaitingWebhookRequest>({
			method: 'GET',
			params: { path: EXECUTION_ID, suffix },
			query: { [WAITING_TOKEN_QUERY_PARAM]: 't' },
			url: `/form-waiting/${EXECUTION_ID}/${suffix ?? ''}?${WAITING_TOKEN_QUERY_PARAM}=t`,
			headers: { host: 'localhost', ...headers },
		});
	const response = () => {
		const res = mock<express.Response>();
		res.status.mockReturnValue(res);
		return res;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('answers a bad token with the invalid-token page', async () => {
		dataPlane.locateResumeTarget.mockResolvedValue({
			ok: false,
			status: 401,
			error: 'invalid_token',
		});
		const res = response();

		await waitingForms.executeWebhook(request(undefined), res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.render).toHaveBeenCalledWith('form-invalid-token');
		expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
	});

	it.each([
		['form-waiting', 'waiting', 'a form target', { stepId: 'step-1', nodeId: 'form-id' }],
		['waiting', 'waiting', 'a webhook target', { stepId: 'step-1', nodeId: 'wait-id' }],
		['running', 'running', 'a form target', { stepId: 'step-1', nodeId: 'form-id' }],
		['running', 'running', 'no target', null],
	] as const)(
		"answers '%s' to the status poll of a %s execution with %s",
		async (expected, status, _, target) => {
			dataPlane.locateResumeTarget.mockResolvedValue({
				ok: true,
				value: { execution: snapshot(status), target },
			});
			const res = response();

			await expect(
				waitingForms.executeWebhook(
					request(WAITING_FORMS_EXECUTION_STATUS, { origin: 'https://example.com' }),
					res,
				),
			).resolves.toEqual({ noWebhookResponse: true });

			expect(res.send).toHaveBeenCalledWith(expected);
			expect(res.setHeader).toHaveBeenCalledWith(
				'Access-Control-Allow-Origin',
				'https://example.com',
			);
		},
	);

	it.each(['running', 'queued'] as const)(
		'answers nothing while a %s execution has not reached its form, so the page keeps polling',
		async (status) => {
			dataPlane.locateResumeTarget.mockResolvedValue({
				ok: true,
				value: { execution: snapshot(status), target: null },
			});
			const res = response();

			await expect(waitingForms.executeWebhook(request(undefined), res)).resolves.toEqual({
				noWebhookResponse: true,
			});

			expect(res.render).not.toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		},
	);

	it('renders the completion page for an execution that completed', async () => {
		dataPlane.locateResumeTarget.mockResolvedValue({
			ok: true,
			value: { execution: snapshot('completed'), target: null },
		});
		const res = response();

		await waitingForms.executeWebhook(request(undefined), res);

		expect(res.render).toHaveBeenCalledWith('form-trigger-completion', expect.any(Object));
		expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
	});

	it('answers 409 for an execution that failed', async () => {
		dataPlane.locateResumeTarget.mockResolvedValue({
			ok: true,
			value: { execution: snapshot('failed'), target: null },
		});

		await expect(waitingForms.executeWebhook(request(undefined), response())).rejects.toThrow(
			'has finished already',
		);
	});

	it.each([
		['keeps', 'Form', formNode, 'n8n-auth=x'],
		['removes', 'Wait', { ...waitNode, parameters: { resume: 'form' } }, ''],
	] as const)(
		'%s the auth cookie when a %s node waits for the form',
		async (_, __, node, cookie) => {
			dataPlane.locateResumeTarget.mockResolvedValue({
				ok: true,
				value: { execution: snapshot('waiting'), target: { stepId: 'step-1', nodeId: node.id } },
			});
			executionReader.fromSnapshot.mockResolvedValue({
				id: EXECUTION_ID,
				mode: 'manual',
				status: 'waiting',
				workflowData: { id: 'wf-1', name: 'wf', nodes: [node], connections: {} },
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);
			webhookService.getNodeWebhooks.mockReturnValue([
				{
					httpMethod: 'GET',
					path: '',
					webhookDescription: { restartWebhook: true, nodeType: 'form' },
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

			await waitingForms.executeWebhook(request(undefined, { cookie: 'n8n-auth=x' }), response());

			expect(executeWebhookSpy.mock.calls[0][8].headers.cookie).toBe(cookie);
		},
	);
});
