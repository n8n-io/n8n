import type { ToolTestKind } from '@n8n/api-types';

/**
 * Contract between n8n and a simulation backend. Each test chat gets one world; every request a
 * tool would send goes to it instead. A backend never sends anything real. When it cannot answer,
 * n8n blocks the call and never falls back to the real service.
 */
export interface SimulationBackend {
	readonly id: SimulationBackendId;

	/** n8n keeps the world for the chat's later turns. A new test chat gets a new world. */
	openWorld(input: OpenWorldInput): Promise<SimulationWorld>;
}

export type SimulationBackendId = 'llm-mock' | 'shared-simulation-layer';

export interface OpenWorldInput {
	testChatId: string;
	agent: SimulatedAgent;
	/** Can seed the world. */
	firstMessage: string;
}

export interface SimulationWorld {
	readonly worldId: string;
	readonly backend: SimulationBackendId;

	handleRequest(request: OutboundRequest, call: ToolCallContext): Promise<SimulatedReply>;
}

export interface OutboundRequest {
	protocol: 'http';
	method: string;
	url: string;
	/** Auth headers are removed. */
	headers?: Record<string, string>;
	body?: unknown;
}

export interface ToolCallContext {
	toolCallId?: string;
	toolName: string;
	/** For example `n8n-nodes-base.slack`. */
	nodeType?: string;
}

export type SimulatedReply =
	| {
			outcome: 'served';
			/** `world_state`: from seeded or earlier state. `made_up`: invented by an LLM. */
			source: 'world_state' | 'made_up';
			status: number;
			headers?: Record<string, string>;
			body: unknown;
	  }
	/** For example a 501. Shown as a simulator gap, not an agent failure. */
	| { outcome: 'unsupported'; detail?: string }
	/** Down, timed out or failed. */
	| { outcome: 'unavailable'; detail?: string };

/** No credentials. */
export interface SimulatedAgent {
	agentId: string;
	projectId: string;
	name: string;
	instructions: string;
	tools: SimulatedTool[];
}

export interface SimulatedTool {
	/** For an MCP server, the server name. */
	toolName: string;
	kind: ToolTestKind;
	description?: string;
	nodeType?: string;
}
