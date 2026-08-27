import type { Logger } from '@n8n/backend-common';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import {
	AgentBackgroundJobService,
	MAX_RUNNING_JOBS_PER_THREAD,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
} from '../agent-background-job.service';

function makeJob(overrides: Partial<AgentBackgroundJob> = {}): AgentBackgroundJob {
	return {
		id: 'job-1',
		kind: 'subagent',
		status: 'running',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		projectId: 'project-1',
		title: 'research',
		subAgentId: 'sub-1',
		childThreadId: 'child-thread-1',
		childExecutionId: null,
		workflowId: null,
		dedupeKey: null,
		timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		result: null,
		error: null,
		settledAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as AgentBackgroundJob;
}

function setup() {
	const jobRepository = mock<AgentBackgroundJobRepository>();
	const executionRepository = mock<AgentExecutionRepository>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();
	(logger.scoped as Mock).mockReturnValue(logger);

	jobRepository.countRunningByParentThread.mockResolvedValue(0);
	jobRepository.findRunningByDedupeKey.mockResolvedValue(null);
	jobRepository.insertJob.mockResolvedValue({ inserted: true });
	jobRepository.settleIfRunning.mockResolvedValue(true);
	jobRepository.findByParentThread.mockResolvedValue([]);
	jobRepository.findRunningJobs.mockResolvedValue([]);
	jobRepository.findRunningPastTimeout.mockResolvedValue([]);
	executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(new Map());

	const service = new AgentBackgroundJobService(
		jobRepository,
		executionRepository,
		publisher,
		logger,
	);
	return { service, jobRepository, executionRepository, publisher };
}

const registerParams = {
	id: 'job-1',
	parentAgentId: 'agent-1',
	parentThreadId: 'thread-1',
	projectId: 'project-1',
	title: 'research',
	subAgentId: 'sub-1',
	childThreadId: 'child-thread-1',
	dedupeKey: undefined,
};

describe('registerSubAgentJob', () => {
	it('returns started with the job id and a ~30min timeout', async () => {
		const { service, jobRepository } = setup();

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'job-1' });
		const inserted = jobRepository.insertJob.mock.calls[0][0];
		expect(inserted.kind).toBe('subagent');
		const expectedTimeout = Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS;
		expect(inserted.timeoutAt?.getTime()).toBeGreaterThan(expectedTimeout - 5000);
		expect(inserted.timeoutAt?.getTime()).toBeLessThanOrEqual(expectedTimeout);
	});

	it('returns limit-reached when the thread is at the running-job cap', async () => {
		const { service, jobRepository } = setup();
		jobRepository.countRunningByParentThread.mockResolvedValue(MAX_RUNNING_JOBS_PER_THREAD);

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'limit-reached' });
		expect(jobRepository.insertJob).not.toHaveBeenCalled();
	});

	it('returns duplicate at the cap when a running job already holds the dedupe key', async () => {
		const { service, jobRepository } = setup();
		jobRepository.countRunningByParentThread.mockResolvedValue(MAX_RUNNING_JOBS_PER_THREAD);
		jobRepository.findRunningByDedupeKey.mockResolvedValue(
			makeJob({ id: 'job-holder', dedupeKey: 'key-1' }),
		);

		const receipt = await service.registerSubAgentJob({ ...registerParams, dedupeKey: 'key-1' });

		expect(jobRepository.findRunningByDedupeKey).toHaveBeenCalledWith('thread-1', 'key-1');
		expect(receipt).toEqual({ status: 'duplicate', existingJobId: 'job-holder' });
		expect(jobRepository.insertJob).not.toHaveBeenCalled();
	});

	it('returns duplicate with the existing job id on a dedupe conflict', async () => {
		const { service, jobRepository } = setup();
		jobRepository.insertJob.mockResolvedValue({
			inserted: false,
			existing: makeJob({ id: 'job-existing' }),
		});

		const receipt = await service.registerSubAgentJob({ ...registerParams, dedupeKey: 'key-1' });

		expect(receipt).toEqual({ status: 'duplicate', existingJobId: 'job-existing' });
	});
});

describe('settle', () => {
	it('drops the abort handle even when the settle write throws', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.settleIfRunning.mockRejectedValueOnce(new Error('db down'));
		service.registerAbortController('job-1', new AbortController());

		await expect(service.settle('job-1', { status: 'completed', result: 'done' })).rejects.toThrow(
			'db down',
		);

		// A leaked handle would shield the row from orphan reconciliation:
		// with the handle gone, listing consults the child execution status.
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		await service.listForThread('thread-1');
		expect(executionRepository.findLatestStatusesByThreadIds).toHaveBeenCalledWith([
			'child-thread-1',
		]);
	});

	it('drops the abort handle even when the row was already settled', async () => {
		const { service, jobRepository } = setup();
		jobRepository.settleIfRunning.mockResolvedValue(false);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		const settled = await service.settle('job-1', { status: 'completed', result: 'done' });

		expect(settled).toBe(false);
		// A later cancel finds no handle to abort — the map does not leak.
		await service.cancel('thread-1', 'job-1');
		expect(controller.signal.aborted).toBe(false);
	});
});

describe('listForThread', () => {
	it('settles a running sub-agent job whose child run was interrupted and no live handle exists', async () => {
		const { service, jobRepository, executionRepository } = setup();
		const stale = makeJob();
		const settledView = makeJob({ status: 'failed', error: 'boom' });
		jobRepository.findByParentThread
			.mockResolvedValueOnce([stale])
			.mockResolvedValueOnce([settledView]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'interrupted']]),
		);

		const jobs = await service.listForThread('thread-1');

		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed' }),
		);
		expect(jobs[0].status).toBe('failed');
	});

	it('leaves a running job alone when this process holds its live handle', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		service.registerAbortController('job-1', new AbortController());

		const jobs = await service.listForThread('thread-1');

		expect(executionRepository.findLatestStatusesByThreadIds).not.toHaveBeenCalled();
		expect(jobs[0].status).toBe('running');
	});
});

describe('cancel', () => {
	it('claims the row and aborts the live handle without a pubsub round-trip', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		const outcome = await service.cancel('thread-1', 'job-1');

		expect(outcome).toBe('cancelled');
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith('job-1', { status: 'cancelled' });
		expect(controller.signal.aborted).toBe(true);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('still reports cancelled when the pubsub relay fails — the row is already claimed', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		publisher.publishCommand.mockRejectedValue(new Error('redis down'));

		expect(await service.cancel('thread-1', 'job-1')).toBe('cancelled');
	});

	it('relays the abort via pubsub when the live handle is on another main', async () => {
		const { service, jobRepository, publisher } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);

		const outcome = await service.cancel('thread-1', 'job-1');

		expect(outcome).toBe('cancelled');
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'cancel-agent-background-job',
			payload: { jobId: 'job-1' },
		});
	});

	it('returns not-found for a job of another thread', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([]);

		expect(await service.cancel('thread-other', 'job-1')).toBe('not-found');
		expect(jobRepository.settleIfRunning).not.toHaveBeenCalled();
	});

	it('returns already-settled when the claim loses', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob({ status: 'completed' })]);
		jobRepository.settleIfRunning.mockResolvedValue(false);

		expect(await service.cancel('thread-1', 'job-1')).toBe('already-settled');
	});
});

describe('handleCancelRelay', () => {
	it('aborts the local handle of the relayed job and nothing else', () => {
		const { service } = setup();
		const target = new AbortController();
		const other = new AbortController();
		service.registerAbortController('job-1', target);
		service.registerAbortController('job-2', other);

		service.handleCancelRelay({ jobId: 'job-1' });

		expect(target.signal.aborted).toBe(true);
		expect(other.signal.aborted).toBe(false);
	});

	it('is a no-op on a main that never held the handle', () => {
		const { service } = setup();

		expect(() => service.handleCancelRelay({ jobId: 'job-unknown' })).not.toThrow();
	});
});

describe('reconcile', () => {
	it('fails jobs past their timeout and aborts their live handles', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningPastTimeout.mockResolvedValue([makeJob()]);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		await service.reconcile();

		expect(controller.signal.aborted).toBe(true);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed', error: expect.stringContaining('Timed out') }),
		);
	});

	it('still aborts a timed-out run and the rest of the batch when one settle write fails', async () => {
		const { service, jobRepository } = setup();
		const failing = makeJob({ id: 'job-1' });
		const next = makeJob({ id: 'job-2', childThreadId: 'child-thread-2' });
		jobRepository.findRunningPastTimeout.mockResolvedValue([failing, next]);
		jobRepository.settleIfRunning.mockRejectedValueOnce(new Error('db blip'));
		const failingController = new AbortController();
		const nextController = new AbortController();
		service.registerAbortController('job-1', failingController);
		service.registerAbortController('job-2', nextController);

		await service.reconcile();

		expect(failingController.signal.aborted).toBe(true);
		expect(nextController.signal.aborted).toBe(true);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'job-2',
			expect.objectContaining({ status: 'failed' }),
		);
	});

	it('fails orphaned sub-agent jobs whose child run errored', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([makeJob()]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'error']]),
		);

		await service.reconcile();

		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'job-1',
			expect.objectContaining({ status: 'failed' }),
		);
	});

	it('leaves orphaned jobs alone while their child run is still running', async () => {
		const { service, jobRepository, executionRepository } = setup();
		jobRepository.findRunningJobs.mockResolvedValue([makeJob()]);
		executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
			new Map([['child-thread-1', 'running']]),
		);

		await service.reconcile();

		expect(jobRepository.settleIfRunning).not.toHaveBeenCalled();
	});
});
