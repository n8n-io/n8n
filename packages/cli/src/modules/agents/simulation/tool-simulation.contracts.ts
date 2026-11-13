import type { ToolTestCapability, ToolTestKind } from '@n8n/api-types';
import type { JsonObject } from 'n8n-workflow';

/**
 * Contract between n8n and a simulation backend. Each test chat gets one world; every request a
 * tool would send goes to it instead. A backend never sends anything real. When it cannot answer,
 * n8n blocks the call and never falls back to the real service.
 */
export interface SimulationBackend {
	readonly id: SimulationBackendId;

	/** Which of the agent's tools this backend can serve. Called before a run. */
	describeTools(agent: SimulatedAgent): Promise<ToolTestCapability[]>;

	/** `saved` comes from an earlier `SimulationWorld.save()` for this chat; a new chat has none. */
	openWorld(input: OpenWorldInput): Promise<SimulationWorld>;
}

export type SimulationBackendId = 'llm-mock' | 'shared-simulation-layer';

export interface OpenWorldInput {
	testChatId: string;
	agent: SimulatedAgent;
	/** Can seed the world. */
	firstMessage: string;
	saved?: SavedSimulationWorld;
}

/** JSON that n8n stores with the test chat. */
export type SavedSimulationWorld = JsonObject;

/** A simulated world as n8n stores it with the test chat. */
export interface StoredSimulationWorld {
	backend: SimulationBackendId;
	worldId: string;
	state: SavedSimulationWorld;
}

/**
 * What n8n stores on the test chat's thread row. Its presence alone makes every
 * later turn and resume of the chat a test run, also without a world.
 */
export interface StoredTestChat {
	testRun: true;
	world?: StoredSimulationWorld;
}

export interface SimulationWorld {
	readonly worldId: string;
	readonly backend: SimulationBackendId;

	handleRequest(request: OutboundRequest, call: ToolCallContext): Promise<SimulatedReply>;

	/** The state to store with the test chat, so that `openWorld` can continue this world. */
	save(): SavedSimulationWorld;
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
