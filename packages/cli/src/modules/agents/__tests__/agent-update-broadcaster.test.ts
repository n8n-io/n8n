import type { Logger } from '@n8n/backend-common';
import type { ProjectRelationRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentUpdateBroadcaster } from '../agent-update-broadcaster';

const update = { projectId: 'project-1', agentId: 'agent-1' };

describe('AgentUpdateBroadcaster', () => {
	const logger = mock<Logger>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>();
	let broadcaster: AgentUpdateBroadcaster;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['user-1', 'user-2']);
		Object.defineProperties(instanceSettings, {
			isWorker: { value: false, configurable: true },
			isMultiMain: { value: true, configurable: true },
		});
		broadcaster = new AgentUpdateBroadcaster(
			logger,
			projectRelationRepository,
			push,
			publisher,
			instanceSettings,
		);
	});

	it('sends to project members except the writing connection and relays across mains', async () => {
		broadcaster.notify(update, 'writer-push-ref');

		await vi.waitFor(() =>
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-agent-update',
				payload: {
					data: update,
					userIds: ['user-1', 'user-2'],
					excludePushRef: 'writer-push-ref',
				},
			}),
		);
		expect(push.sendToUsers).toHaveBeenCalledWith(
			{ type: 'agentUpdated', data: update },
			['user-1', 'user-2'],
			{ excludePushRef: 'writer-push-ref' },
		);
	});

	it('delivers a relayed update without publishing it again', () => {
		broadcaster.handleRelay({
			data: update,
			userIds: ['user-2'],
			excludePushRef: 'writer-push-ref',
		});

		expect(push.sendToUsers).toHaveBeenCalledWith(
			{ type: 'agentUpdated', data: update },
			['user-2'],
			{ excludePushRef: 'writer-push-ref' },
		);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});
