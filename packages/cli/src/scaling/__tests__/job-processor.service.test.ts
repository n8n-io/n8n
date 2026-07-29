import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { IExecutionResponse, ExecutionRepository, Project } from '@n8n/db';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
import type { WorkflowExecute as ActualWorkflowExecute, InstanceSettings } from 'n8n-core';
import { ExternalSecretsProxy } from 'n8n-core';
import { mockInstance } from 'n8n-core/test/utils';
import {
	type IPinData,
	type IRun,
	type ITaskData,
	type IWorkflowExecuteAdditionalData,
	Workflow,
	type IRunExecutionData,
	type WorkflowExecuteMode,
	type ExecutionError,
} from 'n8n-workflow';
import type { Mock, MockedClass } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExternalHooks } from '@/external-hooks';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ManualExecutionService } from '@/manual-execution.service';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { JobProcessor } from '../job-processor';
import type { Job } from '../scaling.types';

mockInstance(WorkflowPublishHistoryRepository);
mockInstance(VariablesService, {
	getAllCached: vi.fn().mockResolvedValue([]),
});
mockInstance(CredentialsHelper);
mockInstance(ExternalSecretsProxy);
mockInstance(WorkflowStaticDataService);
mockInstance(WorkflowStatisticsService);
mockInstance(ExternalHooks);
mockInstance(WorkflowHookContextService);
mockInstance(DataTableProxyService);
mockInstance(OwnershipService, {
	getWorkflowProjectCached: vi.fn().mockResolvedValue(mock<Project>({ id: 'project-id' })),
});

const processRunExecutionDataMock = vi.fn();
vi.mock('n8n-core', async () => {
	const original = await vi.importActual<typeof import('n8n-core')>('n8n-core');

	// Mock class constructor and prototype methods
	return {
		...original,
		WorkflowExecute: vi.fn(function () {
			return { processRunExecutionData: processRunExecutionDataMock };
		}),
	};
});

const logger = mock<Logger>({
	scoped: vi.fn().mockImplementation(() => logger),
});

const executionsConfig = mock<ExecutionsConfig>({
	timeout: -1,
	maxTimeout: 3600,
});

const successRun = (): IRun =>
	mock<IRun>({
		status: 'success',
		stoppedAt: new Date(),
		data: mock<IRunExecutionData>({
			resultData: { runData: {}, error: undefined },
			executionData: undefined,
		}),
	});

const errorRun = (error: ExecutionError): IRun =>
	mock<IRun>({
		status: 'error',
		stoppedAt: new Date(),
		data: mock<IRunExecutionData>({
			resultData: { runData: {}, error },
			executionData: undefined,
		}),
	});

const createManualExecutionServiceMock = (run: IRun = successRun()): ManualExecutionService => {
	const svc = mock<ManualExecutionService>();
	svc.runManually.mockReturnValue(Promise.resolve(run) as ReturnType<typeof svc.runManually>);
	return svc;
};

describe('JobProcessor', () => {
	beforeEach(() => {
		processRunExecutionDataMock.mockReset();
		processRunExecutionDataMock.mockResolvedValue(successRun());
	});

	it('should refrain from processing a crashed execution', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'crashed' }),
		);
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
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

	it('should throw a descriptive error when the execution has no run data', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				id: 'execution-id',
				mode: 'trigger',
				workflowData: { nodes: [] },
				data: undefined,
			}),
		);

		const manualExecutionService = createManualExecutionServiceMock();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
			executionsConfig,
			mock(),
		);

		const job = mock<Job>({ data: { executionId: 'execution-id', loadStaticData: false } });

		await expect(jobProcessor.processJob(job)).rejects.toThrow(/without run data/);
		expect(manualExecutionService.runManually).not.toHaveBeenCalled();
	});

	it.each(['manual', 'evaluation'] satisfies WorkflowExecuteMode[])(
		'should use manualExecutionService to process a job in %p mode',
		async (mode) => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					mode,
					workflowData: { nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValueOnce(
			mock<IExecutionResponse>({
				mode: 'manual',
				workflowData: { nodes: [], staticData: {} },
				data: mock<IRunExecutionData>({
					executionData: undefined,
				}),
			}),
		);

		const manualExecutionService = createManualExecutionServiceMock(
			errorRun(mock<ExecutionError>()),
		);
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
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
			workflowData: { id: 'workflow-id', nodes: [], pinData, staticData: {} },
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
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(execution);

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		const manualExecutionService = createManualExecutionServiceMock();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
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

	it('should set restartExecutionId on additionalData when provided in job data', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const execution = mock<IExecutionResponse>({
			mode: 'manual',
			workflowData: { id: 'workflow-id', nodes: [], staticData: {} },
			data: mock<IRunExecutionData>({
				resultData: { runData: {} },
				executionData: undefined,
			}),
		});
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(execution);

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		const manualExecutionService = createManualExecutionServiceMock();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
			executionsConfig,
			mock(),
		);

		const executionId = 'execution-id';
		const restartExecutionId = 'restart-execution-id';
		await jobProcessor.processJob(
			mock<Job>({ data: { executionId, loadStaticData: false, restartExecutionId } }),
		);

		expect(additionalData.restartExecutionId).toBe(restartExecutionId);
	});

	it('should rehydrate the manual-execution identity onto additionalData from job data', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const execution = mock<IExecutionResponse>({
			mode: 'manual',
			workflowData: { id: 'workflow-id', nodes: [], staticData: {} },
			data: mock<IRunExecutionData>({
				resultData: { runData: {} },
				executionData: undefined,
			}),
		});
		const executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findSingleExecution.mockResolvedValue(execution);

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		const manualExecutionService = createManualExecutionServiceMock();
		const jobProcessor = new JobProcessor(
			logger,
			executionRepository,
			executionPersistence,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
			executionsConfig,
			mock(),
		);

		const executionId = 'execution-id';
		const encryptedRunnerIdentity = 'encrypted-identity-blob';
		await jobProcessor.processJob(
			mock<Job>({ data: { executionId, loadStaticData: false, encryptedRunnerIdentity } }),
		);

		expect(additionalData.encryptedRunnerIdentity).toBe(encryptedRunnerIdentity);
	});

	it.each(['manual', 'evaluation', 'trigger'] satisfies WorkflowExecuteMode[])(
		'should use workflowExecute to process a job with mode %p with execution data',
		async (mode) => {
			const { WorkflowExecute } = await import('n8n-core');
			// Type it correctly so we can use mock methods later
			const MockedWorkflowExecute = WorkflowExecute as MockedClass<typeof ActualWorkflowExecute>;
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
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValue(
				mock<IExecutionResponse>({
					mode,
					workflowData: { nodes: [], staticData: {} },
					data: executionData,
				}),
			);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

			const manualExecutionService = createManualExecutionServiceMock();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			// Second call for checking errors
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock();
			const mcpInstanceSettings = {
				hostId: 'worker-host-123',
			} as unknown as InstanceSettings;

			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
				}),
			);
		});

		it('should not send mcp-response for non-MCP executions', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
				isMcpExecution: undefined,
				mcpSessionId: undefined,
			};

			await jobProcessor.processJob(job);

			const progressCalls = (job.progress as Mock).mock.calls;
			const mcpResponseCalls = progressCalls.filter(
				(call: unknown[]) => (call[0] as { kind: string }).kind === 'mcp-response',
			);
			expect(mcpResponseCalls).toHaveLength(0);
		});

		it('should include success=false in mcp-response when execution has errors', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock(
				errorRun({ message: 'Test error' } as ExecutionError),
			);
			const mcpInstanceSettings = {
				hostId: 'worker-host-123',
			} as unknown as InstanceSettings;

			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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

		it('should not send mcp-response for MCP Trigger executions, which answer their own session', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'trigger',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({ executionData: undefined }),
				}),
			);
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					workflowData: { id: 'wf-1', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
				}),
			);

			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
				mock(), // workflowRepository
				mock(), // nodeTypes
				{ hostId: 'worker-host-123' } as unknown as InstanceSettings,
				createManualExecutionServiceMock(),
				executionsConfig,
				mock(), // eventService
			);

			const job = mock<Job>();
			job.data = {
				workflowId: 'wf-1',
				executionId: 'exec-mcp-trigger',
				loadStaticData: false,
				isMcpExecution: true,
				mcpType: 'trigger',
				mcpSessionId: 'session-789',
				mcpMessageId: 'msg-456',
			};

			await jobProcessor.processJob(job);

			expect(job.progress).not.toHaveBeenCalledWith(
				expect.objectContaining({ kind: 'mcp-response' }),
			);
		});
	});

	describe('waitTill propagation', () => {
		it('carries waitTill on JobFinishedProps from the worker run (lightweight path)', () => {
			const waitTill = new Date(Date.now() + 60_000);
			const jobProcessor = new JobProcessor(
				logger,
				mock<ExecutionRepository>(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				executionsConfig,
				mock(),
			);
			const run = mock<IRun>({
				status: 'waiting',
				stoppedAt: new Date(),
				data: mock<IRunExecutionData>({
					resultData: { runData: {}, error: undefined },
					executionData: undefined,
				}),
			});
			// set Date field after construction, else vitest-mock-extended serializes them otherwise.
			run.waitTill = waitTill;

			const props = jobProcessor['deriveJobFinishedProps'](run, new Date());

			expect(props.waitTill).toBe(waitTill);
			expect(props.status).toBe('waiting');
		});

		it('defaults waitTill to null on JobFinishedProps when the run is not waiting', () => {
			const jobProcessor = new JobProcessor(
				logger,
				mock<ExecutionRepository>(),
				mock(),
				mock(),
				mock(),
				mock(),
				mock(),
				executionsConfig,
				mock(),
			);
			const run = mock<IRun>({
				status: 'success',
				stoppedAt: new Date(),
				data: mock<IRunExecutionData>({
					resultData: { runData: {}, error: undefined },
					executionData: undefined,
				}),
			});
			run.waitTill = undefined;
			expect(jobProcessor['deriveJobFinishedProps'](run, new Date()).waitTill).toBeNull();
		});
	});

	describe('project info in log metadata', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});
		it('should include project info in log metadata when present in job data', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', name: 'Test Workflow', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			// Second call for checking errors
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
				executionId: 'exec-1',
				loadStaticData: false,
				projectId: 'proj-123',
				projectName: 'My Project',
			};

			await jobProcessor.processJob(job);

			// "Worker started" log should include project info
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('Worker started execution'),
				expect.objectContaining({
					workflowId: 'wf-1',
					workflowName: 'Test Workflow',
					projectId: 'proj-123',
					projectName: 'My Project',
				}),
			);

			// "Worker finished" log should include project info
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('Worker finished execution'),
				expect.objectContaining({
					workflowId: 'wf-1',
					workflowName: 'Test Workflow',
					projectId: 'proj-123',
					projectName: 'My Project',
				}),
			);
		});

		it('should not include project info in log metadata when absent from job data', async () => {
			const executionRepository = mock<ExecutionRepository>();
			const executionPersistence = mock<ExecutionPersistence>();
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					mode: 'manual',
					workflowData: { id: 'wf-1', name: 'Test Workflow', nodes: [], staticData: {} },
					data: mock<IRunExecutionData>({
						executionData: undefined,
					}),
				}),
			);
			executionPersistence.findSingleExecution.mockResolvedValueOnce(
				mock<IExecutionResponse>({
					status: 'success',
					data: mock<IRunExecutionData>({ resultData: { runData: {} } }),
				}),
			);

			const manualExecutionService = createManualExecutionServiceMock();
			const jobProcessor = new JobProcessor(
				logger,
				executionRepository,
				executionPersistence,
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
				executionId: 'exec-1',
				loadStaticData: false,
			};

			await jobProcessor.processJob(job);

			// "Worker started" log should not include project fields
			const startedCall = (logger.info as Mock).mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === 'string' && call[0].includes('Worker started execution'),
			) as [string, Record<string, unknown>] | undefined;
			expect(startedCall).toBeDefined();
			expect(startedCall![1].workflowId).toBe('wf-1');
			expect(startedCall![1]).not.toHaveProperty('projectId');
			expect(startedCall![1]).not.toHaveProperty('projectName');
		});
	});
});
