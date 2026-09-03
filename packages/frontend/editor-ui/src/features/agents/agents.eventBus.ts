import { createEventBus } from '@n8n/utils/event-bus';
import type { AgentJsonConfig } from '@n8n/api-types';

export interface AgentUpdatedEvent {
	/** The written agent, when known — lets caches invalidate narrowly. */
	agentId?: string;
	/** Identifies the emitting surface, so a surface can ignore its own writes. */
	source?: string;
}

export interface AgentTemplateAppliedEvent {
	agentId: string;
	config: Partial<AgentJsonConfig>;
	connectedTriggers?: string[];
}

export interface AgentsEventBusEvents {
	/** Fired when an agent's config, skills, name or metadata are written */
	agentUpdated: AgentUpdatedEvent | undefined;
	/** Fired when a starter template is applied to a fresh agent. */
	applyTemplate: AgentTemplateAppliedEvent;
}

export const agentsEventBus = createEventBus<AgentsEventBusEvents>();
