import type { Logger } from '@n8n/backend-common';
import type { UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import type { RoleService, Publisher } from '@n8n/backend-services';

import { AgentPushRecipientsService } from '../agent-push-recipients.service';
import { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import { testCluster } from './test-utils/cluster';

const update = { projectId: 'project-1', agentId: 'agent-1', source: 'mcp' as const };

describe('AgentUpdateBroadcaster', () => {
	const logger = mock<Logger>();
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	let broadcaster: AgentUpdateBroadcaster;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		broadcaster = new AgentUpdateBroadcaster(
			logger,
			new AgentPushRecipientsService(userRepository, roleService),
			push,
			publisher,
			testCluster({ queue: true }),
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

	it('does not relay an update that is too large for pub/sub', async () => {
		roleService.rolesWithScope.mockResolvedValue(['project:editor']);
		userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['reader-1']);

		broadcaster.notify(
			{ ...update, agentId: 'a'.repeat(6 * 1024 * 1024) },
			'writer-push-ref',
		);

		await vi.waitFor(() => expect(push.sendToUsers).toHaveBeenCalled());
		expect(publisher.publishCommand).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
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
