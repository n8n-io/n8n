import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { SerializableAgentState } from '@n8n/agents';
import { LockService } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

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

function makeService(isMultiMain = true) {
	const repository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const publisher = mock<Publisher>();
	const updates = mock<AgentExecutionUpdateBroadcaster>();
	const steering = mock<AgentMessageSteeringService>();
	const service = new AgentChatExecutionService(
		Container.get(LockService),
		repository,
		executionService,
		checkpointStorage,
		publisher,
		mock<InstanceSettings>({ isMultiMain }),
		updates,
		steering,
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
	return { service, repository, executionService, checkpointStorage, publisher, updates, steering };
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
	await service.handleCancel({ ...context, ...other });
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

it.each(['local', 'remote', 'during validation'] as const)(
	'applies an early %s Stop when the execution registers',
	async (arrival) => {
		const { service, repository } = makeService(arrival !== 'local');
		const controller = new AbortController();
		if (arrival === 'during validation') {
			repository.findOneBy.mockImplementationOnce(async () => {
				service.register(context, controller);
				return running;
			});
		}
		if (arrival === 'local') expect(await service.requestCancel(context)).toBe(true);
		else await service.handleCancel(context);
		if (arrival !== 'during validation') service.register(context, controller);
		expect(controller.signal.aborted).toBe(true);
		await service.settle(context.executionId, async () => {});
		const next = new AbortController();
		service.register({ ...context, executionId: 'execution-2' }, next);
		expect(next.signal.aborted).toBe(false);
	},
);

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
		await service.handleCancel(context);
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
