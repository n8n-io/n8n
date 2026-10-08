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
import { UrlService } from '@n8n/backend-services';
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

	describe('execution context handed to the error workflow', () => {
		const runtimeData = {
			version: 1 as const,
			establishedAt: 2000000000,
			source: 'webhook' as const,
			credentials: 'sealed-identity-carrier',
			secureArtifacts: 'stripped-trigger-values',
			redaction: { version: 2 as const, production: true, manual: false },
			executedByUserId: 'user-who-ran-the-failed-workflow',
			usesDynamicCredentials: true,
		};

		const runFailedWorkflow = async () => {
			const workflowData = mock<IWorkflowBase>({
				id: 'workflow-123',
				name: 'Failing workflow',
				settings: { errorWorkflow: 'error-workflow-456' },
				nodes: [],
			});
			const data = createRunExecutionData({
				resultData: {
					error: new NodeOperationError(
						mockNode,
						'Test error',
					) as IRun['data']['resultData']['error'],
					lastNodeExecuted: 'TestNode',
					runData: {},
				},
				executionData: { nodeExecutionStack: [] },
			});
			data.executionData!.runtimeData = runtimeData;

			ownershipService.getWorkflowProjectCached.mockResolvedValue({ id: 'project-1' } as never);

			executeErrorWorkflow(
				workflowData,
				{ data, mode: 'trigger', startedAt: new Date(), storedAt: 'db', status: 'error' },
				'trigger',
				'execution-1',
			);
			await new Promise(process.nextTick);

			const [, workflowErrorData] =
				workflowExecutionService.executeErrorWorkflow.mock.calls.at(0) ?? [];
			return workflowErrorData!.execution!.executionContext;
		};

		it('omits the identity carrier and the secure artifacts', async () => {
			const executionContext = await runFailedWorkflow();

			expect(executionContext).toBeDefined();
			expect(executionContext).not.toHaveProperty('credentials');
			expect(executionContext).not.toHaveProperty('secureArtifacts');
		});

		// This same payload becomes the error workflow's start-item `$json`, so a
		// carrier left on it would be readable workflow data, not just inherited state.
		it('passes only the non-identity fields', async () => {
			expect(await runFailedWorkflow()).toEqual({
				version: 1,
				establishedAt: 2000000000,
				source: 'webhook',
				redaction: { version: 2, production: true, manual: false },
				executedByUserId: 'user-who-ran-the-failed-workflow',
				usesDynamicCredentials: true,
			});
		});
	});
});
