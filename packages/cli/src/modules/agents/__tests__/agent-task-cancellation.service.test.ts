import { TransactionRunner } from '@n8n/db';
import { LockService } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';
import { randomUUID } from 'node:crypto';
import { version } from 'uuid';

import { AgentTaskCancellationService } from '../agent-task-cancellation.service';
import { AgentTaskCancellationRepository } from '../repositories/agent-task-cancellation.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import { AgentPlanRepository } from '../repositories/agent-plan.repository';
import { AgentPlanService } from '../agent-plan.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentWakeService } from '../background/agent-wake.service';
import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';

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
	const wake = mock<AgentWakeService>();
	let saved: Awaited<ReturnType<AgentTaskCancellationRepository['latest']>> = null;
	const work = [
		mock<AgentBackgroundJob>({
			id: 'completed',
			parentThreadId: 'thread',
			status: 'completed',
			result: 'Saved result',
		}),
	];
	repository.captureGeneration.mockResolvedValue({ executionIds: [], jobIds: [], threadIds: [] });
	repository.latest.mockImplementation(async () => saved);
	repository.saveStop.mockImplementation(async (value) => (saved = value));
	repository.targetedJobs.mockImplementation(async () => work);
	repository.unfinishedWork.mockImplementation(async () =>
		work
			.filter((job) => ['running', 'suspended'].includes(job.status))
			.map((job) => ({ jobId: job.id, title: job.title })),
	);
	jobs.requestPause.mockImplementation(async (_agentId, _threadId, _resourceId, pauseRequestId) => {
		for (const job of work.filter((item) => ['running', 'suspended'].includes(item.status)))
			job.pauseRequestId = pauseRequestId ?? 'stop';
	});

	threads.lockById.mockResolvedValue(
		mock<AgentExecutionThread>({
			id: 'thread',
			agentId: 'agent',
			projectId: 'project',
			ownerId: 'user',
		}),
	);
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
		wake,
	);
	return { service, repository, executions, queue, plans, jobs, chat, wake, work };
}

it('saves a stop between tasks and requests an acknowledgement without changing the plan', async () => {
	const { service, repository, queue, jobs, wake, work } = setup();
	const state = await service.request('thread', null);
	expect(repository.saveStop.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.requestPause.mock.invocationCallOrder[0],
	);
	expect(queue.discardPending.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.requestPause.mock.invocationCallOrder[0],
	);
	expect(work[0]).toMatchObject({ status: 'completed', result: 'Saved result' });
	expect(state).toMatchObject({ status: 'stopped' });
	expect(wake.requestWake).toHaveBeenCalledWith('thread');
});

it('interrupts the current response through runtime coordination after saving the boundary', async () => {
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
		surface: 'preview',
	});
	expect(repository.saveStop.mock.invocationCallOrder[0]).toBeLessThan(
		chat.requestCancel.mock.invocationCallOrder[0],
	);
});

it('rejects a stale displayed plan before it changes the queue or jobs', async () => {
	const { service, queue, jobs } = setup();
	await expect(service.request('thread', randomUUID())).rejects.toThrow('The plan has changed');
	expect(queue.discardPending).not.toHaveBeenCalled();
	expect(jobs.requestPause).not.toHaveBeenCalled();
});

it('reuses the stop boundary for retries and leaves later queued input intact', async () => {
	const { service, repository, queue } = setup();
	const first = await service.request('thread', null);
	const firstId = (await repository.latest('thread'))!.pause!.id;
	expect(version(firstId)).toBe(7);
	const second = await service.request('thread', null);
	expect((await repository.latest('thread'))!.pause!.id).toBe(firstId);
	expect(second.requestedAt).toBe(first.requestedAt);
	expect(repository.captureGeneration).toHaveBeenCalledOnce();
	expect(queue.discardPending).toHaveBeenCalledOnce();
});

it('orders a new stop after the previous stop when work resumes', async () => {
	const { service, repository } = setup();
	await service.request('thread', null);
	const first = (await repository.latest('thread'))!;
	await repository.saveStop(
		{ ...first, pause: { ...first.pause!, resumedAt: new Date().toISOString() } },
		{},
	);
	await service.request('thread', null);
	const second = (await repository.latest('thread'))!;
	expect(version(second.pause!.id)).toBe(7);
	expect(second.pause!.id > first.pause!.id).toBe(true);
});

it('shows Stopping until active work has settled and preserves paused checkpoints', async () => {
	const { service, work } = setup();
	work.push(
		mock<AgentBackgroundJob>({
			id: 'working',
			title: 'Research',
			status: 'running',
			parentThreadId: 'thread',
		}),
	);
	expect((await service.request('thread', null)).status).toBe('stopping');
	work[1].status = 'paused';
	expect((await service.state('thread'))?.status).toBe('stopped');
});

it('keeps a failed stop retryable and reconciles work that has since finished', async () => {
	const { service, jobs, work } = setup();
	work.push(
		mock<AgentBackgroundJob>({
			id: 'workflow',
			title: 'Workflow',
			status: 'running',
			parentThreadId: 'thread',
		}),
	);
	jobs.requestPause.mockRejectedValueOnce(new Error('Unavailable'));
	expect(await service.request('thread', null)).toMatchObject({
		status: 'failed',
		failures: [{ jobId: 'workflow', title: 'Workflow' }],
	});
	jobs.requestPause.mockImplementation(async () => {
		work[1].status = 'completed';
	});
	expect(await service.request('thread', null)).toMatchObject({ status: 'stopped', failures: [] });
});

it('offers Retry if a stop was saved before the server could pause its jobs', async () => {
	const { service, work } = setup();
	await service.request('thread', null);
	work.push(
		mock<AgentBackgroundJob>({
			id: 'unpaused',
			pauseRequestId: null,
			title: 'Research',
			status: 'running',
			parentThreadId: 'thread',
		}),
	);
	expect(await service.state('thread')).toMatchObject({
		status: 'failed',
		failures: [{ jobId: 'unpaused', title: 'Research' }],
	});
});

it('keeps a failed foreground checkpoint stop retryable', async () => {
	const { service, repository, executions, chat } = setup();
	repository.captureGeneration.mockResolvedValue({
		executionIds: ['response'],
		jobIds: [],
		threadIds: [],
	});
	executions.findLatestByThreadId.mockResolvedValue(
		mock<AgentExecution>({ id: 'response', status: 'success', hitlStatus: 'suspended' }),
	);
	repository.unfinishedWork.mockResolvedValue([{ jobId: 'response', title: 'Current response' }]);
	chat.requestCancel.mockRejectedValueOnce(new Error('Stop failed'));
	expect(await service.request('thread', null)).toMatchObject({
		status: 'failed',
		failures: [{ jobId: 'response', title: 'Current response' }],
	});
	repository.unfinishedWork.mockResolvedValue([]);
	expect(await service.request('thread', null)).toMatchObject({ status: 'stopped', failures: [] });
});
