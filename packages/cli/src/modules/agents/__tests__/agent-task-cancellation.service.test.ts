import { LockService } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { randomUUID } from 'node:crypto';
import { version } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import { AgentPlanService } from '../agent-plan.service';
import { AgentTaskCancellationService } from '../agent-task-cancellation.service';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import { AgentPlanRepository } from '../repositories/agent-plan.repository';

function setup() {
	const repository = mock<AgentExecutionThreadRepository>();
	const executions = mock<AgentExecutionRepository>();
	const queue = mock<AgentMessageQueueRepository>();
	const plans = mock<AgentPlanRepository>();
	const planService = mock<AgentPlanService>();
	const jobs = mock<AgentBackgroundJobService>();
	const chat = mock<AgentChatExecutionService>();
	const tx = mock<TransactionRunner>();
	const locks = mock<LockService>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const messages = mock<AgentMessageQueueService>({ onAvailable: vi.fn() });
	const attachments = mock<AgentChatAttachmentService>();
	const lease = new AbortController();

	chat.requestCancel.mockResolvedValue(true);
	queue.discardPending.mockResolvedValue([]);
	messages.enqueueStopReport.mockResolvedValue(mock({ id: 'report-queue' }));

	let saved: Awaited<ReturnType<AgentExecutionThreadRepository['findTaskStop']>> = null;
	const work = [
		mock<AgentBackgroundJob>({
			id: 'completed',
			parentThreadId: 'thread',
			status: 'completed',
			result: 'Saved result',
		}),
	];

	repository.captureStopTargets.mockResolvedValue({ executionIds: [], jobIds: [], threadIds: [] });
	repository.findTaskStop.mockImplementation(async () => saved);
	repository.saveStop.mockImplementation(async (value) => (saved = value));
	repository.findJobsCapturedByStop.mockImplementation(async () => work);
	repository.findStopTargetsStillActive.mockImplementation(async () =>
		work
			.filter((job) => ['running', 'suspended'].includes(job.status))
			.map((job) => ({ jobId: job.id, title: job.title })),
	);
	jobs.requestPause.mockImplementation(async (_agentId, _threadId, _resourceId, pauseRequestId) => {
		for (const job of work.filter((item) => ['running', 'suspended'].includes(item.status)))
			job.pauseRequestId = pauseRequestId ?? 'stop';
	});

	repository.lockById.mockResolvedValue(
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
		async (_namespace, _key, callback) => await callback(lease.signal),
	);

	const service = new AgentTaskCancellationService(
		repository,
		executions,
		queue,
		plans,
		planService,
		jobs,
		chat,
		tx,
		locks,
		updates,
		messages,
		attachments,
	);

	return {
		service,
		repository,
		executions,
		queue,
		plans,
		jobs,
		chat,
		messages,
		work,
		attachments,
		lease,
	};
}

it('saves a stop between tasks and requests an acknowledgement without changing the plan', async () => {
	const { service, repository, queue, jobs, messages, work } = setup();

	const state = await service.request('thread', null);

	expect(repository.saveStop.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.requestPause.mock.invocationCallOrder[0],
	);
	expect(queue.discardPending.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.requestPause.mock.invocationCallOrder[0],
	);
	expect(work[0]).toMatchObject({ status: 'completed', result: 'Saved result' });
	expect(state).toMatchObject({ status: 'stopped' });
	expect(messages.onAvailable).toHaveBeenCalledWith('thread');
});

it('interrupts the current response through runtime coordination after saving the boundary', async () => {
	const { service, repository, executions, chat } = setup();
	repository.captureStopTargets.mockResolvedValue({
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

it('reuses the stop boundary without discarding the queue again', async () => {
	const { service, repository, queue, messages } = setup();

	const first = await service.request('thread', null);
	const firstId = (await repository.findTaskStop('thread'))!.pause!.id;

	expect(version(firstId)).toBe(7);

	const second = await service.request('thread', null);

	expect((await repository.findTaskStop('thread'))!.pause!.id).toBe(firstId);
	expect(second.requestedAt).toBe(first.requestedAt);
	expect(messages.enqueueStopReport).toHaveBeenCalledOnce();
	expect(repository.captureStopTargets).toHaveBeenCalledOnce();
	expect(queue.discardPending).toHaveBeenCalledOnce();
});

it('creates a new stop identity when work resumes', async () => {
	const { service, repository } = setup();

	await service.request('thread', null);
	const first = (await repository.findTaskStop('thread'))!;

	await repository.saveStop(
		{ ...first, pause: { ...first.pause!, resumedAt: new Date().toISOString() } },
		{},
	);

	await service.request('thread', null);
	const second = (await repository.findTaskStop('thread'))!;

	expect(version(second.pause!.id)).toBe(7);
	expect(second.pause!.id).not.toBe(first.pause!.id);
});

it('captures new work when Stop is requested again after a clean report', async () => {
	const { service, repository, messages } = setup();

	await service.request('thread', null);
	const first = (await repository.findTaskStop('thread'))!;

	await repository.saveStop(
		{ ...first, pause: { ...first.pause, reportedAt: new Date().toISOString() } },
		{},
	);

	await service.request('thread', null);

	expect((await repository.findTaskStop('thread'))!.pause.id).not.toBe(first.pause.id);
	expect(repository.captureStopTargets).toHaveBeenCalledTimes(2);
	expect(messages.enqueueStopReport).toHaveBeenCalledTimes(2);
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

it('keeps a failed foreground checkpoint stop retryable', async () => {
	const { service, repository, executions, chat } = setup();
	repository.captureStopTargets.mockResolvedValue({
		executionIds: ['response'],
		jobIds: [],
		threadIds: [],
	});
	executions.findLatestByThreadId.mockResolvedValue(
		mock<AgentExecution>({ id: 'response', status: 'success', hitlStatus: 'suspended' }),
	);
	repository.findStopTargetsStillActive.mockResolvedValue([
		{ jobId: 'response', title: 'Current response' },
	]);
	chat.requestCancel.mockRejectedValueOnce(new Error('Stop failed'));

	expect(await service.request('thread', null)).toMatchObject({
		status: 'failed',
		failures: [{ jobId: 'response', title: 'Current response' }],
	});

	repository.findStopTargetsStillActive.mockResolvedValue([]);

	expect(await service.request('thread', null)).toMatchObject({ status: 'stopped', failures: [] });
});

it('reports failures from both the current response and background jobs', async () => {
	const { service, repository, executions, chat, jobs, work } = setup();
	const failures = [
		{ jobId: 'response', title: 'Current response' },
		{ jobId: 'workflow', title: 'Workflow' },
	];
	repository.captureStopTargets.mockResolvedValue({
		executionIds: ['response'],
		jobIds: ['workflow'],
		threadIds: [],
	});
	executions.findLatestByThreadId.mockResolvedValue(
		mock<AgentExecution>({ id: 'response', status: 'running' }),
	);
	repository.findStopTargetsStillActive.mockResolvedValue(failures);
	work.push(
		mock<AgentBackgroundJob>({
			id: 'workflow',
			title: 'Workflow',
			status: 'running',
			parentThreadId: 'thread',
		}),
	);
	chat.requestCancel.mockRejectedValueOnce(new Error('Response stop failed'));
	jobs.requestPause.mockRejectedValueOnce(new Error('Background stop failed'));

	expect(await service.request('thread', null)).toMatchObject({ status: 'failed', failures });
});

it('deletes discarded attachments after the stop transaction commits', async () => {
	const { service, queue, attachments, jobs } = setup();
	queue.discardPending.mockResolvedValue(['attachment-1']);

	await service.request('thread', null);

	expect(attachments.deleteByIds).toHaveBeenCalledExactlyOnceWith(['attachment-1']);
	expect(queue.discardPending.mock.invocationCallOrder[0]).toBeLessThan(
		attachments.deleteByIds.mock.invocationCallOrder[0],
	);
	expect(attachments.deleteByIds.mock.invocationCallOrder[0]).toBeLessThan(
		jobs.requestPause.mock.invocationCallOrder[0],
	);
});

it('stops side effects when the cancellation lease is lost', async () => {
	const { service, repository, jobs, lease, messages } = setup();
	repository.findJobsCapturedByStop.mockImplementation(async () => {
		lease.abort(new Error('Lease lost'));

		return [];
	});

	await expect(service.request('thread', null)).rejects.toThrow('Lease lost');
	expect(jobs.requestPause).not.toHaveBeenCalled();
	expect(repository.saveStop).toHaveBeenCalledOnce();
	expect(messages.onAvailable).not.toHaveBeenCalled();
});

it('offers Retry when a suspended response cannot be canceled', async () => {
	const { service, repository, executions, chat } = setup();
	repository.captureStopTargets.mockResolvedValue({
		executionIds: ['response'],
		jobIds: [],
		threadIds: [],
	});
	executions.findLatestByThreadId.mockResolvedValue(
		mock<AgentExecution>({ id: 'response', status: 'success', hitlStatus: 'suspended' }),
	);
	repository.findStopTargetsStillActive.mockResolvedValue([
		{ jobId: 'response', title: 'Current response' },
	]);
	chat.requestCancel.mockResolvedValue(false);

	expect(await service.request('thread', null)).toMatchObject({
		status: 'failed',
		failures: [{ jobId: 'response', title: 'Current response' }],
	});
});

it('pauses parent-run work in the same transaction as the Stop record', async () => {
	const { service, plans, messages } = setup();
	plans.findLatestPlan.mockResolvedValue(mock({ id: 'plan', data: {} }));
	const stoppedPlan = { title: 'Plan', description: '', items: [] };
	plans.pauseManualTasks.mockResolvedValue(stoppedPlan);

	await service.request('thread', 'plan');

	expect(plans.pauseManualTasks).toHaveBeenCalledWith('thread', 'plan', {});
	expect(messages.enqueueStopReport.mock.calls[0][2]).toContain(JSON.stringify(stoppedPlan));
});
