import type { IExecutionResponse } from '@/Interfaces';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { AbortedExecutionRetryError } from '@/errors/aborted-execution-retry.error';
import { ExecutionService } from '@/executions/execution.service';
import type { ExecutionRequest } from '@/executions/execution.types';
import { mock } from 'jest-mock-extended';

describe('ExecutionService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const executionService = new ExecutionService(
		mock(),
		mock(),
		mock(),
		executionRepository,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	it('should error on retrying an aborted execution', async () => {
		const abortedExecutionData = mock<IExecutionResponse>({ data: { executionData: undefined } });
		executionRepository.findWithUnflattenedData.mockResolvedValue(abortedExecutionData);
		const req = mock<ExecutionRequest.Retry>();

		const retry = executionService.retry(req, []);

		await expect(retry).rejects.toThrow(AbortedExecutionRetryError);
	});
});
