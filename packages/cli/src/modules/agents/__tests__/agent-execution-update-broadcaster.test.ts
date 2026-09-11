import type { Logger } from '@n8n/backend-common';
import type { ProjectRelationRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';

const update = {
	projectId: 'project-1',
	agentId: 'agent-1',
	threadId: 'thread-1',
	executionId: 'execution-1',
};

describe('AgentExecutionUpdateBroadcaster', () => {
	const logger = mock<Logger>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const thread = mock<AgentExecutionThread>({ projectId: 'project-1', agentId: 'agent-1' });
	let broadcaster: AgentExecutionUpdateBroadcaster;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1', 'user-2']);
		threadRepository.findOneBy.mockResolvedValue(thread);
		Object.defineProperties(instanceSettings, {
			isWorker: { value: false, configurable: true },
			isMultiMain: { value: false, configurable: true },
		});
		broadcaster = new AgentExecutionUpdateBroadcaster(
			logger,
			projectRelationRepository,
			push,
			publisher,
			instanceSettings,
			threadRepository,
		);
	});

	it('sends project-scoped invalidations locally and relays them from workers', async () => {
		Object.defineProperty(instanceSettings, 'isWorker', { value: true, configurable: true });

		broadcaster.notify(update);

		await vi.waitFor(() =>
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-agent-execution-update',
				payload: { data: update, userIds: ['user-1', 'user-2'] },
			}),
		);
		expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'agentExecutionUpdated', data: update }, [
			'user-1',
			'user-2',
		]);
	});

	it('delivers relayed invalidations locally without publishing them again', () => {
		broadcaster.handleRelay({ data: update, userIds: ['user-2'] });

		expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'agentExecutionUpdated', data: update }, [
			'user-2',
		]);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it.each(['isWorker', 'isMultiMain'] as const)(
		'delivers parent task updates locally and relays them with %s',
		async (mode) => {
			Object.defineProperty(instanceSettings, mode, { value: true, configurable: true });
			const data = { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' };
			broadcaster.notifyBackgroundTasks('agent-1', 'thread-1');
			await vi.waitFor(() =>
				expect(publisher.publishCommand).toHaveBeenCalledWith({
					command: 'relay-agent-background-tasks-update',
					payload: { data, userIds: ['user-1', 'user-2'] },
				}),
			);
			expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'agentBackgroundTasksUpdated', data }, [
				'user-1',
				'user-2',
			]);
		},
	);

	it('delivers relayed task updates without another relay', () => {
		const data = { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' };
		broadcaster.handleBackgroundTasksRelay({ data, userIds: ['user-2'] });
		expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'agentBackgroundTasksUpdated', data }, [
			'user-2',
		]);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('skips missing or unrelated parent threads and contains lookup errors', async () => {
		threadRepository.findOneBy
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ ...thread, agentId: 'other-agent' });
		broadcaster.notifyBackgroundTasks('agent-1', 'missing');
		broadcaster.notifyBackgroundTasks('agent-1', 'unrelated');
		await vi.waitFor(() => expect(threadRepository.findOneBy).toHaveBeenCalledTimes(2));
		expect(push.sendToUsers).not.toHaveBeenCalled();
		threadRepository.findOneBy.mockRejectedValueOnce(new Error('lookup failed'));
		broadcaster.notifyBackgroundTasks('agent-1', 'thread-1');
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledOnce());
	});

	it('contains project lookup and relay failures', async () => {
		projectRelationRepository.findUserIdsByProjectId.mockRejectedValueOnce(
			new Error('lookup failed'),
		);
		broadcaster.notify(update);
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledTimes(1));
		expect(push.sendToUsers).not.toHaveBeenCalled();

		Object.defineProperty(instanceSettings, 'isMultiMain', { value: true, configurable: true });
		publisher.publishCommand.mockRejectedValueOnce(new Error('relay failed'));
		broadcaster.notify(update);
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledTimes(2));

		expect(push.sendToUsers).toHaveBeenCalledWith({ type: 'agentExecutionUpdated', data: update }, [
			'user-1',
			'user-2',
		]);
	});
});
