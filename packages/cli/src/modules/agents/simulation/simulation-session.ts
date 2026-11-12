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
import { OutboundRedactor } from './outbound-redaction';
import type {
	OutboundRequest,
	SimulatedReply,
	SimulationBackendId,
	SimulationWorld,
} from './tool-simulation.contracts';

// Built-ins that only touch n8n or the sandbox: they run and get no route. `call_tool` is
// missing on purpose: the interceptor sees the dispatched tool, so a bare `call_tool` stays blocked.
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
	/** Absent when no backend is set up or the world failed to open: every simulated call is blocked. */
	world?: SimulationWorld;
	unavailableDetail?: string;
	/** The tool hooks do not reach queue workers, so workflow tools are blocked. */
	queueMode?: boolean;
}

/** Guards every tool call of one test chat and records each call's route. Fails closed. */
export class SimulationSession {
	readonly testChatId: string;

	readonly worldId: string | undefined;

	readonly backend: SimulationBackendId | undefined;

	private readonly world: SimulationWorld | undefined;

	private readonly unavailableDetail: string;

	private readonly queueMode: boolean;

	// A cached runtime keeps this session's hooks, so a replacement session needs its own runtime.
	private readonly instanceId = randomUUID();

	private readonly activeCalls = new AsyncLocalStorage<ActiveToolCall>();

	private readonly redactor = new OutboundRedactor();

	private readonly decisions = new Map<string, ToolCallSimulation>();

	constructor(init: SimulationSessionInit) {
		this.testChatId = init.testChatId;
		this.world = init.world;
		this.worldId = init.world?.worldId;
		this.backend = init.world?.backend;
		this.unavailableDetail = init.unavailableDetail ?? 'The simulator is not available.';
		this.queueMode = init.queueMode ?? false;
	}

	get runtimeCacheKey(): string {
		return `simulation:${this.testChatId}:${this.instanceId}`;
	}

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

	instrumentation(): AgentRuntimeInstrumentation {
		return {
			toolCallInterceptor: this.interceptor,
			mcpFetch: this.mcpFetch,
			configureToolAdditionalData: (additionalData, context) => {
				additionalData.credentialsHelper = this.redactor.wrap(additionalData.credentialsHelper);
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

	// Never return `undefined`: core would then send the request to the real service.
	private createHttpHandler(toolName: string): EvalLlmMockHandler {
		return async (options: IHttpRequestOptions, node): Promise<EvalMockHttpResponse> => {
			const request = this.redactor.redact({
				protocol: 'http',
				method: options.method ?? 'GET',
				url: requestUrl(options),
				headers: stringHeaders(options.headers),
				body: options.body,
			});
			const reply = await this.ask(request, { nodeType: node.type });
			if (reply.outcome !== 'served') throw new Error(`Unexpected reply for ${toolName}`);
			return { body: reply.body, headers: reply.headers ?? {}, statusCode: reply.status };
		};
	}

	// Blocks nodes the HTTP seam cannot see, also inside workflow tools.
	private readonly nodeGuard: EvalNodeMockHandler = async (context) => {
		const node = context.getNode();
		const gap = nodeSimulationGap(node.type, node.parameters);
		if (!gap) return undefined;
		const decision = blocked('not_simulatable', `${node.name}: ${gap}`);
		const active = this.activeCalls.getStore();
		if (active && !active.blocked) active.blocked = decision;
		throw new SimulationBlockedError(decision);
	};

	// MCP is not simulated yet: refuse every connection so no request reaches a real server.
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
	if (metadata?.customTool === true) return { type: 'simulated', key: tool.name, kind: 'custom' };
	if (tool.name === WEB_SEARCH_TOOL_NAME) {
		return { type: 'simulated', key: WEB_SEARCH_TOOL_NAME, kind: 'web_search' };
	}
	if (LOCAL_TOOL_NAMES.has(tool.name)) return { type: 'local' };
	// Custom code, integration actions, memory, shell commands and anything new: blocked.
	return { type: 'simulated', key: `unknown:${tool.name}`, kind: 'other' };
}

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

function stringHeaders(headers: IHttpRequestOptions['headers']): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers ?? {})) {
		if (typeof value === 'string') result[name] = value;
		else if (typeof value === 'number' || typeof value === 'boolean') result[name] = `${value}`;
		else if (Array.isArray(value))
			result[name] = value.filter((part) => typeof part === 'string').join(', ');
	}
	return result;
}
