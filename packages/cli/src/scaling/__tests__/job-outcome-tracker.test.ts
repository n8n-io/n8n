import { mockLogger } from '@n8n/backend-test-utils';
import type { EventService } from '@n8n/backend-services';
import type { ExecutionRepository } from '@n8n/db';
import type { ExecutionStatus } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';

import { JOB_WAIT_RECHECK_INTERVAL_MS } from '../constants';
import { JobOutcomeTracker } from '../job-outcome-tracker';
import type { Job, JobFinishedProps } from '../scaling.types';

describe('JobOutcomeTracker', () => {
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();
	const eventService = mock<EventService>();
	let tracker: JobOutcomeTracker;

	const job = mock<Job>({ id: 'job-1', data: { executionId: 'exec-1' }, queue: { name: 'jobs' } });
	const result = mock<JobFinishedProps>({ success: true, status: 'success' });

	const statusRows = (statuses: Record<string, ExecutionStatus>) =>
		Object.entries(statuses).map(([id, status]) => ({ id, status }));

	beforeEach(() => {
		vi.clearAllMocks();
		activeExecutions.has.mockReturnValue(true);
		tracker = new JobOutcomeTracker(
			mockLogger(),
			activeExecutions,
			executionRepository,
			eventService,
		);
	});

	afterEach(() => {
		tracker.clear();
		vi.useRealTimers();
	});

	describe('recordFinished', () => {
		it('should keep the result for an execution this process enqueued', () => {
			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);

			expect(tracker.popResult(job)).toBe(result);
			expect(tracker.popResult(job)).toBeUndefined();
		});

		it('should ignore the result for an execution this process did not enqueue', () => {
			// Bull broadcasts progress messages to every main and webhook process
			activeExecutions.has.mockReturnValue(false);

			tracker.recordFinished('jobs', 'job-1', 'exec-other-main', result);

			expect(tracker.popResult(job)).toBeUndefined();
		});
	});

	describe('waitFor', () => {
		it('keeps successive jobs for the same execution separate', async () => {
			const resumedJob = mock<Job>({
				id: 'job-2',
				data: { executionId: 'exec-1' },
				queue: { name: 'jobs' },
			});
			const oldWait = tracker.waitFor(job);
			let resumedSettled = false;
			const resumedWait = tracker.waitFor(resumedJob).then(() => (resumedSettled = true));

			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);
			await oldWait;
			expect(resumedSettled).toBe(false);
			expect(tracker.popResult(resumedJob)).toBeUndefined();
			expect(tracker.popResult(job)).toBe(result);

			tracker.recordFinished('jobs', 'job-2', 'exec-1', result);
			await resumedWait;
			expect(tracker.popResult(resumedJob)).toBe(result);
		});

		it("does not use another main's old result for a resumed job", async () => {
			tracker.recordFinished('jobs', 'job-old', 'exec-1', result);
			let settled = false;
			const wait = tracker.waitFor(job).then(() => (settled = true));
			await Promise.resolve();
			expect(settled).toBe(false);
			expect(tracker.getDiagnosticCounts().jobResults).toBe(0);
			tracker.recordFinished('jobs', 'job-old', 'exec-1', result);
			expect(tracker.getDiagnosticCounts().jobResults).toBe(0);

			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);
			await wait;
		});

		it('should resolve when the worker reports the job as finished', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);

			await expect(wait).resolves.toBeUndefined();
			expect(tracker.popResult(job)).toBe(result);
		});

		it('should resolve when an older worker reports the job as finished without a result', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFinished('jobs', 'job-1', 'exec-1');

			await expect(wait).resolves.toBeUndefined();
			expect(tracker.popResult(job)).toBeUndefined();
		});

		it('should resolve at once when the result arrived before the wait started', async () => {
			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);

			await expect(tracker.waitFor(job)).resolves.toBeUndefined();
		});

		it('should reject when the worker reports the job as failed', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFailed('jobs', 'job-1', 'exec-1', new Error('boom'));

			await expect(wait).rejects.toThrow('boom');
		});

		it('should reject at once when the worker reported the failure before the wait started', async () => {
			tracker.recordFailed('jobs', 'job-1', 'exec-1', new Error('boom'));

			await expect(tracker.waitFor(job)).rejects.toThrow('boom');
		});

		it('should not keep an early failure for an execution this process did not enqueue', async () => {
			activeExecutions.has.mockReturnValue(false);
			tracker.recordFailed('jobs', 'job-1', 'exec-1', new Error('boom'));
			activeExecutions.has.mockReturnValue(true);

			const wait = tracker.waitFor(job);
			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);

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
	});

	describe('response promise', () => {
		it('should answer the request with success when the job ended well', async () => {
			const wait = tracker.waitFor(job);

			tracker.settleByJobKey('jobs', 'job-1');
			await wait;

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-1', {});
		});

		it('should answer the request with an error when the job failed', async () => {
			const wait = tracker.waitFor(job);

			tracker.recordFailed('jobs', 'job-1', 'exec-1', new Error('boom'));
			await expect(wait).rejects.toThrow();

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith(
				'exec-1',
				expect.objectContaining({ statusCode: 500 }),
			);
		});
	});

	describe('recheck', () => {
		it('should resolve from the DB when every completion event was missed', async () => {
			vi.useFakeTimers();
			executionRepository.findStatusesByIds.mockResolvedValue(statusRows({ 'exec-1': 'success' }));

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			await expect(wait).resolves.toBeUndefined();
			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-1', {});
			expect(eventService.emit).toHaveBeenCalledWith('job-completion-missed', {
				status: 'success',
			});
		});

		it('should answer the request with an error when the DB shows the execution failed', async () => {
			vi.useFakeTimers();
			executionRepository.findStatusesByIds.mockResolvedValue(statusRows({ 'exec-1': 'error' }));

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			await expect(wait).resolves.toBeUndefined();
			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith(
				'exec-1',
				expect.objectContaining({ statusCode: 500 }),
			);
		});

		it('should resolve from the DB when the execution row is gone', async () => {
			vi.useFakeTimers();
			executionRepository.findStatusesByIds.mockResolvedValue([]);

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			await expect(wait).resolves.toBeUndefined();
		});

		it('should keep waiting while the DB still shows the execution as running', async () => {
			vi.useFakeTimers();
			executionRepository.findStatusesByIds.mockResolvedValue(statusRows({ 'exec-1': 'running' }));
			let settled = false;

			void tracker.waitFor(job).finally(() => (settled = true));
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			expect(executionRepository.findStatusesByIds).toHaveBeenCalledTimes(2);
			expect(settled).toBe(false);
		});

		it('should keep rechecking after a failed DB read', async () => {
			vi.useFakeTimers();
			executionRepository.findStatusesByIds
				.mockRejectedValueOnce(new Error('db unavailable'))
				.mockResolvedValue(statusRows({ 'exec-1': 'success' }));

			const wait = tracker.waitFor(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			await expect(wait).resolves.toBeUndefined();
			expect(executionRepository.findStatusesByIds).toHaveBeenCalledTimes(2);
		});

		it('should read the status of all pending waits in one query', async () => {
			vi.useFakeTimers();
			const otherJob = mock<Job>({
				id: 'job-2',
				data: { executionId: 'exec-2' },
				queue: { name: 'jobs' },
			});
			executionRepository.findStatusesByIds.mockResolvedValue(
				statusRows({ 'exec-1': 'success', 'exec-2': 'running' }),
			);
			let otherSettled = false;

			const wait = tracker.waitFor(job);
			void tracker.waitFor(otherJob).finally(() => (otherSettled = true));
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS);

			expect(executionRepository.findStatusesByIds).toHaveBeenCalledTimes(1);
			expect(executionRepository.findStatusesByIds).toHaveBeenCalledWith(['exec-1', 'exec-2']);
			await expect(wait).resolves.toBeUndefined();
			expect(otherSettled).toBe(false);
		});

		it('should not count a wait that an event settled while the DB read was in flight', async () => {
			let releaseRead: (rows: Array<{ id: string; status: ExecutionStatus }>) => void = () => {};
			executionRepository.findStatusesByIds.mockReturnValue(
				new Promise((resolve) => (releaseRead = resolve)),
			);

			const wait = tracker.waitFor(job);
			const recheck = tracker.recheckAll();
			tracker.recordFinished('jobs', 'job-1', 'exec-1', result);
			releaseRead(statusRows({ 'exec-1': 'success' }));
			await recheck;

			await expect(wait).resolves.toBeUndefined();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('should join a recheck that is already reading the DB instead of starting another', async () => {
			let releaseRead: (rows: Array<{ id: string; status: ExecutionStatus }>) => void = () => {};
			executionRepository.findStatusesByIds.mockReturnValue(
				new Promise((resolve) => (releaseRead = resolve)),
			);

			const wait = tracker.waitFor(job);
			// A reconnect during a slow timer tick, or the other way round
			const first = tracker.recheckAll();
			const second = tracker.recheckAll();
			releaseRead(statusRows({ 'exec-1': 'success' }));
			await Promise.all([first, second]);

			expect(executionRepository.findStatusesByIds).toHaveBeenCalledTimes(1);
			await expect(wait).resolves.toBeUndefined();
		});

		it('should recheck at once on demand, e.g. when Redis reconnects', async () => {
			executionRepository.findStatusesByIds.mockResolvedValue(statusRows({ 'exec-1': 'success' }));

			const wait = tracker.waitFor(job);
			await tracker.recheckAll();

			await expect(wait).resolves.toBeUndefined();
		});

		it('should not query the DB when nothing is pending', async () => {
			await tracker.recheckAll();

			expect(executionRepository.findStatusesByIds).not.toHaveBeenCalled();
		});
	});

	describe('drop', () => {
		it('should stop the recheck once no wait is pending and leave the wait unsettled', async () => {
			vi.useFakeTimers();
			let settled = false;

			void tracker.waitFor(job).finally(() => (settled = true));
			tracker.drop(job);
			await vi.advanceTimersByTimeAsync(JOB_WAIT_RECHECK_INTERVAL_MS * 2);

			expect(executionRepository.findStatusesByIds).not.toHaveBeenCalled();
			expect(settled).toBe(false);
		});
	});
});
