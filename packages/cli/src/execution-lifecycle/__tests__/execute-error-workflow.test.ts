import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import { createRunExecutionData, NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PolicyViolationError } from '@/policy/policy-violation.error';
import { OwnershipService } from '@/services/ownership.service';
import { UrlService } from '@/services/url.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { executeErrorWorkflow } from '../execute-error-workflow';

describe('executeErrorWorkflow', () => {
	mockInstance(Logger);
	mockInstance(ErrorReporter);
	const globalConfig = mockInstance(GlobalConfig);
	const urlService = mockInstance(UrlService);
	const ownershipService = mockInstance(OwnershipService);
	const workflowExecutionService = mockInstance(WorkflowExecutionService);

	Container.set(GlobalConfig, globalConfig);
	Container.set(UrlService, urlService);
	Container.set(OwnershipService, ownershipService);
	Container.set(WorkflowExecutionService, workflowExecutionService);

	const mockNode = mock<INode>({
		name: 'TestNode',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	beforeEach(() => {
		vi.resetAllMocks();
		globalConfig.nodes = mock<GlobalConfig['nodes']>({
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
		});
	});

	describe('pastExecutionUrl', () => {
		it('should use getInstanceBaseUrl for pastExecutionUrl', () => {
			const mockInstanceBaseUrl = 'https://editor.example.com';
			urlService.getInstanceBaseUrl.mockReturnValue(mockInstanceBaseUrl);

			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				name: 'Test Workflow',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});

			const testError = new NodeOperationError(mockNode, 'Test error');
			const fullRunData: IRun = {
				data: createRunExecutionData({
					resultData: {
						error: testError,
						lastNodeExecuted: 'TestNode',
						runData: {},
					},
				}),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
				status: 'error',
			};

			const mockProject = { id: 'project-123' };
			ownershipService.getWorkflowProjectCached.mockResolvedValue(mockProject as never);
			workflowExecutionService.executeErrorWorkflow.mockResolvedValue(undefined);

			executeErrorWorkflow(workflowData, fullRunData, 'trigger', 'execution-789');

			expect(urlService.getInstanceBaseUrl).toHaveBeenCalled();
		});

		it('should construct correct pastExecutionUrl format with instanceBaseUrl', async () => {
			const mockInstanceBaseUrl = 'https://editor.example.com';
			urlService.getInstanceBaseUrl.mockReturnValue(mockInstanceBaseUrl);

			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				name: 'Test Workflow',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});

			const testError = new NodeOperationError(mockNode, 'Test error');
			const fullRunData: IRun = {
				data: createRunExecutionData({
					resultData: {
						error: testError,
						lastNodeExecuted: 'TestNode',
						runData: {},
					},
				}),
				mode: 'trigger',
				startedAt: new Date(),
				storedAt: 'db',
				status: 'error',
			};

			const mockProject = { id: 'project-123' };
			ownershipService.getWorkflowProjectCached.mockResolvedValue(mockProject as never);

			let capturedWorkflowErrorData: unknown;
			workflowExecutionService.executeErrorWorkflow.mockImplementation(
				async (_errorWorkflow, workflowErrorData) => {
					capturedWorkflowErrorData = workflowErrorData;
				},
			);

			executeErrorWorkflow(workflowData, fullRunData, 'trigger', 'execution-789');

			// Wait for async operations
			await new Promise(process.nextTick);

			expect(capturedWorkflowErrorData).toMatchObject({
				execution: {
					id: 'execution-789',
					url: 'https://editor.example.com/workflow/workflow-123/executions/execution-789',
				},
			});
		});
	});

	describe('policy violations', () => {
		const makeRunData = (error: Error): IRun => ({
			data: createRunExecutionData({
				resultData: { error: error as IRun['data']['resultData']['error'], runData: {} },
			}),
			mode: 'trigger',
			startedAt: new Date(),
			storedAt: 'db',
			status: 'error',
		});

		const violation = () =>
			new PolicyViolationError([
				{ kind: 'node-type-unavailable', checkId: 'check-1', message: 'Blocked by policy' },
			]);

		// A refusal repeats on every attempt, so it must not reach user automation.
		it('does not run a configured error workflow', () => {
			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});

			executeErrorWorkflow(workflowData, makeRunData(violation()), 'trigger');

			expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
		});

		// The worse case: this would execute the graph policy just refused.
		it('does not run the workflow through its own Error Trigger', () => {
			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				settings: {},
				nodes: [mock<INode>({ type: 'n8n-nodes-base.errorTrigger' })],
			});

			executeErrorWorkflow(workflowData, makeRunData(violation()), 'internal');

			expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
		});

		// What `WorkflowRunner.processError` hands to the lifecycle hook: the error
		// spread into a plain object, so `instanceof` no longer holds.
		it('does not run the error workflow for a flattened refusal', () => {
			const error = violation();
			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});

			executeErrorWorkflow(
				workflowData,
				makeRunData({ ...error, message: error.message, stack: error.stack } as Error),
				'trigger',
				'execution-1',
			);

			expect(workflowExecutionService.executeErrorWorkflow).not.toHaveBeenCalled();
		});

		it('still runs the error workflow for an ordinary failure', async () => {
			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});
			ownershipService.getWorkflowProjectCached.mockResolvedValue({ id: 'project-1' } as never);

			executeErrorWorkflow(
				workflowData,
				makeRunData(new NodeOperationError(mockNode, 'Test error')),
				'trigger',
			);
			await new Promise(process.nextTick);

			expect(workflowExecutionService.executeErrorWorkflow).toHaveBeenCalled();
		});
	});
});
