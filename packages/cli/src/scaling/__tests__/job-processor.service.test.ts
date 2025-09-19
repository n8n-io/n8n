import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { IExecutionResponse, ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { WorkflowExecute as ActualWorkflowExecute } from 'n8n-core';
import { ExternalSecretsProxy } from 'n8n-core';
import { mockInstance } from 'n8n-core/test/utils';
import {
	type IPinData,
	type ITaskData,
	type IWorkflowExecuteAdditionalData,
	Workflow,
	type IRunExecutionData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { JobProcessor } from '../job-processor';
import type { Job } from '../scaling.types';

import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExternalHooks } from '@/external-hooks';
import type { ManualExecutionService } from '@/manual-execution.service';
import { DataStoreProxyService } from '@/modules/data-table/data-store-proxy.service';
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
mockInstance(DataStoreProxyService);

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
			);

			await jobProcessor.processJob(mock<Job>());

			expect(manualExecutionService.runManually).toHaveBeenCalledTimes(1);
		},
	);

	it('should pass additional data for partial executions to run', async () => {
		const executionRepository = mock<ExecutionRepository>();
		const pinData: IPinData = { pinned: [] };
		const execution = mock<IExecutionResponse>({
			mode: 'manual',
			workflowData: { nodes: [], pinData },
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
		);

		const executionId = 'execution-id';
		await jobProcessor.processJob(mock<Job>({ data: { executionId, loadStaticData: false } }));

		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith(
			undefined,
			undefined,
			undefined,
		);

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
			);

			await jobProcessor.processJob(mock<Job>());

			// Assert the constructor and method were called
			expect(MockedWorkflowExecute).toHaveBeenCalledWith(additionalData, mode, executionData);
			expect(processRunExecutionDataMock).toHaveBeenCalled();
		},
	);
});
