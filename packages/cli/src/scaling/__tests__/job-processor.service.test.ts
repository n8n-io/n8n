import { mock } from 'jest-mock-extended';

import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { IExecutionResponse } from '@/interfaces';

import { JobProcessor } from '../job-processor';
import type { Job } from '../scaling.types';

describe('JobProcessor', () => {
	it('should refrain from processing a crashed execution', async () => {
		const executionRepository = mock<ExecutionRepository>();
		executionRepository.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'crashed' }),
		);
		const jobProcessor = new JobProcessor(
			mock(),
			mock(),
			executionRepository,
			mock(),
			mock(),
			mock(),
		);

		const result = await jobProcessor.processJob(mock<Job>());

		expect(result).toEqual({ success: false });
	});
});
