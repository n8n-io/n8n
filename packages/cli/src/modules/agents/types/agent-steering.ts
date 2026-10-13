import type { AgentDbMessage, StreamChunk } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';

export type SteeredMessageEvent = Extract<AgentSseEvent, { type: 'message-steered' }>;

export type AgentExecutionStreamChunk = StreamChunk | SteeredMessageEvent;

export interface SteeringConsumption {
	messages: AgentDbMessage[];
	events: SteeredMessageEvent[];
	stopped: boolean;
}
