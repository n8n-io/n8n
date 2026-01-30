import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { IExecutionResponse, ExecutionRepository, Project } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { WorkflowExecute as ActualWorkflowExecute, InstanceSettings } from 'n8n-core';
import { ExternalSecretsProxy } from 'n8n-core';
import { mockInstance } from 'n8n-core/test/utils';
import {
	type IPinData,
	type ITaskData,
	type IWorkflowExecuteAdditionalData,
	Workflow,
	type IRunExecutionData,
	type WorkflowExecuteMode,
	type ExecutionError,
} from 'n8n-workflow';

import { JobProcessor } from '../job-processor';
import type { Job } from '../scaling.types';

import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExternalHooks } from '@/external-hooks';
import type { ManualExecutionService } from '@/manual-execution.service';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

mockInstance(VariablesService, {
	getAllCached: jest.fn().mockResolvedValue([]),
});
mockInstance(CredentialsHelper);
mockInstance(ExternalSecretsProxy);
mockInstance(WorkflowStaticDataService);
mockInstance(WorkflowStatisticsService);
mockInstance(ExternalHooks);
mockInstance(DataTableProxyService);
mockInstance(OwnershipService, {
	getWorkflowProjectCached: jest.fn().mockResolvedValue(mock<Project>({ id: 'project-id' })),
});

const processRunExecutionDataMock = jest.fn();
jest.mock('n8n-core', () => {
	const original = jest.requireActual('n8n-core');

	// Mock class constructor and prototype methods
	return {
		...original,
		WorkflowExecute: jest.fn().mockImplementation(() => ({
			processRunExecutionData: processRunExecutionDataMock,
		})),
	};
});

const logger = mock<Logger>({
	scoped: jest.fn().mockImplementation(() => logger),
});

const executionsConfig = mock<ExecutionsConfig>({
	timeout: -1,
	maxTimeout: 3600,
});

describe('JobProcessor', () => {
	it('should refrain from processing a crashed execution', async () => {
		const executionRepository = mock<ExecutionRepository>();
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'crashed' }),
		);
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			executionsConfig,
			mock(),
		);

		const result = await jobProcessor.processJob(mock<Job>());

		expect(result).toEqual({ success: false });
	});

	it.each(['manual', 'evaluation'] satisfies WorkflowExecuteMode[])(
		'should use manualExecutionService to process a job in %p mode',
		async (mode) => {
			const executionRepository = mock<ExecutionRepository>();
			executionRepository.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					mode,
					workflowData: { nodes: [] },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);

			const manualExecutionService = mock<ManualExecutionService>();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				mock(),
				mock(),
				mock(),
				manualExecutionService,
				executionsConfig,
				mock(),
			);

			const job = mock<Job>();

			await jobProcessor.processJob(job);

			expect(manualExecutionService.runManually).toHaveBeenCalledTimes(1);

			expect(job.progress).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'job-finished',
					success: true,
				}),
			);
		},
	);

	it('should send job-finished with success=false when execution has errors', async () => {
		const executionRepository = mock<ExecutionRepository>();
		// First call: initial execution fetch (no error yet)
		executionRepository.findSingleExecution.mockResolvedValueOnce(
			mock<IExecutionResponse>({
				mode: 'manual',
				workflowData: { nodes: [] },
				data: mock<IRunExecutionData>({
					executionData: undefined,
				}),
			}),
		);
		// Second call: after execution completes, fetch again to check for errors
		executionRepository.findSingleExecution.mockResolvedValueOnce(
			mock<IExecutionResponse>({
				status: 'error',
				data: {
					resultData: {
						error: mock<ExecutionError>(),
					},
				},
			}),
		);

		const manualExecutionService = mock<ManualExecutionService>();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
			executionsConfig,
			mock(),
		);

		const job = mock<Job>();

		await jobProcessor.processJob(job);

		expect(job.progress).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'job-finished',
				success: false,
			}),
		);
	});

	it('should pass additional data for partial executions to run', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const pinData: IPinData = { pinned: [] };
		const execution = mock<IExecutionResponse>({
			mode: 'manual',
			workflowData: { id: 'workflow-id', nodes: [], pinData },
			data: mock<IRunExecutionData>({
				resultData: {
					runData: {
						trigger: [mock<ITaskData>({ executionIndex: 1 })],
						node: [mock<ITaskData>({ executionIndex: 3 }), mock<ITaskData>({ executionIndex: 4 })],
					},
					pinData,
				},
				executionData: undefined,
			}),
		});
		executionRepository.findSingleExecution.mockResolvedValue(execution);

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		const manualExecutionService = mock<ManualExecutionService>();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
			executionsConfig,
			mock(),
		);

		const executionId = 'execution-id';
		await jobProcessor.processJob(mock<Job>({ data: { executionId, loadStaticData: false } }));

		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({
			workflowId: execution.workflowData.id,
			executionTimeoutTimestamp: undefined,
			workflowSettings: execution.workflowData.settings,
		});

		expect(manualExecutionService.runManually).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'manual',
			}),
			expect.any(Workflow),
			additionalData,
			executionId,
			pinData,
		);
	});

	it.each(['manual', 'evaluation', 'trigger'] satisfies WorkflowExecuteMode[])(
		'should use workflowExecute to process a job with mode %p with execution data',
		async (mode) => {
			const { WorkflowExecute } = await import('n8n-core');
			// Type it correctly so we can use mock methods later
			const MockedWorkflowExecute = WorkflowExecute as jest.MockedClass<
				typeof ActualWorkflowExecute
			>;
			MockedWorkflowExecute.mockClear();

			const executionRepository = mock<ExecutionRepository>();
			const executionData = mock<IRunExecutionData>({
				startData: undefined,
				executionData: {
					nodeExecutionStack: [
						{
							node: { name: 'node-name' },
						},
					],
				},
			});
			executionRepository.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					mode,
					workflowData: { nodes: [] },
					data: executionData,
				}),
			);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const manualExecutionService = mock<ManualExecutionService>();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				mock(),
				mock(),
				mock(),
				manualExecutionService,
				executionsConfig,
				mock(),
			);

			await jobProcessor.processJob(mock<Job>());

			// Assert the constructor and method were called
			expect(MockedWorkflowExecute).toHaveBeenCalledWith(additionalData, mode, executionData);
			expect(processRunExecutionDataMock).toHaveBeenCalled();
		},
	);

	describe('MCP execution support', () => {
		it('should send mcp-response message for MCP executions after job completion', async () => {
			const executionRepository = mock<ExecutionRepository>();
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			// Second call for checking errors
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: { resultData: {} },
				}),
			);

			const manualExecutionService = mock<ManualExecutionService>();
			const mcpInstanceSettings = {
				hostId: 'worker-host-123',
			} as unknown as InstanceSettings;

			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				mock(), // workflowRepository
				mock(), // nodeTypes
				mcpInstanceSettings, // instanceSettings
				manualExecutionService,
				executionsConfig,
				mock(), // eventService
			);

			const job = mock<Job>();
			job.data = {
				workflowId: 'wf-1',
				executionId: 'exec-mcp-123',
				loadStaticData: false,
				isMcpExecution: true,
				mcpType: 'service',
				mcpSessionId: 'session-456',
				mcpMessageId: 'msg-789',
				originMainId: 'main-host-abc',
			};

			await jobProcessor.processJob(job);

			// Should have called progress with mcp-response
			expect(job.progress).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'mcp-response',
					executionId: 'exec-mcp-123',
					mcpType: 'service',
					sessionId: 'session-456',
					messageId: 'msg-789',
					workerId: 'worker-host-123',
					targetMainId: 'main-host-abc',
				}),
			);
		});

		it('should not send mcp-response for non-MCP executions', async () => {
			const executionRepository = mock<ExecutionRepository>();
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: { resultData: {} },
				}),
			);

			const manualExecutionService = mock<ManualExecutionService>();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				mock(),
				mock(),
				mock(),
				manualExecutionService,
				executionsConfig,
				mock(),
			);

			const job = mock<Job>();
			job.data = {
				workflowId: 'wf-1',
				executionId: 'exec-regular-123',
				loadStaticData: false,
				// No MCP fields - explicitly undefined
				isMcpExecution: undefined,
				mcpSessionId: undefined,
				originMainId: undefined,
			};

			await jobProcessor.processJob(job);

			// Should have called progress only with job-finished, not mcp-response
			const progressCalls = (job.progress as jest.Mock).mock.calls;
			const mcpResponseCalls = progressCalls.filter(
				(call: unknown[]) => (call[0] as { kind: string }).kind === 'mcp-response',
			);
			expect(mcpResponseCalls).toHaveLength(0);
		});

		it('should include success=false in mcp-response when execution has errors', async () => {
			const executionRepository = mock<ExecutionRepository>();
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			// Second call shows error
			executionRepository.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'error',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: {
						resultData: {
							error: mock<ExecutionError>({ message: 'Test error' }),
						},
					},
				}),
			);

			const manualExecutionService = mock<ManualExecutionService>();
			const mcpInstanceSettings = {
				hostId: 'worker-host-123',
			} as unknown as InstanceSettings;

			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				mock(), // workflowRepository
				mock(), // nodeTypes
				mcpInstanceSettings, // instanceSettings
				manualExecutionService,
				executionsConfig,
				mock(), // eventService
			);

			const job = mock<Job>();
			job.data = {
				workflowId: 'wf-1',
				executionId: 'exec-mcp-error',
				loadStaticData: false,
				isMcpExecution: true,
				mcpType: 'service',
				mcpSessionId: 'session-456',
				mcpMessageId: 'msg-789',
				originMainId: 'main-host-abc',
			};

			await jobProcessor.processJob(job);

			expect(job.progress).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'mcp-response',
					response: expect.objectContaining({
						success: false,
					}),
				}),
			);
		});
	});
});
