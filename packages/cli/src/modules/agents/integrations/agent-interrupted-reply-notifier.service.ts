import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { IntegrationMessageContextService } from './integration-message-context.service';
import { AgentExecutionService, type InterruptedExecution } from '../agent-execution.service';

/**
 * Tells a chat platform user when the turn that handles their message is
 * interrupted, for example by a shutdown or by the sweeper after the process
 * that ran it disappeared. Without this, the user waits for a reply that never
 * comes.
 *
 * Posting needs a live connection to the platform in this process. A worker,
 * or a main without the connection (Telegram polling runs on the leader only),
 * skips the notice. The execution row and the editor still show the turn as
 * interrupted.
 */
@Service()
export class AgentInterruptedReplyNotifier {
	constructor(
		private readonly logger: Logger,
		private readonly messageContextService: IntegrationMessageContextService,
		executionService: AgentExecutionService,
	) {
		executionService.onExecutionInterrupted(async (execution) => await this.notify(execution));
	}

	async notify({
		executionId,
		agentId,
		threadId,
		source,
		local,
	}: InterruptedExecution): Promise<void> {
		// A local turn fails on its own reply path, which posts the same notice.
		if (local || !source || source === N8N_CHAT_INTEGRATION_TYPE) return;
		try {
			const context = await this.messageContextService.getLatest(threadId);
			const target = context?.replyTarget ?? context?.target;
			const [platform, credentialId] = context?.integrationConnectionId.split(':') ?? [];
			if (
				context?.platform !== source ||
				platform !== source ||
				!credentialId ||
				!target?.threadId
			) {
				return;
			}

			// Lazy import: the chat SDK stack is heavy and imports this module's services.
			const { ChatIntegrationService } = await import('./chat-integration.service.js');
			const bridge = Container.get(ChatIntegrationService).getBridge(agentId, source, credentialId);
			if (!bridge) {
				this.logger.debug('No chat connection in this process for an interrupted agent turn', {
					executionId,
					agentId,
					source,
				});
				return;
			}
			await bridge.deliverInterruptedNotice(target.threadId);
		} catch (error) {
			this.logger.warn('Failed to tell the chat platform that an agent turn was interrupted', {
				executionId,
				agentId,
				source,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
