import type { SerializableAgentState } from '@n8n/agents';
import { LockService } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import { AgentTurnAlreadyRunningError } from '../agent-turn-already-running.error';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const context = {
	projectId: 'project-1',
	agentId: 'agent-1',
	threadId: 'thread-1',
	executionId: 'execution-1',
	userId: 'user-1',
};
const thread = mock<AgentExecutionThread>({
	id: context.threadId,
	projectId: context.projectId,
	agentId: context.agentId,
	accessScope: 'user',
	ownerId: context.userId,
	parentThreadId: null,
	taskId: null,
});
const running = mock<AgentExecution>({
	id: context.executionId,
	threadId: context.threadId,
	status: 'running',
	source: 'chat',
	hitlStatus: null,
});
const checkpoint = mock<SerializableAgentState>({
	status: 'suspended',
	persistence: { threadId: context.threadId, resourceId: 'draft-chat:user-1' },
	pendingToolCalls: {
		question: {
			toolCallId: 'question',
			toolName: 'ask_questions',
			input: {},
			suspended: true,
			suspendPayload: {},
			resumeSchema: {},
			runId: 'run-1',
		},
	},
});

function makeService({ messageQueueEnabled = true } = {}) {
	const repository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const publisher = mock<Publisher>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const lockService = Container.get(LockService);
	const service = new AgentChatExecutionService(
		lockService,
		repository,
		executionService,
		checkpointStorage,
		publisher,
		mock<InstanceSettings>({ isMultiMain: true }),
		updates,
		mock<AgentsConfig>({ messageQueueEnabled }),
	);
	executionService.findThreadById.mockResolvedValue(thread);
	repository.findOneBy.mockImplementation(async (where) =>
		!Array.isArray(where) && where.id === running.id && where.threadId === running.threadId
			? running
			: null,
	);
	repository.findLatestByThreadId.mockResolvedValue(running);
	checkpointStorage.findSuspendedForThread.mockResolvedValue(checkpoint);
	checkpointStorage.getStatus.mockResolvedValue({ status: 'active', checkpoint });
	checkpointStorage.cancelSuspended.mockResolvedValue(true);
	return {
		service,
		lockService,
		repository,
		executionService,
		checkpointStorage,
		publisher,
		updates,
	};
}

beforeEach(() => Container.reset());

describe.each([{ messageQueueEnabled: true }, { messageQueueEnabled: false }])(
	'messageQueueEnabled=$messageQueueEnabled',
	({ messageQueueEnabled }) => {
		it.each([
			{ userId: 'other-user' },
			{ projectId: 'other-project' },
			{ agentId: 'other-agent' },
			{ threadId: 'other-thread' },
			{ executionId: 'other-execution' },
		])('rejects unrelated Stop context: %s', async (other) => {
			const { service, publisher, checkpointStorage } = makeService({ messageQueueEnabled });
			const controller = new AbortController();
			service.register(context, controller);
			await expect(service.requestCancel({ ...context, ...other })).rejects.toBeInstanceOf(
				NotFoundError,
			);
			await service.handleCancel({ ...context, ...other });
			expect(controller.signal.aborted).toBe(false);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
		});

		it('relays Stop to the owning main and leaves other and later executions running', async () => {
			const mainA = makeService({ messageQueueEnabled });
			const mainB = makeService({ messageQueueEnabled });
			const controller = new AbortController();
			const other = new AbortController();
			mainA.service.register(context, controller);
			mainA.service.register(
				{ ...context, threadId: 'thread-2', executionId: 'execution-2' },
				other,
			);
			expect(await mainB.service.requestCancel(context)).toBe(true);
			expect(mainB.publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
				command: 'cancel-agent-chat-execution',
				payload: context,
			});
			await mainA.service.handleCancel(context);
			await mainA.service.handleCancel(context);
			expect(controller.signal.aborted).toBe(true);
			expect(other.signal.aborted).toBe(false);
			await mainA.service.settle(context.executionId, async () => {});
			const next = new AbortController();
			mainA.service.register({ ...context, executionId: 'execution-3' }, next);
			await mainA.service.handleCancel(context);
			expect(next.signal.aborted).toBe(false);
		});

		it('cancels the recorded suspension if the relay arrives after the execution settles', async () => {
			const { service, repository, checkpointStorage, updates } = makeService({
				messageQueueEnabled,
			});
			repository.findLatestByThreadId.mockResolvedValue({
				...running,
				status: 'success',
				hitlStatus: 'suspended',
			});
			await service.handleCancel(context);
			expect(checkpointStorage.delete).toHaveBeenCalledExactlyOnceWith('run-1', 'agent-1');
			expect(updates.notify).toHaveBeenCalledWith({
				projectId: context.projectId,
				agentId: context.agentId,
				threadId: context.threadId,
				executionId: context.executionId,
			});
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			await service.handleCancel(context);
			expect(checkpointStorage.delete).toHaveBeenCalledOnce();
		});
	},
);

describe('with the message queue flag on', () => {
	it('admits Preview turns and relays Stop without the Preview lock', async () => {
		const { service, lockService, repository, checkpointStorage } = makeService();
		const withLease = vi.spyOn(lockService, 'withLease');
		repository.existsRunningByThread.mockResolvedValue(true);

		await expect(service.admit(context.threadId, async () => 'created')).resolves.toBe('created');
		await expect(
			service.admitAutomaticContinuation(
				context.threadId,
				context.agentId,
				'run-1',
				async () => 'claimed',
			),
		).resolves.toBe('claimed');
		await service.requestCancel(context);

		expect(withLease).not.toHaveBeenCalled();
		expect(repository.existsRunningByThread).not.toHaveBeenCalled();
		expect(checkpointStorage.getStatus).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'cancels a stopped suspension before finalization releases the lease, finalization failed=%s',
		async (fail) => {
			const { service, checkpointStorage, repository } = makeService();
			const controller = new AbortController();
			service.register(context, controller);
			controller.abort();
			const order: string[] = [];
			checkpointStorage.delete.mockImplementation(async () => {
				order.push('cancel');
			});
			const error = new Error('recording failed');

			const settlement = service.settle(
				context.executionId,
				async () => {
					order.push('finalize');
					if (fail) throw error;
				},
				'run-1',
			);

			if (fail) await expect(settlement).rejects.toBe(error);
			else await expect(settlement).resolves.toBeUndefined();
			expect(order).toEqual(['cancel', 'finalize']);
			expect(checkpointStorage.delete).toHaveBeenCalledExactlyOnceWith('run-1', 'agent-1');
			const next = new AbortController();
			service.register({ ...context, executionId: 'execution-2' }, next);
			repository.findLatestByThreadId.mockResolvedValue({
				...running,
				id: 'execution-2',
				hitlStatus: 'suspended',
			});
			await service.handleCancel(context);
			expect(checkpointStorage.delete).toHaveBeenCalledOnce();
			expect(next.signal.aborted).toBe(false);
		},
	);

	it('leaves a checkpoint that a resume already claimed intact during cleanup', async () => {
		const { service, checkpointStorage } = makeService();
		const stopped = new AbortController();
		service.register(context, stopped);
		stopped.abort();
		checkpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { ...checkpoint, status: 'running' },
		});
		const finalize = vi.fn(async () => {});

		await service.settle(context.executionId, finalize, 'run-1');

		expect(finalize).toHaveBeenCalledOnce();
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
		expect(checkpointStorage.delete).not.toHaveBeenCalled();
	});
});

// TODO(AGENT-1031): Remove with the message queue flag.
describe('with the message queue flag off', () => {
	it('serializes thread admission without queuing and releases the lease after creation', async () => {
		const { service, repository } = makeService({ messageQueueEnabled: false });
		const entered = createDeferredPromise();
		const created = createDeferredPromise();
		const admission = service.admit(context.threadId, async () => {
			entered.resolve();
			await created.promise;
			repository.existsRunningByThread.mockResolvedValue(true);
		});
		await entered.promise;
		const competing = vi.fn();
		await expect(service.admit(context.threadId, competing)).rejects.toBeInstanceOf(
			AgentTurnAlreadyRunningError,
		);
		expect(competing).not.toHaveBeenCalled();
		created.resolve();
		await admission;
		await expect(service.admit(context.threadId, competing)).rejects.toBeInstanceOf(
			AgentTurnAlreadyRunningError,
		);
		repository.existsRunningByThread.mockResolvedValue(false);
		await service.admit(context.threadId, competing);
		expect(competing).toHaveBeenCalledOnce();

		const automaticEntered = createDeferredPromise();
		const automaticCreated = createDeferredPromise();
		const automaticAdmission = service.admitAutomaticContinuation(
			context.threadId,
			context.agentId,
			'run-1',
			async () => {
				automaticEntered.resolve();
				await automaticCreated.promise;
			},
		);
		await automaticEntered.promise;
		await expect(service.admit(context.threadId, competing)).rejects.toBeInstanceOf(
			AgentTurnAlreadyRunningError,
		);
		automaticCreated.resolve();
		await automaticAdmission;
	});

	it.each([false, true])(
		'cleans a raced suspension before releasing control, finalization failed=%s',
		async (fail) => {
			const { service, checkpointStorage, repository } = makeService({
				messageQueueEnabled: false,
			});
			const controller = new AbortController();
			service.register(context, controller);
			const deleting = createDeferredPromise();
			const deleted = createDeferredPromise();
			checkpointStorage.delete.mockImplementation(async () => {
				deleting.resolve();
				await deleted.promise;
			});
			const error = new Error('recording failed');
			const settlement = service.settle(
				context.executionId,
				async () => {
					controller.abort();
					if (fail) throw error;
				},
				'run-1',
			);
			const settled = fail
				? expect(settlement).rejects.toBe(error)
				: expect(settlement).resolves.toBeUndefined();
			await deleting.promise;
			await expect(service.admit(context.threadId, vi.fn())).rejects.toBeInstanceOf(
				AgentTurnAlreadyRunningError,
			);
			deleted.resolve();
			await settled;
			expect(checkpointStorage.delete).toHaveBeenCalledExactlyOnceWith('run-1', 'agent-1');
			const next = new AbortController();
			service.register({ ...context, executionId: 'execution-2' }, next);
			repository.findLatestByThreadId.mockResolvedValue({
				...running,
				id: 'execution-2',
				hitlStatus: 'suspended',
			});
			await service.handleCancel(context);
			expect(checkpointStorage.delete).toHaveBeenCalledOnce();
			expect(next.signal.aborted).toBe(false);
		},
	);

	it('leaves a checkpoint claimed by a later execution intact during cleanup', async () => {
		const { service, repository, checkpointStorage } = makeService({ messageQueueEnabled: false });
		const stopped = new AbortController();
		const resumed = new AbortController();
		service.register(context, stopped);
		stopped.abort();
		await service.settle(
			context.executionId,
			async () => {
				repository.findLatestByThreadId.mockResolvedValue({ ...running, id: 'execution-2' });
				service.register({ ...context, executionId: 'execution-2' }, resumed);
			},
			'run-1',
		);
		expect(resumed.signal.aborted).toBe(false);
		expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
		expect(checkpointStorage.delete).not.toHaveBeenCalled();
	});
});
