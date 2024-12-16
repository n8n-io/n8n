import { mock } from 'jest-mock-extended';
import { FORM_NODE_TYPE, type Workflow } from 'n8n-workflow';

import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WaitingForms } from '@/webhooks/waiting-forms';

describe('WaitingForms', () => {
	const executionRepository = mock<ExecutionRepository>();
	const waitingWebhooks = new WaitingForms(mock(), mock(), executionRepository, mock());

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

			const result = waitingWebhooks.findCompletionPage(workflow, {}, 'Form1');
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

			const result = waitingWebhooks.findCompletionPage(workflow, {}, 'Form1');
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

			const result = waitingWebhooks.findCompletionPage(workflow, {}, 'NonForm');
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

			const result = waitingWebhooks.findCompletionPage(workflow, {}, 'Form1');
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

			const result = waitingWebhooks.findCompletionPage(workflow, runData, 'LastNode');
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

			const result = waitingWebhooks.findCompletionPage(workflow, {}, 'LastNode');
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

			const result = waitingWebhooks.findCompletionPage(workflow, runData, 'LastNode');
			expect(result).toBe('Form2');
		});
	});
});
