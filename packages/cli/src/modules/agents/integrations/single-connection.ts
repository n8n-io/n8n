import { isDraftIntegration, type AgentIntegrationConfig } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import type { ChatIntegrationRegistry } from './agent-chat-integration';

export function assertSingleConnections(
	registry: ChatIntegrationRegistry,
	next: AgentIntegrationConfig[],
): void {
	for (const type of new Set(next.map((entry) => entry.type))) {
		const integration = registry.get(type);
		if (!integration?.singleConnectionPerAgent) continue;
		if (countConnections(next, type) > 1) {
			throw new BadRequestError(
				`An agent can have only one ${integration.displayLabel} connection. Remove the other one, then try again.`,
			);
		}
	}
}

function countConnections(entries: AgentIntegrationConfig[], type: string) {
	return entries.filter((entry) => entry.type === type && !isDraftIntegration(entry)).length;
}
