import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	type BuiltTool,
	type FetchFn,
	type ToolCallInterceptor,
} from '@n8n/agents';
import {
	toolCallEvidenceSchema,
	type ToolCallEvidence,
	type ToolCallReason,
	type ToolCallSimulation,
	type ToolTestCapability,
	type ToolTestKind,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import type { EvalLlmMockHandler, EvalMockHttpResponse, EvalNodeMockHandler } from 'n8n-core';
import type { IHttpRequestOptions } from 'n8n-workflow';

import type { AgentRuntimeInstrumentation } from '../evaluation/agent-evaluation.contracts';
import { InstrumentedRunUnsupportedError } from '../tools/instrumented-run-guard';
import { nodeSimulationGap } from './non-http-node-types';
import { redactOutboundRequest } from './outbound-redaction';
import { TestRunCredentialsHelper } from './test-run-credentials-helper';
import type {
	OutboundRequest,
	SimulatedReply,
	SimulationBackendId,
	SimulationWorld,
	WebSearchArgs,
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

/** Decisions nobody takes (an aborted call, for example) are dropped oldest first past this. */
const MAX_PENDING_DECISIONS = 500;

/** Statuses that `new Response()` rejects with a body. */
const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([204, 205, 304]);

/**
 * Kinds that never reach a seam the simulator answers: custom code, integration SDKs and
 * anything unknown. The session blocks them itself and never trusts a `simulated` list entry.
 */
const UNSIMULATABLE_KINDS: Partial<Record<ToolTestKind, string>> = {
	custom: 'Custom code tools can reach any service, so they cannot run in a test run.',
	integration: 'This integration calls its service directly, so the simulator cannot answer it.',
	other: 'This kind of tool cannot run in a test run yet.',
};

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
	/** Only known values, so nothing large a backend sends is kept until the call ends. */
	evidence: Set<ToolCallEvidence>;
	blocked?: ToolCallSimulation;
}

type ToolClassification =
	| { type: 'local' }
	| {
			type: 'simulated';
			/** The tool's entry in the capability list: its name, or its server's name for MCP. */
			key: string;
			kind: ToolTestKind;
			nodeType?: string;
			parameters?: unknown;
	  };

export interface SimulationSessionInit {
	testChatId: string;
	/** Absent when no backend is set up or the world failed to open: every simulated call is blocked. */
	world?: SimulationWorld;
	unavailableDetail?: string;
	/** Keyed by tool name (MCP: server name). */
	capabilities: ToolTestCapability[];
	/** Stores the test chat marker. Runs before each turn starts. */
	markTestChat?: () => Promise<void>;
}

/** Guards every tool call of one test chat and records each call's route. Fails closed. */
export class SimulationSession {
	readonly testChatId: string;

	readonly worldId: string | undefined;

	readonly backend: SimulationBackendId | undefined;

	private readonly world: SimulationWorld | undefined;

	private readonly unavailableDetail: string;

	private capabilities: Map<string, ToolTestCapability>;

	private readonly markTestChatFn: SimulationSessionInit['markTestChat'];

	// A cached runtime keeps this session's hooks, so a replacement session needs its own runtime.
	private readonly instanceId = randomUUID();

	private readonly activeCalls = new AsyncLocalStorage<ActiveToolCall>();

	private readonly decisions = new Map<string, ToolCallSimulation>();

	constructor(init: SimulationSessionInit) {
		this.testChatId = init.testChatId;
		this.world = init.world;
		this.worldId = init.world?.worldId;
		this.backend = init.world?.backend;
		this.unavailableDetail = init.unavailableDetail ?? 'The simulator is not available.';
		this.capabilities = new Map(init.capabilities.map((tool) => [tool.toolName, tool]));
		this.markTestChatFn = init.markTestChat;
	}

	/** Store that this chat is a test chat before the turn runs, so a later turn never runs live. */
	async markTestChat(): Promise<void> {
		await this.markTestChatFn?.();
	}

	get runtimeCacheKey(): string {
		return `simulation:${this.testChatId}:${this.instanceId}`;
	}

	/** For example after the agent's tools changed mid-chat. */
	updateCapabilities(capabilities: ToolTestCapability[]): void {
		this.capabilities = new Map(capabilities.map((tool) => [tool.toolName, tool]));
	}

	private recordDecision(toolCallId: string, decision: ToolCallSimulation): void {
		this.decisions.delete(toolCallId);
		this.decisions.set(toolCallId, decision);
		if (this.decisions.size > MAX_PENDING_DECISIONS) {
			const oldest = this.decisions.keys().next().value;
			if (oldest !== undefined) this.decisions.delete(oldest);
		}
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
			this.recordDecision(toolCallId, preflight);
			throw new SimulationBlockedError(preflight);
		}

		const active: ActiveToolCall = {
			toolCallId,
			toolName: tool.name,
			sources: [],
			evidence: new Set(),
		};
		let output: unknown;
		try {
			output = await this.activeCalls.run(active, run);
		} catch (error) {
			// The workflow would have left this process, or paused; it was refused or stopped.
			if (!active.blocked && error instanceof InstrumentedRunUnsupportedError) {
				active.blocked = blocked('not_simulatable', error.message);
			}
			if (active.blocked) {
				this.recordDecision(toolCallId, active.blocked);
				throw new SimulationBlockedError(active.blocked);
			}
			const decision = foldSources(active.sources, active.evidence);
			if (decision) this.recordDecision(toolCallId, decision);
			throw error;
		}
		// A node can catch a failed request and return an error item instead.
		if (active.blocked) {
			this.recordDecision(toolCallId, active.blocked);
			throw new SimulationBlockedError(active.blocked);
		}
		const decision = foldSources(active.sources, active.evidence);
		if (decision) this.recordDecision(toolCallId, decision);
		return output;
	};

	instrumentation(): AgentRuntimeInstrumentation {
		return {
			toolCallInterceptor: this.interceptor,
			mcpFetch: (serverName) => this.mcpFetch(serverName),
			// Provider tools (native web search included) would run for real where no seam
			// sees them. The fallback search tool runs through the interceptor instead.
			webSearch: this.webSearch,
			disableProviderTools: true,
			configureToolAdditionalData: (additionalData, context) => {
				additionalData.credentialsHelper = new TestRunCredentialsHelper(
					additionalData.credentialsHelper,
				);
				additionalData.evalLlmMockHandler = this.createHttpHandler(context.toolName);
				additionalData.evalNodeMockHandler = this.nodeGuard;
			},
		};
	}

	private preflight(
		classification: Extract<ToolClassification, { type: 'simulated' }>,
	): ToolCallSimulation | undefined {
		if (classification.kind === 'node') {
			const gap = classification.nodeType
				? nodeSimulationGap(
						classification.nodeType,
						isRecord(classification.parameters) ? classification.parameters : undefined,
					)
				: 'This node tool has no node type.';
			if (gap) return blocked('not_simulatable', gap);
		}
		const capability = this.capabilities.get(classification.key);
		// A stale or same-name list entry of another kind cannot allow a tool.
		if (!capability || capability.kind !== classification.kind) {
			return blocked('not_simulatable', 'This kind of tool cannot run in a test run yet.');
		}
		if (capability.testability === 'blocked') {
			return blocked(capability.reason, capability.detail);
		}
		const unsimulatable = UNSIMULATABLE_KINDS[classification.kind];
		if (unsimulatable) return blocked('not_simulatable', unsimulatable);
		if (!this.world) return blocked('simulator_unavailable', this.unavailableDetail);
		return undefined;
	}

	private async ask(request: OutboundRequest, nodeType?: string, signal?: AbortSignal) {
		const active = this.activeCalls.getStore();
		let reply: SimulatedReply;
		if (!this.world) {
			reply = { outcome: 'unavailable', detail: this.unavailableDetail };
		} else {
			try {
				reply = validReply(
					await this.world.handleRequest(request, {
						toolCallId: active?.toolCallId,
						toolName: active?.toolName ?? 'unknown',
						...(nodeType ? { nodeType } : {}),
						...(signal ? { signal } : {}),
					}),
				);
			} catch (error) {
				reply = {
					outcome: 'unavailable',
					detail: error instanceof Error ? error.message : String(error),
				};
			}
		}
		if (reply.outcome === 'served') {
			active?.sources.push(reply.source);
			if (Array.isArray(reply.evidence)) {
				// A valid list holds each value at most once, so a longer one is cut before parsing.
				const items = reply.evidence.slice(0, toolCallEvidenceSchema.options.length);
				for (const item of items) {
					if (isToolCallEvidence(item)) active?.evidence.add(item);
				}
			} else if (reply.evidence !== undefined) {
				Container.get(Logger).warn('[SafeTesting] The simulator sent evidence that is not a list', {
					toolName: active?.toolName,
				});
			}
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
			const request = redactOutboundRequest({
				protocol: 'http',
				method: options.method ?? 'GET',
				url: requestUrl(options),
				headers: stringHeaders(options.headers),
				body: options.body,
			});
			const signal = options.abortSignal instanceof AbortSignal ? options.abortSignal : undefined;
			const reply = await this.ask(request, node.type, signal);
			if (reply.outcome !== 'served') throw new UnexpectedError(`Unexpected reply for ${toolName}`);
			// `null`, not `undefined`: core returns only the body, and an undefined body sends the real request.
			return {
				body: NULL_BODY_STATUSES.has(reply.status) ? null : reply.body,
				headers: reply.headers ?? {},
				statusCode: reply.status,
			};
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

	/** One per MCP server: the simulator knows a server by its configured name, never by its URL. */
	private mcpFetch(server: string): FetchFn {
		return async (input, init) => {
			const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
			const rawBody =
				init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
			const body = typeof rawBody === 'string' ? parseJson(rawBody) : rawBody;
			const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
			// Stateful MCP needs headers such as `mcp-session-id`. Redaction removes auth headers.
			const headers = Object.fromEntries(
				new Headers({
					...Object.fromEntries(input instanceof Request ? input.headers : []),
					...Object.fromEntries(new Headers(init?.headers)),
				}),
			);
			const reply = await this.ask(
				redactOutboundRequest({ protocol: 'mcp', server, method, headers, body }),
				undefined,
				signal ?? undefined,
			);
			if (reply.outcome !== 'served') throw new UnexpectedError('Unexpected MCP reply');
			const payload = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
			return new Response(NULL_BODY_STATUSES.has(reply.status) ? null : payload, {
				status: reply.status,
				headers: { 'content-type': 'application/json', ...(reply.headers ?? {}) },
			});
		};
	}

	private readonly webSearch = async (args: WebSearchArgs, options?: { signal?: AbortSignal }) => {
		const reply = await this.ask(
			redactOutboundRequest({ protocol: 'web_search', args }),
			undefined,
			options?.signal,
		);
		return reply.body;
	};
}

function classifyTool(tool: BuiltTool): ToolClassification {
	if (tool.mcpTool) return { type: 'simulated', key: tool.mcpServerName ?? tool.name, kind: 'mcp' };
	const metadata = tool.metadata;
	const simulated = (kind: ToolTestKind) => ({ type: 'simulated' as const, key: tool.name, kind });
	if (metadata?.kind === 'node') {
		return {
			...simulated('node'),
			nodeType: typeof metadata.nodeType === 'string' ? metadata.nodeType : undefined,
			parameters: metadata.nodeParameters,
		};
	}
	if (metadata?.kind === 'workflow') return simulated('workflow');
	if (metadata?.kind === 'integration') return simulated('integration');
	if (metadata?.customTool === true) return simulated('custom');
	if (tool.name === WEB_SEARCH_TOOL_NAME) return simulated('web_search');
	if (LOCAL_TOOL_NAMES.has(tool.name)) return { type: 'local' };
	// Memory, shell commands and anything new: blocked.
	return { type: 'simulated', key: `unknown:${tool.name}`, kind: 'other' };
}

function isToolCallEvidence(value: unknown): value is ToolCallEvidence {
	return toolCallEvidenceSchema.safeParse(value).success;
}

export function foldSources(
	sources: ReplySource[],
	reported: ReadonlySet<unknown> = new Set(),
): ToolCallSimulation | undefined {
	if (sources.length === 0) return undefined;
	// Only known values pass, in the order of the enum, so the list is stable for one tool call.
	const evidence = toolCallEvidenceSchema.options.filter((item) => reported.has(item));
	return {
		...(sources.includes('made_up')
			? { route: 'simulated_made_up', reason: 'invented_by_llm' }
			: { route: 'simulated', reason: 'served_from_world' }),
		...(evidence.length > 0 ? { evidence } : {}),
	};
}

/**
 * A served reply must be one a real service could send. Anything else is a broken backend, so the
 * call is blocked as unavailable, not recorded as served.
 */
function validReply(reply: SimulatedReply): SimulatedReply {
	if (reply.outcome !== 'served') return reply;
	if (!Number.isInteger(reply.status) || reply.status < 200 || reply.status > 599) {
		return {
			outcome: 'unavailable',
			detail: `The simulator sent an invalid status (${String(reply.status)}).`,
		};
	}
	if (reply.source !== 'world_state' && reply.source !== 'made_up') {
		return { outcome: 'unavailable', detail: 'The simulator sent a reply with no source.' };
	}
	return reply;
}

function blocked(reason: ToolCallReason, detail?: string): ToolCallSimulation {
	return { route: 'blocked', reason, ...(detail ? { detail } : {}) };
}

function requestUrl(options: IHttpRequestOptions): string {
	// Join like axios: a relative path is appended to `baseURL`, keeping the base path.
	const joined =
		options.baseURL && !/^[a-z][a-z\d+.-]*:\/\//i.test(options.url)
			? `${options.baseURL.replace(/\/+$/, '')}/${options.url.replace(/^\/+/, '')}`
			: options.url;
	let url: URL;
	try {
		url = new URL(joined);
	} catch {
		return joined;
	}
	// Nodes often pass search terms, filters and ids in `qs` instead of the URL.
	for (const [name, value] of Object.entries(options.qs ?? {})) {
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item === undefined || item === null) continue;
			url.searchParams.append(name, typeof item === 'object' ? JSON.stringify(item) : `${item}`);
		}
	}
	return url.toString();
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

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}
