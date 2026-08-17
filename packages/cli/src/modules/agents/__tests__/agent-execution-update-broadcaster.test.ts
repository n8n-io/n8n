import type { Logger } from '@n8n/backend-common';
import type { ProjectRelationRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';

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
	let broadcaster: AgentExecutionUpdateBroadcaster;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1', 'user-2']);
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
