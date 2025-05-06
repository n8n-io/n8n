import type { IExecutionResponse } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-core';
import { mockInstance } from 'n8n-core/test/utils';
import type { IPinData, ITaskData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { Workflow, type IRunExecutionData, type WorkflowExecuteMode } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExternalHooks } from '@/external-hooks';
import type { ManualExecutionService } from '@/manual-execution.service';
import { SecretsHelper } from '@/secrets-helpers.ee';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { JobProcessor } from '../job-processor';
import type { Job } from '../scaling.types';

mockInstance(VariablesService, {
	getAllCached: jest.fn().mockResolvedValue([]),
});
mockInstance(CredentialsHelper);
mockInstance(SecretsHelper);
mockInstance(WorkflowStaticDataService);
mockInstance(WorkflowStatisticsService);
mockInstance(ExternalHooks);

const logger = mock<Logger>({
	scoped: jest.fn().mockImplementation(() => logger),
});

describe('JobProcessor', () => {
	it('should refrain from processing a crashed execution', async () => {
		const executionRepository = mock<ExecutionRepository>();
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'crashed' }),
		);
		const jobProcessor = new JobProcessor(
			logger,
			mock(),
			executionRepository,
			mock(),
			mock(),
			mock(),
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
						isTestWebhook: false,
					}),
				}),
			);

			const manualExecutionService = mock<ManualExecutionService>();
			const jobProcessor = new JobProcessor(
				logger,
				mock(),
				executionRepository,
				mock(),
				mock(),
				mock(),
				manualExecutionService,
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
				isTestWebhook: false,
				resultData: {
					runData: {
						trigger: [mock<ITaskData>({ executionIndex: 1 })],
						node: [mock<ITaskData>({ executionIndex: 3 }), mock<ITaskData>({ executionIndex: 4 })],
					},
					pinData,
				},
			}),
		});
		executionRepository.findSingleExecution.mockResolvedValue(execution);

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(additionalData);

		const manualExecutionService = mock<ManualExecutionService>();
		const jobProcessor = new JobProcessor(
			logger,
			mock(),
			executionRepository,
			mock(),
			mock(),
			mock(),
			manualExecutionService,
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
});
