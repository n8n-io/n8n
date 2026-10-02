import { Logger } from '@n8n/backend-common';
import { SettingsRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import type { AgentMessageQueue } from './entities/agent-message-queue.entity';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { readInboundUserMessage } from './utils/inbound-attachments';

const AGENTS_ENABLED_KEY = 'agents.enabled';

@Service()
export class AgentsSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly txRunner: TransactionRunner,
		private readonly queue: AgentMessageQueueRepository,
		private readonly threads: AgentExecutionThreadRepository,
		private readonly messages: AgentMessageRepository,
		private readonly attachments: AgentChatAttachmentService,
		private readonly updates: AgentExecutionUpdateBroadcaster,
		private readonly logger: Logger,
	) {}

	async getEnabled(ctx: OperationContext = {}): Promise<boolean> {
		// Queue transactions hold a read lock until admission commits. Disabling waits for them.
		const setting = ctx.trx
			? await this.settingsRepository.getOrCreateWithReadLock(AGENTS_ENABLED_KEY, 'true', true, ctx)
			: await this.settingsRepository.findByKeyInContext(AGENTS_ENABLED_KEY, ctx);
		if (setting) return setting.value === 'true';

		return true;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const removed = await this.txRunner.run({}, async (ctx) => {
			await this.settingsRepository.upsertByKey(AGENTS_ENABLED_KEY, String(enabled), true, ctx);
			return enabled ? [] : await this.cancelPendingMessages(ctx);
		});
		for (const threadId of new Set(removed.map((item) => item.threadId))) {
			this.updates.notifyQueueUpdated(threadId);
		}
		try {
			await this.attachments.deleteByIds(
				removed.flatMap((item) =>
					readInboundUserMessage(item.message.content).attachments.map(({ id }) => id),
				),
			);
		} catch (error) {
			this.logger.warn('Failed to delete attachments from canceled pending Agent messages', {
				error,
			});
		}
	}

	private async cancelPendingMessages(ctx: OperationContext): Promise<AgentMessageQueue[]> {
		const removed: AgentMessageQueue[] = [];
		for (const threadId of await this.queue.findThreadIds(ctx)) {
			if (!(await this.threads.lockById(threadId, ctx))) continue;
			for (const item of await this.queue.listPending(threadId, ctx)) {
				if (item.steeringExecutionId !== null) continue;
				if (!(await this.queue.removePending(threadId, item.id, ctx))) continue;
				await this.messages.clearPendingInput(item.messageId, ctx);
				removed.push(item);
			}
		}
		return removed;
	}

	async assertEnabled(ctx: OperationContext = {}): Promise<void> {
		if (!(await this.getEnabled(ctx))) {
			throw new ForbiddenError(
				'Agents are disabled. Ask an instance admin to enable them in Settings > Agents.',
			);
		}
	}
}
