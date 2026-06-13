import type { Logger } from '@n8n/backend-common';
import { type AgentIntegrationConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';

import type { Agent } from '../entities/agent.entity';

/**
 * Reconcile chat platform connections after the builder writes a new
 * integrations array: changes are diffed and routed to connect/disconnect on
 * ChatIntegrationService.
 *
 * Failures are logged but never thrown — config writes during a builder turn
 * must not be rolled back if e.g. the Slack API is briefly unavailable.
 *
 * Lazy `Container.get(...)` avoids a circular DI dependency: ChatIntegrationService
 * depends on AgentsService, which calls into this helper.
 */
export async function syncAgentIntegrations(
	agent: Agent,
	previous: AgentIntegrationConfig[],
	next: AgentIntegrationConfig[],
	logger: Logger,
): Promise<void> {
	try {
		// eslint-disable-next-line import-x/no-cycle
		const { ChatIntegrationService } = await import('./chat-integration.service');
		await Container.get(ChatIntegrationService).syncToConfig(agent, previous, next);
	} catch (error) {
		logger.warn('Failed to sync chat integrations', {
			agentId: agent.id,
			error,
		});
	}
}
