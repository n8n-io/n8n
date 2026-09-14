import type { Logger } from '@n8n/backend-common';
import type { UserRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { RoleService } from '@/services/role.service';

import { AgentUpdateBroadcaster } from '../agent-update-broadcaster';

const update = { projectId: 'project-1', agentId: 'agent-1' };

describe('AgentUpdateBroadcaster', () => {
	const logger = mock<Logger>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>();
	let broadcaster: AgentUpdateBroadcaster;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		Object.defineProperties(instanceSettings, {
			isWorker: { value: false, configurable: true },
			isMultiMain: { value: true, configurable: true },
		});
		broadcaster = new AgentUpdateBroadcaster(
			logger,
			userRepository,
			roleService,
			push,
			publisher,
			instanceSettings,
		);
	});

	it('sends updates to every agent reader except the writer and relays across mains', async () => {
		roleService.rolesWithScope.mockImplementation(async (namespace, scopes) =>
			scopes.includes('agent:read')
				? [namespace === 'global' ? 'global:admin' : 'project:editor']
				: [],
		);
		userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['reader-1']);

		broadcaster.notify(update, 'writer-push-ref');

		await vi.waitFor(() =>
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-agent-update',
				payload: { data: update, userIds: ['reader-1'], excludePushRef: 'writer-push-ref' },
			}),
		);
		expect(push.sendToUsers).toHaveBeenCalledWith(
			{ type: 'agentUpdated', data: update },
			['reader-1'],
			{ excludePushRef: 'writer-push-ref' },
		);
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledWith({
			projectIds: ['project-1'],
			projectRoleSlugs: ['project:editor'],
			globalRoleSlugs: ['global:admin'],
		});
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
