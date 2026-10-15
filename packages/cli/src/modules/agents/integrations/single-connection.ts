import { isDraftIntegration, type AgentIntegrationConfig } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import type { ChatIntegrationRegistry } from './agent-chat-integration';

/** A count that does not grow passes, so an agent that already holds two can still be saved. */
export function assertSingleConnections(
	registry: ChatIntegrationRegistry,
	previous: AgentIntegrationConfig[],
	next: AgentIntegrationConfig[],
): void {
	for (const type of new Set(next.map((entry) => entry.type))) {
		const integration = registry.get(type);
		if (!integration?.singleConnectionPerAgent) continue;
		const after = countConnections(next, type);
		if (after > 1 && after > countConnections(previous, type)) {
			throw new BadRequestError(
				`This agent is already connected to ${integration.displayLabel}. Remove that connection before you connect another one.`,
			);
		}
	}
}

function countConnections(entries: AgentIntegrationConfig[], type: string) {
	return entries.filter((entry) => entry.type === type && !isDraftIntegration(entry)).length;
}
