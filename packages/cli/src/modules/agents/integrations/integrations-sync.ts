import {
	isAgentScheduleIntegration,
	type AgentCredentialIntegration,
	type AgentIntegration,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { Agent } from '../entities/agent.entity';

function scheduleConfigsEqual(
	a: AgentIntegration | undefined,
	b: AgentIntegration | undefined,
): boolean {
	if (!a && !b) return true;
	if (!a || !b) return false;
	if (!isAgentScheduleIntegration(a) || !isAgentScheduleIntegration(b)) return false;
	return (
		a.active === b.active &&
		a.cronExpression === b.cronExpression &&
		a.wakeUpPrompt === b.wakeUpPrompt
	);
}

/**
 * Reconcile runtime state (cron job, chat platform connections) after the
 * builder writes a new integrations array. Schedule changes call into
 * AgentScheduleService.applyConfig; chat changes are diffed and routed to
 * connect/disconnect on ChatIntegrationService.
 *
 * Failures are logged but never thrown — config writes during a builder turn
 * must not be rolled back if e.g. the Slack API is briefly unavailable.
 *
 * Lazy `Container.get(...)` avoids a circular DI dependency:
 * AgentScheduleService and ChatIntegrationService both depend on AgentsService,
 * which calls into this helper.
 */
export async function syncAgentIntegrations(
	agent: Agent,
	previous: AgentIntegration[],
	next: AgentIntegration[],
	logger: Logger,
): Promise<void> {
	const prevSchedule = previous.find(isAgentScheduleIntegration);
	const nextSchedule = next.find(isAgentScheduleIntegration);
	if (!scheduleConfigsEqual(prevSchedule, nextSchedule)) {
		try {
			const { AgentScheduleService } = await import('./agent-schedule.service');
			await Container.get(AgentScheduleService).applyConfig(agent);
		} catch (error) {
			logger.warn('Failed to apply schedule integration during sync', {
				agentId: agent.id,
				error,
			});
		}
	}

	const prevChat = previous.filter(
		(i): i is AgentCredentialIntegration => !isAgentScheduleIntegration(i),
	);
	const nextChat = next.filter(
		(i): i is AgentCredentialIntegration => !isAgentScheduleIntegration(i),
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
