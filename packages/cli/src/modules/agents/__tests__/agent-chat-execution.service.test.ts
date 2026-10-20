import type { SerializableAgentState } from '@n8n/agents';
import { LockService } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@n8n/errors';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { PARENT_TASK_CANCELLED_REASON } from '../background/sub-agent-background-state';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
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
	surface: 'preview' as const,
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
			toolName: 'agent_builder_ask_questions',
			input: {},
			suspended: true,
			suspendPayload: {},
			resumeSchema: {},
			runId: 'run-1',
		},
	},
});

function makeService(isMultiMain = true) {
	const repository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const publisher = mock<Publisher>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const steering = mock<AgentMessageSteeringService>();
	const backgroundJobs = mock<AgentBackgroundJobService>();
	const service = new AgentChatExecutionService(
		Container.get(LockService),
		repository,
		executionService,
		checkpointStorage,
		publisher,
		mock<InstanceSettings>({ isMultiMain }),
		updates,
		steering,
		backgroundJobs,
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
		repository,
		executionService,
		checkpointStorage,
		publisher,
		updates,
		steering,
		backgroundJobs,
	};
}

beforeEach(() => Container.reset());

it('closes steering admission before signaling Stop', async () => {
	const { service, steering } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	const committed = createDeferredPromise();
	steering.close.mockReturnValue(committed.promise);
	const stopping = service.requestCancel(context);
	await vi.waitFor(() =>
		expect(steering.close).toHaveBeenCalledWith(context.threadId, context.executionId),
	);
	try {
		expect(controller.signal.aborted).toBe(false);
	} finally {
		committed.resolve();
	}
	await stopping;
	expect(controller.signal.aborted).toBe(true);
	await service.settle(context.executionId, async () => {});
});

it('leaves background children running when a connection closes during suspension', async () => {
	const { service, backgroundJobs } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	controller.abort();
	await service.settle(context.executionId, async () => {}, 'run-1');
	expect(backgroundJobs.cancelForParent).not.toHaveBeenCalled();
});

it('releases the cancellation controller when finalization fails', async () => {
	const { service } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	const failure = new Error('Recording failed');
	await expect(
		service.settle(context.executionId, async () => {
			throw failure;
		}),
	).rejects.toBe(failure);

	await service.onCancelForegroundExecution(context);

	expect(controller.signal.aborted).toBe(false);
});

it.each([
	{ userId: 'other-user' },
	{ projectId: 'other-project' },
	{ agentId: 'other-agent' },
	{ threadId: 'other-thread' },
	{ executionId: 'other-execution' },
])('rejects unrelated Stop context: %s', async (other) => {
	const { service, publisher, checkpointStorage } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	await expect(service.requestCancel({ ...context, ...other })).rejects.toBeInstanceOf(
		NotFoundError,
	);
	await service.onCancelExecution({ ...context, ...other });
	expect(controller.signal.aborted).toBe(false);
	expect(publisher.publishCommand).not.toHaveBeenCalled();
	expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
});

it('relays Stop to the owning main and leaves other and later executions running', async () => {
	const mainA = makeService();
	const mainB = makeService();
	const controller = new AbortController();
	const other = new AbortController();
	mainA.service.register(context, controller);
	mainA.service.register({ ...context, threadId: 'thread-2', executionId: 'execution-2' }, other);
	expect(await mainB.service.requestCancel(context)).toBe(true);
	expect(mainB.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
		'agent-1',
		'thread-1',
		'draft-chat:user-1',
	);
	const { surface: _surface, ...wireContext } = context;
	expect(mainB.publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
		command: 'cancel-agent-chat-execution',
		payload: { ...wireContext, surface: 'preview', productionN8nChat: false },
	});
	await mainA.service.onCancelExecution(context);
	expect(mainA.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
		'agent-1',
		'thread-1',
		'draft-chat:user-1',
	);
	await mainA.service.onCancelExecution(context);
	expect(controller.signal.aborted).toBe(true);
	expect(other.signal.aborted).toBe(false);
	await mainA.service.settle(context.executionId, async () => {});
	const next = new AbortController();
	mainA.service.register({ ...context, executionId: 'execution-3' }, next);
	await mainA.service.onCancelExecution(context);
	expect(next.signal.aborted).toBe(false);
});

it('keeps pubsub wire compatibility with a main still on the old productionN8nChat payload', async () => {
	const mainA = makeService();
	const mainB = makeService();
	const controller = new AbortController();
	const production = { ...context, surface: 'n8n-chat' as const };
	mainA.service.register(production, controller);
	const producedExecution = { ...running, source: 'n8n_chat_production' };
	mainA.repository.findOneBy.mockResolvedValue(producedExecution);
	mainB.repository.findOneBy.mockResolvedValue(producedExecution);

	expect(await mainB.service.requestCancel(production)).toBe(true);
	const { surface: _surface, ...wireContext } = production;
	expect(mainB.publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
		command: 'cancel-agent-chat-execution',
		payload: { ...wireContext, surface: 'n8n-chat', productionN8nChat: true },
	});

	// An old main on the previous version relays this shape, with no `surface` field.
	await mainA.service.onCancelExecution({ ...wireContext, productionN8nChat: true });
	expect(controller.signal.aborted).toBe(true);
	expect(mainA.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
		'agent-1',
		'thread-1',
		'n8n-chat-production:user-1',
	);
});

it.each(['foreground', 'all'] as const)(
	'relays %s Stop of a system-agent turn with its own surface and memory scope',
	async (scope) => {
		const mainA = makeService();
		const mainB = makeService();
		const controller = new AbortController();
		const system = { ...context, surface: 'system' as const };
		mainA.service.register(system, controller);
		const systemExecution = { ...running, source: 'system_chat' };
		mainA.repository.findOneBy.mockResolvedValue(systemExecution);
		mainB.repository.findOneBy.mockResolvedValue(systemExecution);

		expect(await mainB.service.requestCancel({ ...system, scope })).toBe(true);
		const { surface: _surface, ...wireContext } = system;
		expect(mainB.publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
			command:
				scope === 'foreground' ? 'cancel-agent-chat-foreground' : 'cancel-agent-chat-execution',
			payload: { ...wireContext, surface: 'system', productionN8nChat: false },
		});

		const payload = {
			...wireContext,
			surface: 'system' as const,
			productionN8nChat: false,
		};
		if (scope === 'foreground') {
			await mainA.service.onCancelForegroundExecution(payload);
		} else {
			await mainA.service.onCancelExecution(payload);
		}
		expect(controller.signal.aborted).toBe(true);
		for (const main of [mainA, mainB]) {
			if (scope === 'foreground') {
				expect(main.backgroundJobs.cancelForParent).not.toHaveBeenCalled();
			} else {
				expect(main.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
					'agent-1',
					'thread-1',
					'system-chat:user-1',
				);
			}
		}
	},
);

it('does not let the Preview surface stop a system-agent turn', async () => {
	const { service, repository } = makeService(false);
	repository.findOneBy.mockResolvedValue({ ...running, source: 'system_chat' });

	await expect(service.requestCancel(context)).rejects.toThrow('Execution not found');
});

describe.each(['foreground', 'all'] as const)('%s Stop during startup', (scope) => {
	it.each(['local', 'remote'] as const)(
		'waits for registration on the %s main',
		async (arrival) => {
			const owner = makeService(arrival === 'remote');
			const caller = arrival === 'local' ? owner : makeService();
			const controller = new AbortController();
			const creating = createDeferredPromise();
			const created = createDeferredPromise();
			const lock = vi.spyOn(Container.get(LockService), 'withLease');
			const startup = owner.service.withTurnLock(context.threadId, async () => {
				creating.resolve();
				await created.promise;
				owner.service.register(context, controller);
			});
			await creating.promise;
			caller.publisher.publishCommand.mockImplementation(async () => {
				if (scope === 'foreground') await owner.service.onCancelForegroundExecution(context);
				else await owner.service.onCancelExecution(context);
			});

			const stopping = caller.service.requestCancel({ ...context, scope });
			try {
				await vi.waitFor(() => expect(lock).toHaveBeenCalledTimes(2));
				expect(caller.repository.findOneBy).not.toHaveBeenCalled();
				expect(caller.publisher.publishCommand).not.toHaveBeenCalled();
				expect(controller.signal.aborted).toBe(false);
			} finally {
				created.resolve();
			}
			await startup;
			await expect(stopping).resolves.toBe(true);

			if (scope === 'foreground') {
				expect(controller.signal.reason).toMatchObject({ name: 'AbortError' });
				expect(owner.backgroundJobs.cancelForParent).not.toHaveBeenCalled();
				expect(caller.backgroundJobs.cancelForParent).not.toHaveBeenCalled();
			} else {
				expect(controller.signal.reason).toBe(PARENT_TASK_CANCELLED_REASON);
				expect(owner.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
					context.agentId,
					context.threadId,
					'draft-chat:user-1',
				);
			}
			if (arrival === 'remote') {
				const { surface: _surface, ...wireContext } = context;
				expect(caller.publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
					command:
						scope === 'foreground' ? 'cancel-agent-chat-foreground' : 'cancel-agent-chat-execution',
					payload: { ...wireContext, surface: 'preview', productionN8nChat: false },
				});
			}
			await owner.service.settle(context.executionId, async () => {});
		},
	);
});

it.each([false, true])(
	'cleans a raced suspension before releasing control, finalization failed=%s',
	async (fail) => {
		const { service, checkpointStorage, repository } = makeService();
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
		await service.onCancelExecution(context);
		expect(checkpointStorage.delete).toHaveBeenCalledOnce();
		expect(next.signal.aborted).toBe(false);
	},
);

it('cancels the recorded suspension if the relay arrives after the execution settles', async () => {
	const { service, repository, checkpointStorage, updates } = makeService();
	repository.findLatestByThreadId.mockResolvedValue({
		...running,
		status: 'success',
		hitlStatus: 'suspended',
	});
	await service.onCancelExecution(context);
	expect(checkpointStorage.delete).toHaveBeenCalledExactlyOnceWith('run-1', 'agent-1');
	expect(updates.notify).toHaveBeenCalledWith({
		projectId: context.projectId,
		agentId: context.agentId,
		threadId: context.threadId,
		executionId: context.executionId,
	});
	checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
	await service.onCancelExecution(context);
	expect(checkpointStorage.delete).toHaveBeenCalledOnce();
});

it('leaves a checkpoint claimed by a later execution intact during cleanup', async () => {
	const { service, repository, checkpointStorage } = makeService();
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

it('requires the production source before cancelling a suspended run', async () => {
	const { service, executionService, checkpointStorage } = makeService();
	checkpointStorage.getStatus.mockResolvedValue({
		status: 'active',
		checkpoint: {
			...checkpoint,
			persistence: {
				threadId: context.threadId,
				resourceId: 'n8n-chat-production:user-1',
			},
		},
	});
	executionService.canUseProductionChatThread.mockResolvedValue(false);
	expect(
		await service.cancelSuspended({
			agentId: context.agentId,
			runId: 'run-1',
			resourceId: 'n8n-chat-production:user-1',
		}),
	).toBe(false);
	expect(checkpointStorage.cancelSuspended).not.toHaveBeenCalled();
	executionService.canUseProductionChatThread.mockResolvedValue(true);
	expect(
		await service.cancelSuspended({
			agentId: context.agentId,
			runId: 'run-1',
			resourceId: 'n8n-chat-production:user-1',
		}),
	).toBe(true);
	expect(executionService.canUseProductionChatThread).toHaveBeenCalledWith(
		context.threadId,
		context.projectId,
		context.agentId,
		context.userId,
		'existing',
	);
});

it('rejects preview and foreign executions on the production cancel route', async () => {
	const { service, repository } = makeService();
	const production = { ...context, surface: 'n8n-chat' as const };
	await expect(service.requestCancel(production)).rejects.toBeInstanceOf(NotFoundError);
	repository.findOneBy.mockResolvedValue({ ...running, source: 'n8n_chat_production' });
	await expect(
		service.requestCancel({ ...production, userId: 'other-user' }),
	).rejects.toBeInstanceOf(NotFoundError);
});

it('foreground Stop leaves detached jobs running locally and on other mains', async () => {
	const { service, backgroundJobs, publisher } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	await service.requestCancel({ ...context, scope: 'foreground' });
	expect(controller.signal.aborted).toBe(true);
	expect(backgroundJobs.cancelForParent).not.toHaveBeenCalled();
	await service.onCancelForegroundExecution(context);
	expect(backgroundJobs.cancelForParent).not.toHaveBeenCalled();
	expect(publisher.publishCommand).not.toHaveBeenCalled();
});

it('foreground Stop removes a suspended checkpoint without canceling detached jobs', async () => {
	const { service, repository, checkpointStorage, backgroundJobs } = makeService();
	const suspended = { ...running, status: 'success' as const, hitlStatus: 'suspended' as const };
	repository.findOneBy.mockResolvedValue(suspended);
	repository.findLatestByThreadId.mockResolvedValue(suspended);
	await service.requestCancel({ ...context, scope: 'foreground' });
	expect(checkpointStorage.delete).toHaveBeenCalledWith('run-1', 'agent-1');
	expect(backgroundJobs.cancelForParent).not.toHaveBeenCalled();
});

it('relays cancel-all after the foreground reply settles', async () => {
	const mainA = makeService();
	const mainB = makeService();
	const controller = new AbortController();
	mainA.service.register(context, controller);
	await mainA.service.requestCancel({ ...context, scope: 'foreground' });
	await mainA.service.settle(context.executionId, async () => {});
	const cancelled = { ...running, status: 'cancelled' as const };
	for (const main of [mainA, mainB]) {
		main.repository.findOneBy.mockResolvedValue(cancelled);
		main.repository.findLatestByThreadId.mockResolvedValue(cancelled);
	}

	await mainB.service.requestCancel({ ...context, scope: 'all' });
	const { surface: _surface, ...wireContext } = context;
	const payload = { ...wireContext, surface: 'preview' as const, productionN8nChat: false };
	expect(mainB.publisher.publishCommand).toHaveBeenCalledWith({
		command: 'cancel-agent-chat-execution',
		payload,
	});
	await mainA.service.onCancelExecution(payload);
	expect(mainA.backgroundJobs.cancelForParent).toHaveBeenCalledWith(
		context.agentId,
		context.threadId,
		'draft-chat:user-1',
	);
});

it('ignores a delayed cancel-all relay after a later reply settles', async () => {
	const { service, repository, backgroundJobs } = makeService();
	repository.findOneBy.mockResolvedValue({ ...running, status: 'cancelled' });
	repository.findLatestByThreadId.mockResolvedValue({
		...running,
		id: 'execution-2',
		status: 'success',
	});
	await service.onCancelExecution(context);
	expect(backgroundJobs.cancelForParent).not.toHaveBeenCalled();
});

it.each([
	['foreground', 'all'],
	['all', 'foreground'],
] as const)('cancels detached jobs when requests arrive as %s then %s', async (first, second) => {
	const { service, backgroundJobs } = makeService();
	const controller = new AbortController();
	service.register(context, controller);
	await service.requestCancel({ ...context, scope: first });
	await service.requestCancel({ ...context, scope: second });
	expect(controller.signal.aborted).toBe(true);
	expect(backgroundJobs.cancelForParent).toHaveBeenCalledExactlyOnceWith(
		context.agentId,
		context.threadId,
		'draft-chat:user-1',
	);
});
