import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { getHtmlSandboxCSP, WAITING_TOKEN_QUERY_PARAM } from 'n8n-core';
import {
	FORM_NODE_TYPE,
	WAITING_FORMS_EXECUTION_STATUS,
	type IWorkflowBase,
	type Workflow,
} from 'n8n-workflow';

import type { WaitingWebhookRequest } from '../webhook.types';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { WaitingForms } from '@/webhooks/waiting-forms';

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
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('findCompletionPage', () => {
		it('should return lastNodeExecuted if it is a non-disabled form completion node', () => {
			const workflow = mock<Workflow>({
				getParentNodes: jest.fn().mockReturnValue([]),
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
				getParentNodes: jest.fn().mockReturnValue([]),
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
				getParentNodes: jest.fn().mockReturnValue([]),
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
				getParentNodes: jest.fn().mockReturnValue([]),
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
				getParentNodes: jest.fn().mockReturnValue(['Form1', 'Form2', 'Form3']),
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
				getParentNodes: jest.fn().mockReturnValue(['Form1', 'Form2']),
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
				getParentNodes: jest.fn().mockReturnValue(['Form1', 'Form2', 'Form3']),
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
					activeVersionId: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
					activeVersionId: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
					active: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
					active: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
						error: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
						error: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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

			const mockRender = jest.fn();
			const mockStatus = jest.fn().mockReturnValue({ render: mockRender });
			const res = mock<express.Response>({
				status: mockStatus,
			});

			const result = await waitingForms.executeWebhook(req, res);

			expect(mockStatus).toHaveBeenCalledWith(401);
			expect(mockRender).toHaveBeenCalledWith('form-invalid-token');
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
					resumeToken: undefined, // Must be explicitly set to undefined; jest-mock-extended returns a truthy mock if omitted
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
