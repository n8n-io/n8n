import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import { getWebhookSandboxCSP } from 'n8n-core';
import { FORM_NODE_TYPE, WAITING_FORMS_EXECUTION_STATUS, type Workflow } from 'n8n-workflow';

import type { WaitingWebhookRequest } from '../webhook.types';

import { WaitingForms } from '@/webhooks/waiting-forms';

class TestWaitingForms extends WaitingForms {
	exposeGetWorkflow(execution: IExecutionResponse): Workflow {
		return this.getWorkflow(execution);
	}
}

describe('WaitingForms', () => {
	const executionRepository = mock<ExecutionRepository>();
	const waitingForms = new TestWaitingForms(mock(), mock(), executionRepository, mock(), mock());

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
			executionRepository.findSingleExecution.mockResolvedValue(execution);

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

			const workflow = waitingForms.exposeGetWorkflow(execution);

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

			const workflow = waitingForms.exposeGetWorkflow(execution);

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

			const workflow = waitingForms.exposeGetWorkflow(execution);

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

			const workflow = waitingForms.exposeGetWorkflow(execution);

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
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: {},
				params: {
					path: '123',
					suffix: undefined,
				},
			});

			const res = mock<express.Response>();

			const result = await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getWebhookSandboxCSP());
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
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const req = mock<WaitingWebhookRequest>({
				headers: {},
				params: {
					path: '123',
					suffix: undefined,
				},
			});

			const res = mock<express.Response>();

			await waitingForms.executeWebhook(req, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
		});
	});
});
