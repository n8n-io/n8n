import { createEventBus } from '@n8n/utils/event-bus';

export interface AgentsEventBusEvents {
	/** Fired when an agent's name or metadata is updated */
	agentUpdated: never;
}

export const agentsEventBus = createEventBus<AgentsEventBusEvents>();
