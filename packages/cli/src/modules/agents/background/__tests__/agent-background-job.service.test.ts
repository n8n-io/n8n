import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import {
	AgentBackgroundJobService,
	MAX_RUNNING_JOBS_PER_THREAD,
	SETTLED_JOB_RETENTION_MS,
	SUB_AGENT_BACKGROUND_TIMEOUT_MS,
	WORKFLOW_JOB_RESULT_MAX_CHARS,
	serializeWorkflowJobResult,
	settlementStatusForExecution,
} from '../agent-background-job.service';

function makeWorkflowJob(overrides: Partial<AgentBackgroundJob> = {}): AgentBackgroundJob {
	return makeJob({
		id: 'wf-job-1',
		kind: 'workflow',
		subAgentId: null,
		childThreadId: null,
		childExecutionId: 'exec-1',
		workflowId: 'workflow-1',
		timeoutAt: null,
		...overrides,
	});
}

function makeJob(overrides: Partial<AgentBackgroundJob> = {}): AgentBackgroundJob {
	return {
		id: 'job-1',
		kind: 'subagent',
		status: 'running',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		title: 'research',
		subAgentId: 'sub-1',
		childThreadId: 'child-thread-1',
		childExecutionId: null,
		workflowId: null,
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
	const executionPersistence = mock<ExecutionPersistence>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();
	(logger.scoped as Mock).mockReturnValue(logger);

	jobRepository.countRunningSubAgentsByParentThread.mockResolvedValue(0);
	jobRepository.insertJob.mockResolvedValue(undefined);
	jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({ inserted: true });
	jobRepository.settleIfRunning.mockResolvedValue(true);
	jobRepository.findByParentThread.mockResolvedValue([]);
	jobRepository.findRunningJobs.mockResolvedValue([]);
	jobRepository.findRunningPastTimeout.mockResolvedValue([]);
	executionRepository.findLatestStatusesByThreadIds.mockResolvedValue(new Map());

	const service = new AgentBackgroundJobService(
		jobRepository,
		executionRepository,
		executionPersistence,
		publisher,
		logger,
	);
	return { service, jobRepository, executionRepository, executionPersistence, publisher };
}

const registerParams = {
	id: 'job-1',
	parentAgentId: 'agent-1',
	parentThreadId: 'thread-1',
	title: 'research',
	subAgentId: 'sub-1',
	childThreadId: 'child-thread-1',
};

describe('registerSubAgentJob', () => {
	it('returns started with the job id and a ~30min timeout', async () => {
		const { service, jobRepository } = setup();

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'job-1' });
		const inserted = jobRepository.insertJob.mock.calls[0][0];
		if (inserted.kind !== 'subagent') throw new Error('expected a subagent job insert');
		const expectedTimeout = Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS;
		expect(inserted.timeoutAt.getTime()).toBeGreaterThan(expectedTimeout - 5000);
		expect(inserted.timeoutAt.getTime()).toBeLessThanOrEqual(expectedTimeout);
	});

	it('returns limit-reached when the thread is at the running-job cap', async () => {
		const { service, jobRepository } = setup();
		jobRepository.countRunningSubAgentsByParentThread.mockResolvedValue(
			MAX_RUNNING_JOBS_PER_THREAD,
		);

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'limit-reached' });
		expect(jobRepository.insertJob).not.toHaveBeenCalled();
	});

	it('counts only running sub-agent jobs toward the cap', async () => {
		const { service, jobRepository } = setup();

		const receipt = await service.registerSubAgentJob(registerParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'job-1' });
		expect(jobRepository.countRunningSubAgentsByParentThread).toHaveBeenCalledWith('thread-1');
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
	it('prunes settled rows past the retention cutoff', async () => {
		const { service, jobRepository } = setup();

		await service.reconcile();

		const cutoff = jobRepository.deleteSettledBefore.mock.calls[0][0];
		const expected = Date.now() - SETTLED_JOB_RETENTION_MS;
		expect(cutoff.getTime()).toBeGreaterThan(expected - 5000);
		expect(cutoff.getTime()).toBeLessThanOrEqual(expected);
	});

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

describe('registerWorkflowJob', () => {
	const workflowParams = {
		id: 'wf-job-1',
		parentAgentId: 'agent-1',
		parentThreadId: 'thread-1',
		title: 'My Workflow',
		workflowId: 'workflow-1',
		executionId: 'exec-1',
	};

	it('registers a running workflow job keyed to its execution', async () => {
		const { service, jobRepository } = setup();

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-job-1' });
		expect(jobRepository.insertWorkflowJobOrGetExisting).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'workflow',
				childExecutionId: 'exec-1',
				workflowId: 'workflow-1',
			}),
		);
		// No timeout: the execution's own lifecycle governs how long it may wait.
		expect(jobRepository.insertWorkflowJobOrGetExisting.mock.calls[0][0]).not.toHaveProperty(
			'timeoutAt',
		);
		expect(jobRepository.countRunningSubAgentsByParentThread).not.toHaveBeenCalled();
	});

	it('converges a replayed registration on the job already tracking the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({
			inserted: false,
			existing: makeWorkflowJob({ id: 'wf-existing' }),
		});

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-existing' });
	});

	it('converges on the existing job even after it settled', async () => {
		const { service, jobRepository } = setup();
		jobRepository.insertWorkflowJobOrGetExisting.mockResolvedValue({
			inserted: false,
			existing: makeWorkflowJob({ id: 'wf-settled', status: 'completed' }),
		});

		const receipt = await service.registerWorkflowJob(workflowParams);

		expect(receipt).toEqual({ status: 'started', jobId: 'wf-settled' });
	});
});

describe('settleWorkflowJobByExecutionId', () => {
	it('settles the running job tracking the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningWorkflowJobByExecutionId.mockResolvedValue(makeWorkflowJob());

		const settled = await service.settleWorkflowJobByExecutionId('exec-1', {
			status: 'completed',
			result: '{"Set":[{"ok":true}]}',
		});

		expect(settled).toBe(true);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith('wf-job-1', {
			status: 'completed',
			result: '{"Set":[{"ok":true}]}',
		});
	});

	it('is a no-op when no running job tracks the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findRunningWorkflowJobByExecutionId.mockResolvedValue(null);

		const settled = await service.settleWorkflowJobByExecutionId('exec-1', { status: 'failed' });

		expect(settled).toBe(false);
		expect(jobRepository.settleIfRunning).not.toHaveBeenCalled();
	});
});

describe('cancel — workflow jobs', () => {
	afterEach(() => {
		Container.reset();
	});

	it('claims the row and stops the execution', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob()]);
		const executionService = mock<ExecutionService>();
		Container.set(ExecutionService, executionService);

		const outcome = await service.cancel('thread-1', 'wf-job-1');

		expect(outcome).toBe('cancelled');
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith('wf-job-1', {
			status: 'cancelled',
		});
		expect(executionService.stop).toHaveBeenCalledWith('exec-1', ['workflow-1']);
	});

	it('keeps the row cancelled when stopping the finished execution errors', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([makeWorkflowJob()]);
		const executionService = mock<ExecutionService>();
		executionService.stop.mockRejectedValue(new Error('already finished'));
		Container.set(ExecutionService, executionService);

		expect(await service.cancel('thread-1', 'wf-job-1')).toBe('cancelled');
	});

	it('claims a row that lost its execution id without attempting a stop', async () => {
		const { service, jobRepository } = setup();
		jobRepository.findByParentThread.mockResolvedValue([
			makeWorkflowJob({ childExecutionId: null }),
		]);
		const executionService = mock<ExecutionService>();
		Container.set(ExecutionService, executionService);

		const outcome = await service.cancel('thread-1', 'wf-job-1');

		expect(outcome).toBe('cancelled');
		expect(executionService.stop).not.toHaveBeenCalled();
	});
});

describe('reconcile — workflow jobs', () => {
	it('settles a job whose execution already reached a terminal state, carrying its output', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'success' }]);
		executionPersistence.findSingleExecution.mockResolvedValue({
			status: 'success',
			data: {
				resultData: { runData: { Set: [{ data: { main: [[{ json: { ok: true } }]] } }] } },
			},
		} as never);

		await service.reconcile();

		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledTimes(1);
		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledWith(['exec-1']);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'completed', result: '{"Set":[{"ok":true}]}' }),
		);
	});

	it('fails a job whose execution no longer exists, saying the outcome is unknown', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([]);

		await service.reconcile();

		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({
				status: 'failed',
				error: expect.stringContaining('outcome is unknown'),
			}),
		);
	});

	it('settles with a null result when the finished execution’s data cannot be read', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'success' }]);
		executionPersistence.findSingleExecution.mockRejectedValue(new Error('data bundle unreadable'));

		await service.reconcile();

		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'completed', result: null }),
		);
	});

	it('reads all candidate statuses in one batch and settles the rest when one settle fails', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow'
				? [makeWorkflowJob(), makeWorkflowJob({ id: 'wf-job-2', childExecutionId: 'exec-2' })]
				: [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([
			{ id: 'exec-1', status: 'error' },
			{ id: 'exec-2', status: 'error' },
		]);
		jobRepository.settleIfRunning.mockImplementation(async (id) => {
			if (id === 'wf-job-1') throw new Error('db down');
			return true;
		});

		await service.reconcile();

		expect(executionPersistence.findStatusesByIds).toHaveBeenCalledWith(['exec-1', 'exec-2']);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledTimes(2);
		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'wf-job-2',
			expect.objectContaining({ status: 'failed' }),
		);
	});

	it('settles nothing when the batched status read fails', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockRejectedValue(new Error('db down'));

		await service.reconcile();

		expect(jobRepository.settleIfRunning).not.toHaveBeenCalled();
	});

	it('leaves a still-waiting execution alone — workflow jobs have no timeout', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findRunningJobs.mockImplementation(async (kind) =>
			kind === 'workflow' ? [makeWorkflowJob()] : [],
		);
		executionPersistence.findStatusesByIds.mockResolvedValue([{ id: 'exec-1', status: 'waiting' }]);

		await service.reconcile();

		expect(jobRepository.settleIfRunning).not.toHaveBeenCalled();
	});
});

describe('listForThread — workflow jobs', () => {
	it('settles a running workflow row whose execution finished (settle-on-check)', async () => {
		const { service, jobRepository, executionPersistence } = setup();
		jobRepository.findByParentThread
			.mockResolvedValueOnce([makeWorkflowJob()])
			.mockResolvedValueOnce([makeWorkflowJob({ status: 'cancelled' })]);
		executionPersistence.findStatusesByIds.mockResolvedValue([
			{ id: 'exec-1', status: 'canceled' },
		]);

		const jobs = await service.listForThread('thread-1');

		expect(jobRepository.settleIfRunning).toHaveBeenCalledWith(
			'wf-job-1',
			expect.objectContaining({ status: 'cancelled' }),
		);
		expect(jobs[0].status).toBe('cancelled');
		expect(jobs[0].childExecutionId).toBe('exec-1');
	});
});

describe('settlementStatusForExecution', () => {
	it('maps terminal execution statuses onto job settlement statuses', () => {
		expect(settlementStatusForExecution('success')).toBe('completed');
		expect(settlementStatusForExecution('canceled')).toBe('cancelled');
		expect(settlementStatusForExecution('error')).toBe('failed');
		expect(settlementStatusForExecution('crashed')).toBe('failed');
	});
});

describe('serializeWorkflowJobResult', () => {
	it('serializes result data and bounds its size', () => {
		expect(serializeWorkflowJobResult(undefined)).toBeNull();
		expect(serializeWorkflowJobResult({})).toBeNull();
		expect(serializeWorkflowJobResult({ Set: [{ ok: true }] })).toBe('{"Set":[{"ok":true}]}');

		const oversized = serializeWorkflowJobResult({ Set: ['x'.repeat(20_000)] });
		expect(oversized?.length).toBeLessThan(WORKFLOW_JOB_RESULT_MAX_CHARS + 100);
		expect(oversized).toContain('truncated');
	});

	it('truncates exactly at the cap and leaves a result at the cap untouched', () => {
		const atCap = { S: 'x'.repeat(WORKFLOW_JOB_RESULT_MAX_CHARS - '{"S":""}'.length) };
		const atCapSerialized = JSON.stringify(atCap);
		expect(atCapSerialized.length).toBe(WORKFLOW_JOB_RESULT_MAX_CHARS);
		expect(serializeWorkflowJobResult(atCap)).toBe(atCapSerialized);

		const overCap = { S: 'x'.repeat(WORKFLOW_JOB_RESULT_MAX_CHARS) };
		const overCapSerialized = JSON.stringify(overCap);
		expect(serializeWorkflowJobResult(overCap)).toBe(
			`${overCapSerialized.slice(0, WORKFLOW_JOB_RESULT_MAX_CHARS)}… [truncated, full data on execution]`,
		);
	});
});
