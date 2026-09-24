import type { AgentDbMessage } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';

export type SteeredMessageEvent = Extract<AgentSseEvent, { type: 'message-steered' }>;

export interface SteeringConsumption {
	messages: AgentDbMessage[];
	events: SteeredMessageEvent[];
	stopped: boolean;
}

declare module '@n8n/agents' {
	interface CustomAgentMessages {
		steeredMessage: SteeredMessageEvent;
	}
}
