import { TransactionRunner } from '@n8n/db';
import { LockService } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import { randomUUID } from 'node:crypto';

import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentTaskCancellationService, cancelPlanItems } from '../agent-task-cancellation.service';
import { AgentTaskCancellationRepository } from '../repositories/agent-task-cancellation.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import { AgentPlanRepository } from '../repositories/agent-plan.repository';
import { AgentPlanService } from '../agent-plan.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import type { AgentPlanTask } from '../plans/agent-plan.schema';

const task = (status: AgentPlanTask['status']): AgentPlanTask => ({
	id: randomUUID(),
	kind: 'task',
	title: status,
	description: '',
	status,
	dependsOn: [],
	startedAt: null,
	endedAt: null,
});

function setup() {
	const repository = mock<AgentTaskCancellationRepository>();
	const threads = mock<AgentExecutionThreadRepository>();
	const executions = mock<AgentExecutionRepository>();
	const queue = mock<AgentMessageQueueRepository>();
	const plans = mock<AgentPlanRepository>();
	const planService = mock<AgentPlanService>();
	const jobs = mock<AgentBackgroundJobService>();
	const chat = mock<AgentChatExecutionService>();
	const tx = mock<TransactionRunner>();
	const locks = mock<LockService>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const checkpoints = mock<N8NCheckpointStorage>();
	let saved: Awaited<ReturnType<AgentTaskCancellationRepository['latest']>> = null;
	let work = [
		mock<AgentBackgroundJob>({
			id: 'completed',
			parentThreadId: 'thread',
			status: 'completed',
			result: 'Saved result',
		}),
		mock<AgentBackgroundJob>({ id: 'paused', parentThreadId: 'thread', status: 'paused' }),
		mock<AgentBackgroundJob>({
			id: 'workflow',
			parentThreadId: 'thread',
			kind: 'workflow',
			status: 'running',
		}),
		mock<AgentBackgroundJob>({
			id: 'nested',
			title: 'Nested task',
			parentThreadId: 'child',
			status: 'suspended',
		}),
	];
	repository.captureGeneration.mockResolvedValue({ executionIds: [], jobIds: [], threadIds: [] });
	repository.latest.mockImplementation(async () => saved);
	repository.saveStop.mockImplementation(async (value) => (saved = value));
	repository.targetedJobs.mockImplementation(async () => work);
	repository.targetedDescendants.mockResolvedValue([]);
	repository.unfinishedWork.mockImplementation(async () => saved?.failures ?? []);
	jobs.cancelPermanently.mockImplementation(async (_threadId, id) => {
		work = work.map((job) => (job.id === id ? { ...job, status: 'cancelled' } : job));
	});
	const thread = mock<AgentExecutionThread>({
		id: 'thread',
		agentId: 'agent',
		projectId: 'project',
		ownerId: 'user',
	});
	threads.lockById.mockResolvedValue(thread);
	threads.findOneBy.mockResolvedValue(thread);
	queue.listPending.mockResolvedValue([]);
	tx.run.mockImplementation(async (_ctx, callback) => await callback({}));
	locks.withLease.mockImplementation(
		async (_namespace, _key, callback) => await callback(new AbortController().signal),
	);
	const service = new AgentTaskCancellationService(
		repository,
		threads,
		executions,
		queue,
		plans,
		planService,
		jobs,
		chat,
		tx,
		locks,
		updates,
		checkpoints,
	);
	return {
		service,
		repository,
		executions,
		queue,
		plans,
		jobs,
		chat,
		checkpoints,
		work: () => work,
	};
}

it('preserves Done and Failed results and cancels unfinished tasks and groups', () => {
	const done = { ...task('done'), resultSummary: 'Sent', endedAt: '2026-10-01T10:00:00.000Z' };
	const failed = task('failed');
	const endedAt = '2026-10-01T10:01:00.000Z';
	const result = cancelPlanItems(
		[
			done,
			failed,
			task('pending'),
			{ ...task('in_progress'), kind: 'group', tasks: [done, task('in_progress')] },
		],
		endedAt,
	);
	expect(result[0]).toEqual(done);
	expect(result[1]).toEqual(failed);
	expect(result[2]).toMatchObject({ status: 'cancelled', endedAt });
	expect(result[3]).toMatchObject({
		status: 'cancelled',
		tasks: [done, { status: 'cancelled', endedAt }],
	});
});

it('saves the request and holds pending messages before stopping all kinds of work', async () => {
	const { service, repository, queue, jobs, work } = setup();
	const state = await service.request('thread', null);
	expect(repository.saveStop.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.cancelPermanently.mock.invocationCallOrder[0],
	);
	expect(queue.holdPending.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.cancelPermanently.mock.invocationCallOrder[0],
	);
	expect(jobs.cancelPermanently.mock.calls).toEqual([
		['child', 'nested'],
		['thread', 'workflow'],
		['thread', 'paused'],
	]);
	expect(work()[0]).toMatchObject({ status: 'completed', result: 'Saved result' });
	expect(state).toMatchObject({
		status: 'stopped',
		summary: { completed: 1, canceled: 3 },
		failures: [],
	});
});

it('stops the current response through runtime coordination after saving the boundary', async () => {
	const { service, repository, executions, chat } = setup();
	repository.captureGeneration.mockResolvedValue({
		executionIds: ['response'],
		jobIds: [],
		threadIds: [],
	});
	executions.findLatestByThreadId.mockResolvedValue(
		mock<AgentExecution>({ id: 'response', status: 'running' }),
	);
	await service.request('thread', null);
	expect(chat.requestCancel).toHaveBeenCalledExactlyOnceWith({
		projectId: 'project',
		agentId: 'agent',
		threadId: 'thread',
		executionId: 'response',
		userId: 'user',
		scope: 'foreground',
	});
	expect(repository.saveStop.mock.invocationCallOrder[0]).toBeLessThan(
		chat.requestCancel.mock.invocationCallOrder[0],
	);
});

it('rejects a stale displayed plan before it changes the queue or jobs', async () => {
	const { service, queue, jobs } = setup();
	await expect(service.request('thread', randomUUID())).rejects.toThrow('The plan has changed');
	expect(queue.holdPending).not.toHaveBeenCalled();
	expect(jobs.cancelPermanently).not.toHaveBeenCalled();
});

it('targets current work on each Stop without a saved operation identity', async () => {
	const { service, repository, queue, work } = setup();
	await service.request('thread', null);
	work().push(
		mock<AgentBackgroundJob>({ id: 'new-job', parentThreadId: 'thread', status: 'running' }),
	);
	const second = await service.request('thread', null);
	expect(repository.captureGeneration).toHaveBeenCalledTimes(2);
	expect(queue.holdPending).toHaveBeenCalledTimes(2);
	expect(work().find((job) => job.id === 'new-job')?.status).toBe('cancelled');
	expect(second).not.toHaveProperty('id');
});

it('keeps a failed stop visible until the user requests another stop', async () => {
	const { service, jobs } = setup();
	jobs.cancelPermanently.mockRejectedValueOnce(new Error('Unavailable'));
	const failed = await service.request('thread', null);
	expect(failed.status).toBe('failed');
	expect(failed.failures).toContainEqual({ jobId: 'nested', title: 'Nested task' });
	const retried = await service.request('thread', null);
	expect(retried.status).toBe('stopped');
});

it('reads remaining work without repeating stop attempts', async () => {
	const { service, repository, jobs } = setup();
	repository.unfinishedWork
		.mockResolvedValueOnce([{ jobId: 'parent', title: 'Current response' }])
		.mockResolvedValue([]);
	expect((await service.request('thread', null)).status).toBe('failed');
	const calls = jobs.cancelPermanently.mock.calls.length;
	expect((await service.state('thread'))?.status).toBe('stopped');
	expect(jobs.cancelPermanently).toHaveBeenCalledTimes(calls);
});

it('preserves a job that completes while its stop request fails', async () => {
	const { service, jobs, work } = setup();
	jobs.cancelPermanently.mockImplementation(async (_threadId, id) => {
		const job = work().find((item) => item.id === id)!;
		job.status = id === 'workflow' ? 'completed' : 'cancelled';
		if (id === 'workflow') {
			job.result = 'Confirmed output';
			throw new Error('Already finished');
		}
	});
	const state = await service.request('thread', null);
	expect(state).toMatchObject({ status: 'stopped', failures: [] });
	expect(work().find((job) => job.id === 'workflow')).toMatchObject({
		status: 'completed',
		result: 'Confirmed output',
	});
});

it('retries checkpoint cleanup for descendants that have no background job', async () => {
	const { service, repository, checkpoints } = setup();
	repository.targetedDescendants.mockResolvedValue([
		mock<AgentExecutionThread>({ id: 'child', agentId: 'child-agent', agentName: 'Child' }),
	]);
	checkpoints.deleteDelegatedForThread.mockRejectedValueOnce(new Error('Unavailable'));
	const first = await service.request('thread', null);
	expect(first).toMatchObject({ status: 'failed', failures: [{ jobId: 'child', title: 'Child' }] });
	const retried = await service.request('thread', null);
	expect(retried.status).toBe('stopped');
	expect(checkpoints.deleteDelegatedForThread).toHaveBeenCalledWith('child-agent', 'child');
});
