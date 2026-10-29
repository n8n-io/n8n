import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ResumeAttemptService } from '@/executions/resume-attempt.service';

describe('ResumeAttemptService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const executionCrashService = mock<ExecutionCrashService>();

	const createService = (maxResumeAttempts: number) =>
		new ResumeAttemptService(
			mockLogger(),
			mock<ExecutionsConfig>({ recovery: { maxResumeAttempts } }),
			executionRepository,
			executionCrashService,
		);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('claim', () => {
		test('grants the load without touching the database when the limit is 0', async () => {
			await expect(createService(0).claim('1', 'waiting')).resolves.toEqual({
				granted: true,
				attempt: 0,
			});

			expect(executionRepository.claimResumeAttempt).not.toHaveBeenCalled();
			expect(executionCrashService.markParkedAsCrashed).not.toHaveBeenCalled();
		});

		test('grants the load with its attempt number when the claim succeeds', async () => {
			executionRepository.claimResumeAttempt.mockResolvedValue({
				outcome: 'claimed',
				attempts: 1,
				jsonSizeBytes: 100,
			});

			await expect(createService(2).claim('1', 'waiting')).resolves.toEqual({
				granted: true,
				attempt: 1,
			});

			expect(executionRepository.claimResumeAttempt).toHaveBeenCalledWith('1', 'waiting', 2);
			expect(executionCrashService.markParkedAsCrashed).not.toHaveBeenCalled();
		});

		test('marks the execution as crashed and refuses the load when the attempts are used up', async () => {
			executionRepository.claimResumeAttempt.mockResolvedValue({
				outcome: 'exhausted',
				attempts: 2,
				jsonSizeBytes: 90_000_000,
			});

			await expect(createService(2).claim('1', 'new')).resolves.toEqual({ granted: false });

			expect(executionCrashService.markParkedAsCrashed).toHaveBeenCalledExactlyOnceWith(
				'1',
				'new',
				'resume-limit',
				2,
			);
		});

		test('reports a claim conflict as an execution already resuming', async () => {
			executionRepository.claimResumeAttempt.mockResolvedValue({ outcome: 'conflict' });

			await expect(createService(2).claim('1', 'waiting')).rejects.toThrow(
				ExecutionAlreadyResumingError,
			);

			expect(executionCrashService.markParkedAsCrashed).not.toHaveBeenCalled();
		});
	});

	describe('release', () => {
		test('gives the claimed attempt back', async () => {
			executionRepository.releaseResumeAttempt.mockResolvedValue(true);

			await createService(2).release('1', 'waiting', 1);

			expect(executionRepository.releaseResumeAttempt).toHaveBeenCalledWith('1', 'waiting', 1);
		});

		test('does nothing for a claim that the limit did not count', async () => {
			await createService(0).release('1', 'waiting', 0);

			expect(executionRepository.releaseResumeAttempt).not.toHaveBeenCalled();
		});

		test('does not throw when the database rejects the release', async () => {
			executionRepository.releaseResumeAttempt.mockRejectedValue(new Error('database is locked'));

			await expect(createService(2).release('1', 'waiting', 1)).resolves.toBeUndefined();
		});
	});
});
