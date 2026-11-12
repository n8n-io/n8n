import type { ToolTestCapability, ToolTestKind } from '@n8n/api-types';
import type { JsonObject } from 'n8n-workflow';

/**
 * The contract between n8n and a simulation backend.
 *
 * A test run gives each test chat its own simulated world. The agent's own
 * model call stays real. Every request that a tool would send to an outside
 * service goes to the world instead. The world answers the request, or says
 * that it cannot. n8n turns the answers into one route for each tool call.
 *
 * A backend never sends a request to a real service. When a backend cannot
 * answer, n8n blocks the tool call. It never falls back to the real service.
 */
export interface SimulationBackend {
	readonly id: SimulationBackendId;

	/** Which of the agent's tools this backend can serve. Called before a run. */
	describeTools(agent: SimulatedAgent): Promise<ToolTestCapability[]>;

	/**
	 * Open the world of one test chat. `saved` is what an earlier
	 * `SimulationWorld.save()` returned for the same test chat, so the same
	 * world continues on each turn and after a restart. A new test chat has no
	 * saved state and gets a new world.
	 */
	openWorld(input: OpenWorldInput): Promise<SimulationWorld>;
}

export type SimulationBackendId = 'llm-mock' | 'shared-simulation-layer';

export interface OpenWorldInput {
	testChatId: string;
	agent: SimulatedAgent;
	/** The first message of the test chat. A backend can use it to seed the world. */
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

	/** Answer one request that a tool would have sent. Never send it anywhere real. */
	handleRequest(request: OutboundRequest, call: ToolCallContext): Promise<SimulatedReply>;

	/** The state to store with the test chat, so that `openWorld` can continue this world. */
	save(): SavedSimulationWorld;
}

export interface OutboundRequest {
	/** `http`: a request from a node tool or a workflow tool. */
	protocol: 'http';
	method: string;
	url: string;
	/** Credentials and auth headers are removed. */
	headers?: Record<string, string>;
	body?: unknown;
}

export interface ToolCallContext {
	toolCallId?: string;
	/** The name the model called. */
	toolName: string;
	/** The n8n node type that sent the request, for example `n8n-nodes-base.slack`. */
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
	/** The backend cannot serve this request, for example it returned 501. */
	| { outcome: 'unsupported'; detail?: string }
	/** The backend is down, timed out or failed. */
	| { outcome: 'unavailable'; detail?: string };

/** What a backend knows about the agent. It holds no credentials. */
export interface SimulatedAgent {
	agentId: string;
	projectId: string;
	name: string;
	instructions: string;
	tools: SimulatedTool[];
}

export interface SimulatedTool {
	/** The name the model calls. For an MCP server, the server name. */
	toolName: string;
	kind: ToolTestKind;
	description?: string;
	nodeType?: string;
}
