import type { Logger } from '@n8n/backend-common';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

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
	const logger = mock<Logger>();
	(logger.scoped as Mock).mockReturnValue(logger);

	jobRepository.countRunningByParentThread.mockResolvedValue(0);
	jobRepository.insertJob.mockResolvedValue({ inserted: true });
	jobRepository.settleIfRunning.mockResolvedValue(true);
	jobRepository.findByParentThread.mockResolvedValue([]);
	jobRepository.findRunningJobs.mockResolvedValue([]);
	jobRepository.findRunningPastTimeout.mockResolvedValue([]);
	executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(new Map());

	const service = new AgentBackgroundJobService(jobRepository, executionRepository, logger);
	return { service, jobRepository, executionRepository };
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
	it('claims the row and aborts the live handle', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeJob()]);
		const controller = new AbortController();
		service.registerAbortController('job-1', controller);

		const outcome = await service.cancel('thread-1', 'job-1');

		expect(outcome).toBe('cancelled');
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith('job-1', { status: 'cancelled' });
		expect(controller.signal.aborted).toBe(true);
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
