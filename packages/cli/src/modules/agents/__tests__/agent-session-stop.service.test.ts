import type { ExecutionsConfig } from '@n8n/config';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentQueuedPreviewStreamService } from '../agent-queued-preview-stream.service';
import { AgentSessionStopService } from '../agent-session-stop.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';

describe('AgentSessionStopService', () => {
	const executionService = mock<AgentExecutionService>();
	const queue = mock<AgentMessageQueueService>();
	const publisher = mock<Publisher>();
	const config = mock<ExecutionsConfig>({ mode: 'regular' });
	const systemAgents = new SystemAgentRegistry();
	const chatExecutions = mock<AgentChatExecutionService>();
	const streams = mock<AgentQueuedPreviewStreamService>();
	const attachments = mock<AgentChatAttachmentService>();
	const service = new AgentSessionStopService(
		executionService,
		queue,
		publisher,
		config,
		systemAgents,
		chatExecutions,
		streams,
		attachments,
	);
	const thread = mock<AgentExecutionThread>({
		id: 'thread-1',
		projectId: 'project-1',
		agentId: 'agent-1',
		accessScope: 'project',
		ownerId: null,
	});
	const prepared = {
		executionIds: ['execution-1'],
		queueIds: ['queue-1', 'queue-2'],
		attachmentIds: ['attachment-1'],
	};
	const payload = {
		agentId: 'agent-1',
		threadId: 'thread-1',
		executionIds: prepared.executionIds,
		queueIds: prepared.queueIds,
	};
	const stop = async () => await service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1');

	beforeEach(() => {
		vi.clearAllMocks();
		config.mode = 'regular';
		executionService.findAccessibleThreadById.mockResolvedValue(thread);
		executionService.stopExecution.mockReturnValue(true);
		queue.prepareSessionStop.mockResolvedValue(prepared);
	});

	it('discards pending work before it aborts the current execution', async () => {
		await expect(stop()).resolves.toEqual({ cancelRequested: true });

		expect(executionService.findAccessibleThreadById).toHaveBeenCalledExactlyOnceWith(
			'thread-1',
			'project-1',
			'agent-1',
			'user-1',
		);
		expect(queue.prepareSessionStop).toHaveBeenCalledExactlyOnceWith('thread-1');
		expect(queue.prepareSessionStop.mock.invocationCallOrder[0]).toBeLessThan(
			executionService.stopExecution.mock.invocationCallOrder[0],
		);
		expect(executionService.stopExecution).toHaveBeenCalledExactlyOnceWith('execution-1');
		expect(streams.closeQueuedStreams).toHaveBeenCalledExactlyOnceWith(prepared.queueIds);
		expect(chatExecutions.cancelSessionWork).toHaveBeenCalledExactlyOnceWith(
			'agent-1',
			'thread-1',
			['execution-1'],
		);
		expect(attachments.deleteByIds).toHaveBeenCalledExactlyOnceWith(['attachment-1']);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('does not discard messages when the session is inaccessible', async () => {
		executionService.findAccessibleThreadById.mockResolvedValue(null);
		await expect(stop()).rejects.toThrow(NotFoundError);
		expect(queue.prepareSessionStop).not.toHaveBeenCalled();
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(chatExecutions.cancelSessionWork).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('keeps system Agent sessions on their own control route', async () => {
		vi.spyOn(systemAgents, 'has').mockReturnValueOnce(true);
		await expect(stop()).rejects.toThrow(NotFoundError);
		expect(queue.prepareSessionStop).not.toHaveBeenCalled();
	});

	it('does not abort the execution if the queue cannot be cleared', async () => {
		queue.prepareSessionStop.mockRejectedValueOnce(new Error('Queue write failed'));
		await expect(stop()).rejects.toThrow('Queue write failed');
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('does nothing when the session has no running or pending work', async () => {
		queue.prepareSessionStop.mockResolvedValueOnce({
			executionIds: [],
			queueIds: [],
			attachmentIds: [],
		});
		await expect(stop()).resolves.toEqual({ cancelRequested: false });
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('drops pending work even when no execution is running', async () => {
		queue.prepareSessionStop.mockResolvedValueOnce({ ...prepared, executionIds: [] });
		await expect(stop()).resolves.toEqual({ cancelRequested: true });
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(streams.closeQueuedStreams).toHaveBeenCalledWith(prepared.queueIds);
	});

	it('runs shared cleanup once when the pubsub request returns to this process', async () => {
		config.mode = 'queue';
		await stop();
		service.onStopSession(payload);
		expect(publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
			command: 'stop-agent-session',
			payload,
		});
		expect(chatExecutions.cancelSessionWork).toHaveBeenCalledTimes(1);
		expect(queue.prepareSessionStop).toHaveBeenCalledTimes(1);
		expect(attachments.deleteByIds).toHaveBeenCalledTimes(1);
	});

	it('only aborts local work and closes dropped-message streams for a relayed stop', () => {
		executionService.stopExecution.mockReturnValueOnce(false);
		service.onStopSession(payload);
		expect(chatExecutions.stopSessionExecutions).toHaveBeenCalledExactlyOnceWith(
			'agent-1',
			'thread-1',
			[],
		);
		expect(streams.closeQueuedStreams).toHaveBeenCalledExactlyOnceWith(prepared.queueIds);
		expect(chatExecutions.cancelSessionWork).not.toHaveBeenCalled();
		expect(queue.prepareSessionStop).not.toHaveBeenCalled();
		expect(attachments.deleteByIds).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('relays Stop before shared child cleanup can fail', async () => {
		config.mode = 'queue';
		chatExecutions.cancelSessionWork.mockRejectedValueOnce(new Error('Cleanup failed'));
		await expect(stop()).rejects.toThrow('Cleanup failed');
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'stop-agent-session',
			payload,
		});
		expect(attachments.deleteByIds).toHaveBeenCalledWith(prepared.attachmentIds);
	});

	it('cleans up discarded input even if the stop relay fails', async () => {
		config.mode = 'queue';
		publisher.publishCommand.mockRejectedValueOnce(new Error('Relay failed'));
		await expect(stop()).rejects.toThrow('Relay failed');
		expect(chatExecutions.cancelSessionWork).toHaveBeenCalledTimes(1);
		expect(attachments.deleteByIds).toHaveBeenCalledWith(prepared.attachmentIds);
	});
});
