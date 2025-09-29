import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import { FORM_NODE_TYPE, WAITING_FORMS_EXECUTION_STATUS, type Workflow } from 'n8n-workflow';

import { WaitingForms } from '@/webhooks/waiting-forms';

import type { WaitingWebhookRequest } from '../webhook.types';

describe('WaitingForms', () => {
	const executionRepository = mock<ExecutionRepository>();
	const waitingForms = new WaitingForms(mock(), mock(), executionRepository, mock(), mock());

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
	});
});
