import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	type BuiltTool,
	type FetchFn,
	type ToolCallInterceptor,
} from '@n8n/agents';
import type { ToolCallReason, ToolCallSimulation, ToolTestKind } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { EvalLlmMockHandler, EvalMockHttpResponse, EvalNodeMockHandler } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { AgentRuntimeInstrumentation } from '../evaluation/agent-evaluation.contracts';
import { nodeSimulationGap } from './non-http-node-types';
import type {
	OutboundRequest,
	SimulatedReply,
	SimulationBackendId,
	SimulationWorld,
} from './tool-simulation.contracts';

/**
 * Built-in tools that only touch n8n or the agent's own sandbox files. They
 * run normally in a test run and carry no route. `call_tool` is not here: the
 * runtime hands the dispatched tool to the interceptor, and an undispatched
 * `call_tool` must stay blocked.
 */
const LOCAL_TOOL_NAMES: ReadonlySet<string> = new Set([
	DELEGATE_SUB_AGENT_TOOL_NAME,
	'load_skill',
	'find_tools',
	'get_environment',
	'read_binary_data',
	'import_files',
	'find_file',
	'search_text',
	'read_file',
	'write_todos',
	'mark_session_failed',
	'create_plan',
	'read_plan',
	'update_plan',
	'close_plan',
	'workspace_read_file',
	'workspace_read_files',
	'workspace_read_tool_result',
	'workspace_write_file',
	'workspace_str_replace_file',
	'workspace_edit_files',
	'workspace_append_file',
	'workspace_list_files',
	'workspace_file_stat',
	'workspace_mkdir',
	'workspace_delete_file',
	'workspace_copy_file',
	'workspace_move_file',
	'workspace_rmdir',
	'workspace_list_processes',
	'workspace_kill_process',
]);

const WEB_SEARCH_TOOL_NAME = 'web_search';

/** The error the model receives when a test run blocks a tool call. */
export class SimulationBlockedError extends Error {
	constructor(readonly simulation: ToolCallSimulation) {
		super(
			`This tool did not run because this is a test run, and nothing was sent. ${simulation.detail ?? ''}`.trim(),
		);
		this.name = 'SimulationBlockedError';
	}
}

type ReplySource = 'world_state' | 'made_up';

interface ActiveToolCall {
	toolCallId: string;
	toolName: string;
	sources: ReplySource[];
	blocked?: ToolCallSimulation;
}

type ToolClassification =
	| { type: 'local' }
	| { type: 'simulated'; key: string; kind: ToolTestKind; nodeType?: string; parameters?: unknown };

export interface SimulationSessionInit {
	testChatId: string;
	/** Absent when no backend is registered or the world failed to open. */
	world?: SimulationWorld;
	/** Why the world is absent. Shown on each blocked call. */
	unavailableDetail?: string;
	/** Workflow tools are blocked in queue mode: the tool hooks do not reach queue workers. */
	queueMode?: boolean;
}

/**
 * One test chat's link to its simulated world. It guards every tool call of
 * the chat's runtime and records the route of each call by its tool call ID.
 *
 * It fails closed: a tool it does not know is blocked, and a request that the
 * world does not serve throws instead of reaching the network.
 */
export class SimulationSession {
	readonly testChatId: string;

	readonly worldId: string | undefined;

	readonly backend: SimulationBackendId | undefined;

	private readonly world: SimulationWorld | undefined;

	private readonly unavailableDetail: string;

	private readonly queueMode: boolean;

	/**
	 * A runtime keeps the hooks of the session it was built for. A session that
	 * replaces an expired one for the same chat must not reuse that runtime.
	 */
	private readonly instanceId = randomUUID();

	private readonly activeCalls = new AsyncLocalStorage<ActiveToolCall>();

	private readonly decisions = new Map<string, ToolCallSimulation>();

	constructor(init: SimulationSessionInit) {
		this.testChatId = init.testChatId;
		this.world = init.world;
		this.worldId = init.world?.worldId;
		this.backend = init.world?.backend;
		this.unavailableDetail = init.unavailableDetail ?? 'The simulator is not available.';
		this.queueMode = init.queueMode ?? false;
	}

	/** Separates this chat's runtime from every other runtime in the cache. */
	get runtimeCacheKey(): string {
		return `simulation:${this.testChatId}:${this.instanceId}`;
	}

	/** Remove and return the route of a settled tool call. */
	takeDecision(toolCallId: string): ToolCallSimulation | undefined {
		const decision = this.decisions.get(toolCallId);
		this.decisions.delete(toolCallId);
		return decision;
	}

	readonly interceptor: ToolCallInterceptor = async ({ tool, toolCallId }, run) => {
		const classification = classifyTool(tool);
		if (classification.type === 'local') return await run();

		const preflight = this.preflight(classification);
		if (preflight) {
			this.decisions.set(toolCallId, preflight);
			throw new SimulationBlockedError(preflight);
		}

		const active: ActiveToolCall = { toolCallId, toolName: tool.name, sources: [] };
		let output: unknown;
		try {
			output = await this.activeCalls.run(active, run);
		} catch (error) {
			if (active.blocked) {
				this.decisions.set(toolCallId, active.blocked);
				throw new SimulationBlockedError(active.blocked);
			}
			const decision = foldSources(active.sources);
			if (decision) this.decisions.set(toolCallId, decision);
			throw error;
		}
		// A node can catch a failed request and return an error item instead.
		if (active.blocked) {
			this.decisions.set(toolCallId, active.blocked);
			throw new SimulationBlockedError(active.blocked);
		}
		const decision = foldSources(active.sources);
		if (decision) this.decisions.set(toolCallId, decision);
		return output;
	};

	/**
	 * The seams that send a runtime's outbound traffic to the world. The
	 * runtime must be built for this session only, never from the shared cache.
	 */
	instrumentation(): AgentRuntimeInstrumentation {
		return {
			toolCallInterceptor: this.interceptor,
			mcpFetch: this.mcpFetch,
			configureToolAdditionalData: (additionalData, context) => {
				additionalData.evalLlmMockHandler = this.createHttpHandler(context.toolName);
				additionalData.evalNodeMockHandler = this.nodeGuard;
			},
		};
	}

	private preflight(
		classification: Extract<ToolClassification, { type: 'simulated' }>,
	): ToolCallSimulation | undefined {
		const gap = this.toolGap(classification);
		if (gap) return blocked('not_simulatable', gap);
		if (!this.world) return blocked('simulator_unavailable', this.unavailableDetail);
		return undefined;
	}

	/** Why no simulator can serve this tool, or `undefined` when one can. */
	private toolGap(
		classification: Extract<ToolClassification, { type: 'simulated' }>,
	): string | undefined {
		switch (classification.kind) {
			case 'node':
				return classification.nodeType
					? nodeSimulationGap(
							classification.nodeType,
							isRecord(classification.parameters) ? classification.parameters : undefined,
						)
					: 'This node tool has no node type.';
			case 'workflow':
				return this.queueMode
					? 'Workflow tools cannot run in a test run in queue mode yet.'
					: undefined;
			case 'mcp':
				return 'MCP servers cannot run in a test run yet.';
			case 'web_search':
				return 'Web search cannot run in a test run yet.';
			default:
				// Custom code, chat integration actions, memory, vector stores, shell
				// commands and anything new: unknown traffic, so blocked.
				return 'This kind of tool cannot run in a test run yet.';
		}
	}

	private async ask(request: OutboundRequest, extra: { nodeType?: string }) {
		const active = this.activeCalls.getStore();
		let reply: SimulatedReply;
		if (!this.world) {
			reply = { outcome: 'unavailable', detail: this.unavailableDetail };
		} else {
			try {
				reply = await this.world.handleRequest(request, {
					toolCallId: active?.toolCallId,
					toolName: active?.toolName ?? 'unknown',
					...extra,
				});
			} catch (error) {
				reply = {
					outcome: 'unavailable',
					detail: error instanceof Error ? error.message : String(error),
				};
			}
		}
		if (reply.outcome === 'served') {
			active?.sources.push(reply.source);
			return reply;
		}
		const decision =
			reply.outcome === 'unsupported'
				? blocked(
						'unsupported_by_simulator',
						reply.detail ?? 'The simulator does not support this call yet.',
					)
				: blocked('simulator_unavailable', reply.detail ?? this.unavailableDetail);
		if (active && !active.blocked) active.blocked = decision;
		throw new SimulationBlockedError(decision);
	}

	/** Never returns `undefined`: that would send the request to the real service. */
	private createHttpHandler(toolName: string): EvalLlmMockHandler {
		return async (options: IHttpRequestOptions, node): Promise<EvalMockHttpResponse> => {
			const reply = await this.ask(
				{
					protocol: 'http',
					method: options.method ?? 'GET',
					url: requestUrl(options),
					headers: stripAuthHeaders(options.headers),
					body: options.body,
				},
				{ nodeType: node.type },
			);
			if (reply.outcome !== 'served') throw new Error(`Unexpected reply for ${toolName}`);
			return { body: reply.body, headers: reply.headers ?? {}, statusCode: reply.status };
		};
	}

	/** Blocks nodes whose traffic the HTTP seam cannot see, for example inside a workflow tool. */
	private readonly nodeGuard: EvalNodeMockHandler = async (context) => {
		const node = context.getNode();
		const gap = nodeSimulationGap(node.type, node.parameters);
		if (!gap) return undefined;
		const decision = blocked('not_simulatable', `${node.name}: ${gap}`);
		const active = this.activeCalls.getStore();
		if (active && !active.blocked) active.blocked = decision;
		throw new SimulationBlockedError(decision);
	};

	/**
	 * MCP servers are not simulated yet. Refuse every connection, so that no
	 * MCP request reaches a real server. Their tools are blocked before they run.
	 */
	private readonly mcpFetch: FetchFn = async () => {
		throw new SimulationBlockedError(
			blocked('not_simulatable', 'MCP servers cannot run in a test run yet.'),
		);
	};
}

function classifyTool(tool: BuiltTool): ToolClassification {
	if (tool.mcpTool) {
		return { type: 'simulated', key: tool.mcpServerName ?? tool.name, kind: 'mcp' };
	}
	const metadata = tool.metadata;
	if (metadata?.kind === 'node') {
		return {
			type: 'simulated',
			key: tool.name,
			kind: 'node',
			nodeType: typeof metadata.nodeType === 'string' ? metadata.nodeType : undefined,
			parameters: metadata.nodeParameters,
		};
	}
	if (metadata?.kind === 'workflow') return { type: 'simulated', key: tool.name, kind: 'workflow' };
	if (tool.name === WEB_SEARCH_TOOL_NAME) {
		return { type: 'simulated', key: WEB_SEARCH_TOOL_NAME, kind: 'web_search' };
	}
	if (LOCAL_TOOL_NAMES.has(tool.name)) return { type: 'local' };
	// Custom code, chat integration actions, memory, vector stores, shell
	// commands and anything new: unknown traffic, so blocked.
	return { type: 'simulated', key: `unknown:${tool.name}`, kind: 'other' };
}

/** Folds the replies of one tool call into its route. No replies: no route. */
export function foldSources(sources: ReplySource[]): ToolCallSimulation | undefined {
	if (sources.length === 0) return undefined;
	if (sources.includes('made_up')) return { route: 'simulated_made_up', reason: 'invented_by_llm' };
	return { route: 'simulated', reason: 'served_from_world' };
}

function blocked(reason: ToolCallReason, detail?: string): ToolCallSimulation {
	return { route: 'blocked', reason, ...(detail ? { detail } : {}) };
}

function requestUrl(options: IHttpRequestOptions): string {
	if (!options.baseURL) return options.url;
	try {
		return new URL(options.url, options.baseURL).toString();
	} catch {
		return `${options.baseURL}${options.url}`;
	}
}

const AUTH_HEADER = /^(authorization|proxy-authorization|cookie|x-api-key|api-key)$/i;

function stripAuthHeaders(headers: IHttpRequestOptions['headers']): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers ?? {})) {
		if (AUTH_HEADER.test(name)) continue;
		if (typeof value === 'string') result[name] = value;
		else if (typeof value === 'number' || typeof value === 'boolean') result[name] = `${value}`;
		else if (Array.isArray(value))
			result[name] = value.filter((part) => typeof part === 'string').join(', ');
	}
	return result;
}
