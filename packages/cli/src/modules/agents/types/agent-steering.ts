import type { AgentDbMessage, StreamChunk } from '@n8n/agents';
import type { AgentSseEvent, ToolCallSimulation } from '@n8n/api-types';

export type SteeredMessageEvent = Extract<AgentSseEvent, { type: 'message-steered' }>;

/** A tool result in a test run carries how the call ran. */
export type SimulatedToolResultChunk = Extract<StreamChunk, { type: 'tool-result' }> & {
	simulation?: ToolCallSimulation;
};

export type AgentExecutionStreamChunk =
	| Exclude<StreamChunk, { type: 'tool-result' }>
	| SimulatedToolResultChunk
	| SteeredMessageEvent;

export interface SteeringConsumption {
	messages: AgentDbMessage[];
	events: SteeredMessageEvent[];
	stopped: boolean;
}
