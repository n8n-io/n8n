import { createEventBus } from '@n8n/utils/event-bus';
import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';

export interface AgentCredentialHelpRequest {
	projectId: string;
	agentId: string;
	credential: InstanceAiCredentialContext;
	handle?: () => Promise<boolean>;
}

export interface AgentUpdatedEvent {
	/** The written agent, when known — lets caches invalidate narrowly. */
	agentId?: string;
	/** Identifies the emitting surface, so a surface can ignore its own writes. */
	source?: string;
}

export interface AgentsEventBusEvents {
	/** Fired when an agent's config, skills, name or metadata are written */
	agentUpdated: AgentUpdatedEvent | undefined;
	/** The global credential modal cannot inject the mounted Agent builder. */
	credentialHelpRequested: AgentCredentialHelpRequest;
}

export const agentsEventBus = createEventBus<AgentsEventBusEvents>();
