import { resolveWhatsAppSettings } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentRepository } from './repositories/agent.repository';

/**
 * Deletes the media that customers sent to a WhatsApp channel once it is older
 * than the channel's retention setting. Media from a channel that was later
 * removed stays until its thread or agent is deleted.
 */
@SystemTask()
export class AgentChannelMediaRetentionTask implements SystemTask {
	readonly name = 'agent-channel-media-retention';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.hours.toSeconds);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		runOnTakeover: true,
	};

	readonly retryDelaySeconds = 60;

	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly attachmentService: AgentChatAttachmentService,
		private readonly logger: Logger,
	) {}

	async run(): Promise<void> {
		const agents = await this.agentRepository.findWithIntegrationType('whatsapp');
		for (const agent of agents) {
			const integration = agent.integrations?.find((i) => i.type === 'whatsapp');
			if (integration?.type !== 'whatsapp') continue;

			const { mediaRetentionDays } = resolveWhatsAppSettings(integration.settings);
			const before = new Date(Date.now() - mediaRetentionDays * Time.days.toMilliseconds);
			const deleted = await this.attachmentService.deleteFromSourceCreatedBefore(
				{ agentId: agent.id, source: 'whatsapp' },
				before,
			);
			if (deleted > 0) {
				this.logger.debug('[AgentChannelMediaRetention] Deleted expired WhatsApp media', {
					agentId: agent.id,
					deleted,
				});
			}
		}
	}
}
