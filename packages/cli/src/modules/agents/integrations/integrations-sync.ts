import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { Agent } from '../entities/agent.entity';
import {
	type AgentCredentialIntegrationConfig,
	type AgentIntegrationConfig,
	isAgentScheduleIntegration,
} from '@n8n/api-types';

/**
 * Reconcile runtime state (cron job, chat platform connections) after the
 * builder writes a new integrations array. Chat changes are diffed and routed
 * to connect/disconnect on ChatIntegrationService. Legacy schedule entries are
 * tolerated in persisted JSON but no longer create runtime work.
 *
 * Failures are logged but never thrown — config writes during a builder turn
 * must not be rolled back if e.g. the Slack API is briefly unavailable.
 *
 * Lazy `Container.get(...)` avoids a circular DI dependency:
 * ChatIntegrationService depends on AgentsService, which calls into this helper.
 */
export async function syncAgentIntegrations(
	agent: Agent,
	previous: AgentIntegrationConfig[],
	next: AgentIntegrationConfig[],
	logger: Logger,
): Promise<void> {
	const prevChat = previous.filter(
		(i): i is AgentCredentialIntegrationConfig => !isAgentScheduleIntegration(i),
	);
	const nextChat = next.filter(
		(i): i is AgentCredentialIntegrationConfig => !isAgentScheduleIntegration(i),
	);
	try {
		// eslint-disable-next-line import-x/no-cycle
		const { ChatIntegrationService } = await import('./chat-integration.service');
		await Container.get(ChatIntegrationService).syncToConfig(agent, prevChat, nextChat);
	} catch (error) {
		logger.warn('Failed to sync chat integrations', {
			agentId: agent.id,
			error,
		});
	}
}
