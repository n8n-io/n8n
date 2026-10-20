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

/** A request from the Checks tab to let the Assistant fix the agent. */
export interface AgentEvalFixRequest {
	projectId: string;
	agentId: string;
	/** The draft for the Assistant's composer. The person sends it. */
	prompt: string;
	/** The dataset to run again once the Assistant has changed the agent. */
	datasetId?: string;
	/** How many checks that run holds, for the message that starts it. */
	checkCount?: number;
}

export interface AgentsEventBusEvents {
	/** Fired when an agent's config, skills, name or metadata are written */
	agentUpdated: AgentUpdatedEvent | undefined;
	/** The global credential modal cannot inject the mounted Agent builder. */
	credentialHelpRequested: AgentCredentialHelpRequest;
	/** The Checks tab asks the builder to hand failing checks to the Assistant. */
	evalFixRequested: AgentEvalFixRequest;
}

export const agentsEventBus = createEventBus<AgentsEventBusEvents>();
