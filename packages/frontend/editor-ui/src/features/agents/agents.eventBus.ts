import { createEventBus } from '@n8n/utils/event-bus';

export interface AgentUpdatedEvent {
	/** The written agent, when known — lets caches invalidate narrowly. */
	agentId?: string;
	/** Identifies the emitting surface, so a surface can ignore its own writes. */
	source?: string;
}

export interface AgentsEventBusEvents {
	/** Fired when an agent's config, skills, name or metadata are written */
	agentUpdated: AgentUpdatedEvent | undefined;
}

export const agentsEventBus = createEventBus<AgentsEventBusEvents>();
