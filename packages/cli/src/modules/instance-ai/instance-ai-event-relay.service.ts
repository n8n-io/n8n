import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiMcpRegistryConnectionRepository } from './repositories/instance-ai-mcp-registry-connection.repository';

/**
 * Cleans up a user's Instance AI data when the user is deleted. Thread rows
 * cascade to their messages, checkpoints, snapshots, grants and confirmations
 * via FK, so deleting the threads is enough for those. Working-memory resources
 * and MCP registry connections have no FK to the user and are removed here.
 *
 * `resourceId` is deliberately a loose `varchar` rather than an FK to `user.id`
 * (it also stores derived sub-agent owners), so cleanup is done in service code
 * rather than a database cascade.
 */
@Service()
export class InstanceAiEventRelay {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly mcpRegistryConnectionRepository: InstanceAiMcpRegistryConnectionRepository,
	) {
		this.logger = this.logger.scoped('instance-ai');

		this.logger.debug('initializing Instance AI event relay...');

		this.eventService.on('user-deleted', async ({ targetUserId }) => {
			if (!targetUserId) {
				return;
			}
			await this.handleUserDeleted(targetUserId);
		});
	}

	private async handleUserDeleted(userId: string): Promise<void> {
		try {
			const deletedThreads = await this.memoryService.deleteThreadsForUser(userId);
			const { affected } = await this.mcpRegistryConnectionRepository.delete({ userId });
			this.logger.debug('Cleaned up Instance AI data for deleted user', {
				userId,
				deletedThreads,
				deletedMcpConnections: affected ?? 0,
			});
		} catch (error) {
			this.logger.error('Failed to clean up Instance AI data for deleted user', { userId, error });
		}
	}
}
