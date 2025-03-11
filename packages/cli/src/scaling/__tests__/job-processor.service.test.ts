import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-core';
import { mockInstance } from 'n8n-core/test/utils';
import type { IRunExecutionData, WorkflowExecuteMode } from 'n8n-workflow/src';

import { CredentialsHelper } from '@/credentials-helper';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExternalHooks } from '@/external-hooks';
import type { IExecutionResponse } from '@/interfaces';
import type { ManualExecutionService } from '@/manual-execution.service';
import { SecretsHelper } from '@/secrets-helpers.ee';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
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
});
