import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionRepository, IExecutionBase } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';

import { JOB_WAIT_RECHECK_INTERVAL_MS } from '../constants';
import { JobOutcomeTracker } from '../job-outcome-tracker';
import type { Job, JobFinishedProps } from '../scaling.types';

describe('JobOutcomeTracker', () => {
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	let tracker: JobOutcomeTracker;

	const job = mock<Job>({ id: 'job-1', data: { executionId: 'exec-1' }, queue: { name: 'jobs' } });
	const result = mock<JobFinishedProps>({ status: 'success' });

	beforeEach(() => {
		vi.clearAllMocks();
		activeExecutions.has.mockReturnValue(true);
		tracker = new JobOutcomeTracker(mockLogger(), activeExecutions, executionRepository);
	});

	afterEach(() => {
		tracker.clear();
		vi.useRealTimers();
	});

	describe('recordFinished', () => {
		it('should keep the result for an execution this process enqueued', () => {
			tracker.recordFinished('exec-1', result);

			expect(tracker.pop('exec-1')).toBe(result);
			expect(tracker.pop('exec-1')).toBeUndefined();
		});

		it('should ignore the result for an execution this process did not enqueue', () => {
			// Bull broadcasts progress messages to every main and webhook process
			activeExecutions.has.mockReturnValue(false);

			tracker.recordFinished('exec-other-main', result);

			expect(tracker.pop('exec-other-main')).toBeUndefined();
		});
	});

	describe('waitFor', () => {
		it('should resolve when the worker reports the job as finished', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFinished('exec-1', result);

			await expect(wait).resolves.toBeUndefined();
			expect(tracker.pop('exec-1')).toBe(result);
		});

		it('should resolve when an older worker reports the job as finished without a result', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFinished('exec-1');

			await expect(wait).resolves.toBeUndefined();
			expect(tracker.pop('exec-1')).toBeUndefined();
		});

		it('should resolve at once when the result arrived before the wait started', async () => {
			tracker.recordFinished('exec-1', result);

			await expect(tracker.waitFor(job)).resolves.toBeUndefined();
		});

		it('should reject when the worker reports the job as failed', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFailed('exec-1', new Error('boom'));

			await expect(wait).rejects.toThrow('boom');
		});

		it('should reject at once when the worker reported the failure before the wait started', async () => {
			tracker.recordFailed('exec-1', new Error('boom'));

			await expect(tracker.waitFor(job)).rejects.toThrow('boom');
		});

		it('should not keep an early failure for an execution this process did not enqueue', async () => {
			activeExecutions.has.mockReturnValue(false);
			tracker.recordFailed('exec-1', new Error('boom'));
			activeExecutions.has.mockReturnValue(true);

			const wait = tracker.waitFor(job);
			tracker.recordFinished('exec-1', result);

			await expect(wait).resolves.toBeUndefined();
		});

		it('should settle from a Bull event by queue name and job ID', async () => {
			const wait = tracker.waitFor(job);

			tracker.settleByJobKey('jobs', 'job-1', new Error('job stalled more than maxStalledCount'));

			await expect(wait).rejects.toThrow('job stalled more than maxStalledCount');
		});

		it('should settle only the wait for the queue that emitted the Bull event', async () => {
			const poolJob = mock<Job>({
				id: 'job-1',
				data: { executionId: 'exec-pool' },
				queue: { name: 'jobs-gpu' },
			});
			let poolSettled = false;
			void tracker.waitFor(poolJob).finally(() => (poolSettled = true));
			const wait = tracker.waitFor(job);

			// Bull job IDs are unique per queue only
			tracker.settleByJobKey('jobs', 'job-1');

			await expect(wait).resolves.toBeUndefined();
			expect(poolSettled).toBe(false);
		});

		it('should resolve from the DB when every completion event was missed', async () => {
			vi.useFakeTimers();
			executionRepository.findSingleExecution.mockResolvedValue(
				mock<IExecutionBase>({ status: 'success' }),
			);

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			await expect(wait).resolves.toBeUndefined();
		});

		it('should resolve from the DB when the execution row is gone', async () => {
			vi.useFakeTimers();
			executionRepository.findSingleExecution.mockResolvedValue(undefined);

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			await expect(wait).resolves.toBeUndefined();
		});

		it('should keep waiting while the DB still shows the execution as running', async () => {
			vi.useFakeTimers();
			executionRepository.findSingleExecution.mockResolvedValue(
				mock<IExecutionBase>({ status: 'running' }),
			);
			let settled = false;

			void tracker.waitFor(job).finally(() => (settled = true));
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			expect(executionRepository.findSingleExecution).toHaveBeenCalledTimes(2);
			expect(settled).toBe(false);
		});

		it('should keep rechecking after a failed DB read', async () => {
			vi.useFakeTimers();
			executionRepository.findSingleExecution
				.mockRejectedValueOnce(new Error('db unavailable'))
				.mockResolvedValue(mock<IExecutionBase>({ status: 'success' }));

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			await expect(wait).resolves.toBeUndefined();
			expect(executionRepository.findSingleExecution).toHaveBeenCalledTimes(2);
		});
	});

	describe('drop', () => {
		it('should stop the recheck and leave the wait unsettled', async () => {
			vi.useFakeTimers();
			let settled = false;

			void tracker.waitFor(job).finally(() => (settled = true));
			tracker.drop('exec-1');
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
			expect(settled).toBe(false);
		});
	});
});
