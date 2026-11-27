import {
	sanitizeToolName as sanitizeMcpToolName,
	raceWithAbort,
	throwIfAborted,
	type Agent as RuntimeAgent,
	type AgentMessage,
	type GenerateResult,
	type MemoryTaskEvent,
	type SideCallUsageReport,
} from '@n8n/agents';
import type {
	AgentJsonConfig,
	InstanceAiEvalAgentExecutionRequest,
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalAgentThreadTurn,
	InstanceAiEvalAgentScenarioSeed,
	InstanceAiEvalAgentSkippedFeature,
	InstanceAiEvalAgentToolCallRecord,
	InstanceAiEvalInterceptedRequest,
	InstanceAiEvalAgentMemoryTask,
	InstanceAiEvalAgentRunOptions,
	InstanceAiEvalAgentSideCallUsage,
} from '@n8n/api-types';
import { TOOL_CATALOG_CALL_TOOL_NAME } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';

import type { AgentEvaluationPreparation } from '@/modules/agents/evaluation/agent-evaluation.contracts';
import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { EvalAgentMemoryReader } from './agent-eval-memory-reader';
import { EvalAgentThreadStore, planThreadTurn, type EvalAgentThread } from './agent-eval-threads';
import { createAgentModelTurnRecorder } from './agent-model-turn-recorder';
import { generateAgentScenarioSeed } from './agent-scenario-seed';
import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { snapshotLedgerBody } from './ledger-snapshot';
import {
	createMcpMockFetch,
	type McpMockCanonicalTool,
	type McpMockToolCall,
} from './mcp-mock-fetch';
import { createLlmMockHandler } from './mock-handler';
import { redactSecretValuePatterns, truncateForLlm } from './request-sanitizer';
import { createWebSearchMock } from './web-search-mock';

/** A deferred tool runs through the tool catalog's `call_tool`; resolve the real tool it ran. */
function effectiveToolName(toolName: string, input: unknown): string {
	if (toolName !== TOOL_CATALOG_CALL_TOOL_NAME) return toolName;
	if (typeof input !== 'object' || input === null || !('tool' in input)) return toolName;
	return typeof input.tool === 'string' ? input.tool : toolName;
}

// ---------------------------------------------------------------------------
// Runs a built first-class Agent for ONE scenario turn:
//   - the agent's own model call is REAL (builder-chosen model, keys from the
//     seeded credentials) and recorded via a passthrough fetch;
//   - node-tool and workflow-tool HTTP is intercepted at the same engine
//     choke points the workflow eval uses (`evalLlmMockHandler` on the tools'
//     additionalData) with LLM-generated responses;
//   - MCP servers, the fallback web_search tool, and configured sub-agents
//     are served by dedicated mocks/seams (see mcp-mock-fetch, web-search-mock
//     and AgentRuntimeInstrumentation); features the mock layer can't serve
//     yet (vector stores, SSE-transport MCP, chat integrations; memory unless
//     the request keeps it) are pruned from a config copy and reported as
//     `skippedFeatures`. Kept memory runs for real: worker models, embeddings,
//     and the runtime's own thread history (AGENT-1666).
// The runtime is built UNCACHED (never through AgentRuntimeCacheService) so an
// instrumented runtime can never leak into a normal chat run.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 600_000;
// Case input is used verbatim as the opening message, but as a prompt *signal*
// for seed + mock generation it is bounded — matching the request schema's cap
// on `scenarioHints` so a large Data Table cell can't blow up those prompts.
const MAX_SCENARIO_HINT_CHARS = 2_000;
const DEFAULT_MAX_ITERATIONS = 25;
const MAX_ITERATIONS_CAP = 40;
const MAX_AUTO_APPROVALS = 20;
const MAX_RECORDED_TOOL_VALUE_CHARS = 4_000;

// Keyed by the runtime tool name so entries merge with GenerateResult's tool
// calls; a name collision across kinds (e.g. an MCP `<server>_<tool>` equal to
// a node tool's sanitized name) merges into one record — accepted, the
// interceptedRequests still disambiguate.
type ToolLedger = Map<string, InstanceAiEvalInterceptedRequest[]>;

interface AgentRunEvidence {
	recorder: ReturnType<typeof createAgentModelTurnRecorder>;
	toolLedger: ToolLedger;
	credentialHelpers: EvalMockedCredentialsHelper[];
}

interface AgentRunOutput {
	result: GenerateResult;
	segmentToolCalls: NonNullable<GenerateResult['toolCalls']>;
	autoApprovedToolNames: Set<string>;
	/** A tool call suspended and was approved, so the turn ran in segments. */
	resumed: boolean;
}

type RuntimeInstrumentation = Parameters<AgentEvaluationPreparation['buildRuntime']>[0];

/**
 * What one simulated user shares across its turns and threads: the prepared
 * Agent, the generated seed, and the tool mocks that seed steers. The mocks
 * record into `evidence.current`, which each turn replaces, so a turn reports
 * only its own tool calls.
 */
interface EvalAgentWorld {
	agentId: string;
	userId: string;
	preparation: AgentEvaluationPreparation;
	seed: InstanceAiEvalAgentScenarioSeed;
	instrumentation: RuntimeInstrumentation;
	evidence: { current: AgentRunEvidence };
	/** The prepared config keeps memory: the runtime keeps the threads (AGENT-1666). */
	memoryOn: boolean;
	/** Every thread of this resource so far, for the memory snapshot. */
	threadIds: Set<string>;
	/** The agentRun the world was prepared with, as `agentRunKey`. */
	agentRunKey: string;
}

type AgentInput = string | AgentMessage[];

/** A thread turn with memory on: the runtime loads and stores the thread itself. */
interface MemoryTurn {
	agentId: string;
	persistence: { threadId: string; resourceId: string };
	/** Wait for background memory work before responding (`awaitMemory`). */
	awaitMemory: boolean;
	/** Memory tasks that ended during the turn. */
	tasks: InstanceAiEvalAgentMemoryTask[];
}

/** A terminal memory task event as the judge sees it; undefined for queued/started. */
function endedMemoryTask(event: MemoryTaskEvent): InstanceAiEvalAgentMemoryTask | undefined {
	const { taskKind } = event.task;
	if (event.type === 'completed') return { taskKind, outcome: 'completed' };
	if (event.type === 'skipped') return { taskKind, outcome: 'skipped', error: event.reason };
	if (event.type !== 'failed') return undefined;
	const error = event.error instanceof Error ? event.error.message : String(event.error);
	return { taskKind, outcome: 'failed', error };
}

/** JSON with sorted object keys, so equal values give equal text. */
function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
	if (typeof value !== 'object' || value === null) return JSON.stringify(value) ?? 'null';
	const entries = Object.entries(value)
		.filter(([, entry]) => entry !== undefined)
		.sort(([a], [b]) => a.localeCompare(b));
	return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
}

/** Compares memory variants: `keepMemory: false` is the same as leaving it out. */
function agentRunKey(agentRun: InstanceAiEvalAgentRunOptions | undefined): string {
	return canonicalJson({
		keepMemory: agentRun?.keepMemory === true,
		configOverrides: agentRun?.configOverrides ?? null,
	});
}

function sideCallUsageOf(report: SideCallUsageReport): InstanceAiEvalAgentSideCallUsage {
	return {
		task: report.task,
		model: report.model,
		inputTokens: report.usage.promptTokens,
		outputTokens: report.usage.completionTokens,
		...(report.cost !== undefined ? { cost: report.cost } : {}),
	};
}

/**
 * The messages a successful turn adds to its thread. A turn that ran in
 * segments (approvals) keeps only its final text: its segments' messages may
 * hold a tool call without its result, which a provider rejects on replay.
 */
function threadMessagesOf(output: AgentRunOutput, finalText: string): AgentMessage[] {
	if (!output.resumed) return output.result.messages;
	if (finalText.length === 0) return [];
	return [{ role: 'assistant', content: [{ type: 'text', text: finalText }] }];
}

/**
 * One URL is the other or a path-boundary prefix of it — bare prefix overlap
 * (`…/mcp` vs `…/mcp-two`) must not match.
 */
export function mcpUrlsMatch(configUrl: string, remoteUrl: string): boolean {
	const shorter = configUrl.length <= remoteUrl.length ? configUrl : remoteUrl;
	const longer = shorter === configUrl ? remoteUrl : configUrl;
	const base = shorter.replace(/\/+$/, '');
	return longer === shorter || longer === base || longer.startsWith(`${base}/`);
}

/**
 * Resolve canonical tool catalogs for configured MCP servers, so the mock
 * exposes the tools the real server would: registry entries carry the
 * server's declared catalog (matched by remote URL), and a policy with both
 * categories blocked pins its explicit non-blocked overrides even without a
 * registry match. Best-effort — without a match the mock's LLM-designed
 * catalog applies.
 */
export async function resolveCanonicalMcpCatalogs(
	mcpServers: NonNullable<AgentJsonConfig['mcpServers']>,
	moduleRegistry: ModuleRegistry,
	logger: Logger,
): Promise<Record<string, McpMockCanonicalTool[]> | undefined> {
	if (mcpServers.length === 0) return undefined;
	const result: Record<string, McpMockCanonicalTool[]> = {};

	if (moduleRegistry.isActive('mcp-registry')) {
		try {
			const entries = await Container.get(McpRegistryService).getAll();
			for (const server of mcpServers) {
				const matching = entries.filter((candidate) =>
					candidate.remotes.some((remote) => mcpUrlsMatch(server.url, remote.url)),
				);
				// A URL that matches several servers (an origin that hosts more than one) names none
				// of them. Taking the first would show one server's tools for another.
				const entry = matching.length === 1 ? matching[0] : undefined;
				if (entry && entry.tools.length > 0) {
					result[server.name] = entry.tools.map((tool) => ({
						name: tool.name,
						description: tool.title ?? tool.name,
					}));
				}
			}
		} catch (error) {
			logger.debug(
				`[EvalAgentMock] MCP registry catalog lookup failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	for (const server of mcpServers) {
		if (result[server.name]) continue;
		const permissions = server.toolPermissions;
		if (permissions?.categories.read === 'blocked' && permissions.categories.write === 'blocked') {
			const allowedTools = Object.entries(permissions.tools ?? {})
				.filter(([, permission]) => permission !== 'blocked')
				.map(([name]) => ({ name, description: name }));
			if (allowedTools.length > 0) result[server.name] = allowedTools;
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

function truncateRecordedValue(value: unknown): unknown {
	if (value === undefined || value === null) return value;
	let serialized: string;
	try {
		serialized = JSON.stringify(value);
	} catch {
		return '[unserializable value]';
	}
	if (serialized === undefined || serialized.length <= MAX_RECORDED_TOOL_VALUE_CHARS) return value;
	return truncateForLlm(serialized, MAX_RECORDED_TOOL_VALUE_CHARS);
}

function extractFinalAssistantText(result: GenerateResult): string {
	for (let messageIndex = result.messages.length - 1; messageIndex >= 0; messageIndex--) {
		const message = result.messages[messageIndex];
		if (!('role' in message) || message.role !== 'assistant') continue;
		const texts = message.content
			.filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
			.map((part) => part.text)
			.filter((text) => text.trim().length > 0);
		if (texts.length > 0) return texts.join('\n');
	}
	return '';
}

@Service()
export class EvalAgentExecutionService {
	private readonly threads = new EvalAgentThreadStore<EvalAgentWorld>();

	/** Resource ids with a turn in flight. One turn per simulated user at a time:
	 *  turns share the world's evidence and the thread's history. */
	private readonly busyResources = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async executeWithLlmMock(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		// When set, the run uses this exact text as the opening message instead of
		// a generated scenario. The seed is still generated (its shared context +
		// per-tool hints keep the tool mocks coherent), but the message the agent
		// receives is this input verbatim — how a fixed eval case is executed.
		caseInput?: string,
	): Promise<InstanceAiEvalAgentExecutionResult> {
		// Workflow-tool sub-executions carry a configureAdditionalData closure
		// that doesn't survive queue serialization — refuse upfront so tool
		// HTTP can't leak to real services.
		if (this.executionsConfig.mode === 'queue') {
			return this.errorResult(
				'Agent eval execution requires main process mode — queue mode is not supported.',
			);
		}

		if (!this.moduleRegistry.isActive('agents')) {
			return this.errorResult('Agent eval execution requires the agents module to be active.');
		}
		if (options.thread)
			return await this.executeGuardedThreadTurn(agentId, user, options, options.thread);

		const world = await this.createWorld(agentId, user, options, caseInput);
		if ('error' in world) return world.error;
		const { output } = await this.runTurn(world, world.seed.openingMessage, options);
		return output;
	}

	/** Run a thread turn unless one is already running for its resource id. */
	private async executeGuardedThreadTurn(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		turn: InstanceAiEvalAgentThreadTurn,
	): Promise<InstanceAiEvalAgentExecutionResult> {
		if (this.busyResources.has(turn.resourceId)) {
			return this.errorResult(`Resource id ${turn.resourceId} has a turn already running`);
		}
		this.busyResources.add(turn.resourceId);
		try {
			return await this.executeThreadTurn(agentId, user, options, turn);
		} finally {
			this.busyResources.delete(turn.resourceId);
		}
	}

	/**
	 * One turn of a multi-turn run. With memory off, the thread's earlier
	 * messages are replayed before the new one; with memory on, the runtime
	 * keeps the thread (`planThreadTurn`). The world is shared by every thread
	 * of the same resource id. A failed turn is not added to the thread.
	 */
	private async executeThreadTurn(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		turn: InstanceAiEvalAgentThreadTurn,
	): Promise<InstanceAiEvalAgentExecutionResult> {
		const thread = this.threads.thread(turn.threadId);
		const refusal =
			this.threadRefusal(agentId, user, turn, thread) ??
			this.agentRunRefusal(turn.resourceId, options.agentRun);
		if (refusal) return this.errorResult(refusal);
		if (thread && turn.final && turn.message === undefined) return this.releaseThread(turn, thread);

		const world = await this.resolveWorld(agentId, user, options, turn.resourceId);
		if ('error' in world) return world.error;

		const userMessage = turn.message ?? world.seed.openingMessage;
		const plan = planThreadTurn({
			memoryOn: world.memoryOn,
			threadId: turn.threadId,
			resourceId: turn.resourceId,
			history: thread?.messages ?? [],
			userMessage,
		});
		world.threadIds.add(turn.threadId);
		const memoryTurn = plan.persistence && {
			agentId,
			persistence: plan.persistence,
			awaitMemory: options.awaitMemory === true,
			tasks: [],
		};
		const { output, threadMessages } = await this.runTurn(world, plan.input, options, memoryTurn);
		const turns = (thread?.turns ?? 0) + 1;
		if (threadMessages) {
			const messages = plan.keepsHistory ? [...plan.input, ...threadMessages] : [];
			this.saveThread(turn, { agentId, userId: user.id }, messages, turns);
		}
		// Read before a final turn drops the world, so its thread ids are still known.
		const memory = memoryTurn && (await this.memoryState(world, memoryTurn));
		if (threadMessages && turn.final) this.threads.dropResource(turn.resourceId);
		const echo = { threadId: turn.threadId, resourceId: turn.resourceId, turn: turns, userMessage };
		return { ...output, thread: echo, ...(memory ? { memory } : {}) };
	}

	/** What the Agent's memory holds for the resource after the turn. Best-effort. */
	private async memoryState(world: EvalAgentWorld, memoryTurn: MemoryTurn) {
		const { agentId, persistence, tasks } = memoryTurn;
		const reader = Container.get(EvalAgentMemoryReader);
		try {
			const [stored, pendingCandidates] = await Promise.all([
				reader.read(agentId, persistence.resourceId, [...world.threadIds]),
				reader.pendingCandidateCount(agentId, persistence.resourceId),
			]);
			return { ...stored, pendingCandidates, tasks };
		} catch (error) {
			this.logger.warn('[EvalAgentMock] Reading the eval Agent memory failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/** A final request with no message: forget the resource, run nothing. */
	private releaseThread(
		turn: InstanceAiEvalAgentThreadTurn,
		thread: EvalAgentThread,
	): InstanceAiEvalAgentExecutionResult {
		const seed = this.threads.world(turn.resourceId)?.seed;
		this.threads.dropResource(turn.resourceId);
		return {
			runId: '',
			success: true,
			errors: [],
			finalText: '',
			toolCalls: [],
			modelTurns: [],
			seed: seed ?? { openingMessage: '', globalContext: '', toolHints: {}, warnings: [] },
			skippedFeatures: [],
			mockedCredentials: [],
			thread: {
				threadId: turn.threadId,
				resourceId: turn.resourceId,
				turn: thread.turns,
				userMessage: '',
			},
		};
	}

	/** The resource's world, made on its first turn. */
	private async resolveWorld(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		resourceId: string,
	): Promise<EvalAgentWorld | { error: InstanceAiEvalAgentExecutionResult }> {
		const existing = this.threads.world(resourceId);
		if (existing) return existing;
		const created = await this.createWorld(agentId, user, options);
		if (!('error' in created)) this.threads.saveWorld(resourceId, created);
		return created;
	}

	private saveThread(
		turn: InstanceAiEvalAgentThreadTurn,
		owner: { agentId: string; userId: string },
		messages: AgentMessage[],
		turns: number,
	): void {
		this.threads.saveThread(turn.threadId, {
			resourceId: turn.resourceId,
			...owner,
			messages,
			turns,
		});
	}

	/** A turn must be the next one of the thread the server holds. */
	private turnStepRefusal(
		turn: InstanceAiEvalAgentThreadTurn,
		thread: EvalAgentThread | undefined,
	): string | undefined {
		if (!thread) {
			return turn.expectedTurn === 1
				? undefined
				: `Eval thread ${turn.threadId} is unknown or expired, so turn ${String(turn.expectedTurn)} cannot continue it`;
		}
		const next = thread.turns + 1;
		if (turn.expectedTurn === next) return undefined;
		return `Eval thread ${turn.threadId} is at turn ${String(thread.turns)}, so the next turn is ${String(next)}, not ${String(turn.expectedTurn)}`;
	}

	/** A resource's world runs one memory variant: a turn must send the same agentRun. */
	private agentRunRefusal(
		resourceId: string,
		agentRun: InstanceAiEvalAgentRunOptions | undefined,
	): string | undefined {
		const world = this.threads.world(resourceId);
		if (!world || world.agentRunKey === agentRunKey(agentRun)) return undefined;
		return `Resource id ${resourceId} was made with another agentRun (keepMemory, configOverrides); send the same agentRun on every turn, or use a new resource id for another variant`;
	}

	/** Why a thread turn cannot run, or undefined when it can. */
	private threadRefusal(
		agentId: string,
		user: User,
		turn: InstanceAiEvalAgentThreadTurn,
		thread: EvalAgentThread | undefined,
	): string | undefined {
		const stepRefusal = this.turnStepRefusal(turn, thread);
		if (stepRefusal) return stepRefusal;
		if (thread && (thread.agentId !== agentId || thread.userId !== user.id)) {
			return `Eval thread ${turn.threadId} belongs to another Agent or user`;
		}
		if (thread && thread.resourceId !== turn.resourceId) {
			return `Eval thread ${turn.threadId} belongs to another resource id`;
		}
		if (thread && turn.message === undefined && !turn.final) {
			return `Continuing eval thread ${turn.threadId} needs a message`;
		}
		const world = this.threads.world(turn.resourceId);
		if (world && (world.agentId !== agentId || world.userId !== user.id)) {
			return `Resource id ${turn.resourceId} was made for another Agent or user`;
		}
		return undefined;
	}

	/**
	 * Prepare the Agent and generate the world its turns run in: the seed and
	 * the tool mocks it steers. On failure, the error result to return.
	 */
	private async createWorld(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		caseInput?: string,
	): Promise<EvalAgentWorld | { error: InstanceAiEvalAgentExecutionResult }> {
		const { projectId } = options;
		const prepared = await Container.get(AgentEvaluationService).prepare(
			user,
			projectId,
			agentId,
			options.agentRun,
		);
		if (prepared.error !== undefined) return { error: this.errorResult(prepared.error) };
		const preparation = prepared.preparation;
		const { config, tools: toolSummaries } = preparation;

		// The scenario signal steers seed + mock generation. A fixed case input
		// doubles as that signal (bounded) so the generated context, per-tool
		// hints, and mock responses all stay coherent with the message sent.
		// Secret-value shapes pasted into a case are scrubbed before reaching these
		// auxiliary LLM calls (which never need the real value); the opening
		// message the agent actually runs stays verbatim.
		const scenarioSignal =
			options.scenarioHints ??
			(caseInput !== undefined
				? truncateForLlm(redactSecretValuePatterns(caseInput), MAX_SCENARIO_HINT_CHARS)
				: undefined);

		let seed: InstanceAiEvalAgentScenarioSeed;
		try {
			seed = await generateAgentScenarioSeed({
				agentName: config.name,
				instructions: config.instructions,
				tools: toolSummaries,
				scenarioHints: scenarioSignal,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				error: this.errorResult(
					message.startsWith('FRAMEWORK ISSUE:') ? message : `FRAMEWORK ISSUE: ${message}`,
				),
			};
		}

		// A fixed eval case overrides the generated opening message: keep the
		// seed's context/hints (they steer the tool mocks) but send the case's
		// input verbatim.
		if (caseInput !== undefined) {
			seed = { ...seed, openingMessage: caseInput };
		}

		const mockHandler = createLlmMockHandler({
			scenarioHints: scenarioSignal,
			globalContext: seed.globalContext,
			nodeHints: seed.toolHints,
		});

		const evidence = { current: this.newEvidence() };
		const instrumentation = await this.createRuntimeInstrumentation(
			config,
			seed,
			scenarioSignal,
			mockHandler,
			evidence,
		);
		return {
			agentId,
			userId: user.id,
			preparation,
			seed,
			instrumentation,
			evidence,
			memoryOn: config.memory?.enabled === true,
			threadIds: new Set(),
			agentRunKey: agentRunKey(options.agentRun),
		};
	}

	private newEvidence(): AgentRunEvidence {
		return {
			recorder: createAgentModelTurnRecorder(createAiProxyFetch(this.outboundHttp), this.logger),
			toolLedger: new Map(),
			credentialHelpers: [],
		};
	}

	/** Run one turn in the world, with fresh evidence so it reports only its own calls. */
	private async runTurn(
		world: EvalAgentWorld,
		input: AgentInput,
		options: InstanceAiEvalAgentExecutionRequest,
		memoryTurn?: MemoryTurn,
	) {
		const evidence = this.newEvidence();
		world.evidence.current = evidence;
		return await this.executePreparedRuntime(
			world.preparation,
			{ ...world.instrumentation, modelFetch: evidence.recorder.fetch },
			world.seed,
			evidence,
			input,
			{ timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS, memoryTurn },
		);
	}

	private async createRuntimeInstrumentation(
		config: AgentJsonConfig,
		seed: InstanceAiEvalAgentScenarioSeed,
		scenarioSignal: string | undefined,
		mockHandler: EvalLlmMockHandler,
		evidence: { current: AgentRunEvidence },
	): Promise<RuntimeInstrumentation> {
		const pendingMcpCalls = new Map<string, McpMockToolCall[]>();
		const mcpCallIdentity = (serverName: string, toolName: string) =>
			JSON.stringify([serverName, toolName]);

		// Always created — delegated sub-agents may bring their own servers.
		const mcpServers = config.mcpServers ?? [];
		const knownToolsByServer = await resolveCanonicalMcpCatalogs(
			mcpServers,
			this.moduleRegistry,
			this.logger,
		);
		const mcpFetch = createMcpMockFetch({
			servers: mcpServers.map((server) => ({
				name: server.name,
				url: server.url,
				description: server.description,
			})),
			agentInstructions: config.instructions,
			scenarioHints: scenarioSignal,
			globalContext: seed.globalContext,
			serverHints: seed.toolHints,
			knownToolsByServer,
			logger: this.logger,
			onToolCall: (call) => {
				const identity = mcpCallIdentity(call.serverName, call.toolName);
				const calls = pendingMcpCalls.get(identity) ?? [];
				calls.push(call);
				pendingMcpCalls.set(identity, calls);
			},
		});

		const recordSettledMcpCall = (serverName: string, toolName: string, modelToolName?: string) => {
			const identity = mcpCallIdentity(serverName, toolName);
			const calls = pendingMcpCalls.get(identity);
			if (!calls) return;
			const call = calls.shift();
			if (!call) return;
			if (calls.length === 0) pendingMcpCalls.delete(identity);

			const key = modelToolName ?? sanitizeMcpToolName(`${serverName}_${toolName}`);
			const toolLedger = evidence.current.toolLedger;
			let entries = toolLedger.get(key);
			if (!entries) {
				entries = [];
				toolLedger.set(key, entries);
			}
			entries.push({
				url: mcpServers.find((server) => server.name === serverName)?.url ?? serverName,
				method: 'POST',
				nodeType: `mcp:${serverName}`,
				requestBody: call.args,
				mockResponse: call.result,
			});
		};

		// Fallback web_search mock — always created (sub-agents may enable web
		// search); with native search the tool is never built and this goes unused.
		const webSearchMock = createWebSearchMock({
			agentInstructions: config.instructions,
			scenarioHints: scenarioSignal,
			globalContext: seed.globalContext,
			searchHint: seed.toolHints?.web_search,
			logger: this.logger,
			onSearch: (args, result) => {
				const toolLedger = evidence.current.toolLedger;
				let entries = toolLedger.get('web_search');
				if (!entries) {
					entries = [];
					toolLedger.set('web_search', entries);
				}
				entries.push({
					url: 'mock://web-search',
					method: 'POST',
					nodeType: 'web-search:fallback',
					requestBody: args,
					mockResponse: result,
				});
			},
		});

		return {
			modelFetch: evidence.current.recorder.fetch,
			mcpFetch: () => mcpFetch,
			onMcpToolCallSettled: ({ serverName, toolName, modelToolName }) => {
				recordSettledMcpCall(serverName, toolName, modelToolName);
			},
			webSearch: webSearchMock,
			configureToolAdditionalData: (additionalData, toolContext) => {
				const helper = new EvalMockedCredentialsHelper(
					additionalData.credentialsHelper,
					undefined,
					this.logger,
				);
				evidence.current.credentialHelpers.push(helper);
				additionalData.credentialsHelper = helper;
				additionalData.evalLlmMockHandler = this.createRecordingMockHandler(
					mockHandler,
					toolContext.toolName,
					evidence.current.toolLedger,
				);
			},
		};
	}

	/** The turn's result, and on success the messages it adds to its thread. */
	private async executePreparedRuntime(
		preparation: AgentEvaluationPreparation,
		instrumentation: RuntimeInstrumentation,
		seed: InstanceAiEvalAgentScenarioSeed,
		evidence: AgentRunEvidence,
		input: AgentInput,
		{ timeoutMs, memoryTurn }: { timeoutMs: number; memoryTurn?: MemoryTurn },
	): Promise<{ output: InstanceAiEvalAgentExecutionResult; threadMessages?: AgentMessage[] }> {
		const { config, skippedFeatures } = preparation;
		const { recorder, toolLedger, credentialHelpers } = evidence;
		const deadline = Date.now() + timeoutMs;
		const budgetSignal = AbortSignal.timeout(timeoutMs);
		let agent: RuntimeAgent;
		try {
			agent = await raceWithAbort(async () => {
				const runtime = await preparation.buildRuntime(instrumentation, budgetSignal);
				if (budgetSignal.aborted) await this.closeRuntime(runtime);
				throwIfAborted(budgetSignal);
				return runtime;
			}, budgetSignal);
		} catch (error) {
			return {
				output: this.errorResult(
					this.runErrorMessage(error, budgetSignal, timeoutMs, 'Failed to build agent runtime'),
					seed,
					skippedFeatures,
				),
			};
		}

		const maxIterations = Math.min(
			config.config?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
			MAX_ITERATIONS_CAP,
		);
		const sideCalls: InstanceAiEvalAgentSideCallUsage[] = [];
		if (memoryTurn) this.observeMemoryTasks(agent, memoryTurn);
		let run: AgentRunOutput;
		let memoryError: string | undefined;
		try {
			run = await this.generateWithAutoApprovals(agent, input, {
				abortSignal: budgetSignal,
				maxIterations,
				...(memoryTurn ? { persistence: memoryTurn.persistence } : {}),
				onSideCallUsage: (report) => {
					sideCalls.push(sideCallUsageOf(report));
				},
			});
			// Same agent, before it is closed: the next request builds a new runtime.
			if (memoryTurn) memoryError = await this.settleMemory(agent, memoryTurn, deadline);
		} catch (error) {
			// Flush so the failure result carries the recorded response bodies too.
			await recorder.flush();
			return {
				output: this.errorResult(
					this.runErrorMessage(error, budgetSignal, timeoutMs, 'Agent run failed'),
					seed,
					skippedFeatures,
					{ modelTurns: recorder.turns, toolLedger, credentialHelpers },
				),
			};
		} finally {
			await recorder.flush();
			if (budgetSignal.aborted) void this.closeRuntime(agent);
			else await this.closeRuntime(agent);
		}
		const output = withTurnExtras(this.executionResult(run, preparation, seed, evidence), {
			sideCalls,
			memoryError,
			// Only a turn with persistence used the memory config.
			memoryConfig: memoryTurn ? config.memory : undefined,
		});
		return output.success
			? { output, threadMessages: threadMessagesOf(run, output.finalText) }
			: { output };
	}

	/** Record the memory tasks that end during the turn. */
	private observeMemoryTasks(agent: RuntimeAgent, memoryTurn: MemoryTurn): void {
		agent.allMemoryTasksObserver((event) => {
			const ended = endedMemoryTask(event);
			if (ended) memoryTurn.tasks.push(ended);
		});
	}

	/**
	 * Wait for the turn's background memory work, so its side-call usage
	 * reports are in. With `awaitMemory`, also check no flagged memory is left
	 * pending (an episodic task skipped on a held lock leaves them). The reason
	 * the next session could not rely on memory, or undefined; never a reason
	 * without `awaitMemory`.
	 */
	private async settleMemory(
		agent: RuntimeAgent,
		memoryTurn: MemoryTurn,
		deadline: number,
	): Promise<string | undefined> {
		const waitError = await this.waitForMemoryTasks(agent, deadline);
		if (!memoryTurn.awaitMemory) return undefined;
		const reason = waitError ?? (await this.pendingMemoryReason(memoryTurn));
		return reason && `memory not settled: ${reason}${unfinishedMemoryTasks(memoryTurn.tasks)}`;
	}

	/** Flagged memories of the resource not yet turned into entries, or undefined. */
	private async pendingMemoryReason({ agentId, persistence }: MemoryTurn) {
		const reader = Container.get(EvalAgentMemoryReader);
		const pending = await reader.pendingCandidateCount(agentId, persistence.resourceId);
		if (pending === 0) return undefined;
		return `${String(pending)} flagged memories are still pending for ${persistence.resourceId}`;
	}

	/** Why the agent's background tasks did not settle in the turn budget, or undefined. */
	private async waitForMemoryTasks(
		agent: RuntimeAgent,
		deadline: number,
	): Promise<string | undefined> {
		try {
			await agent.waitForBackgroundTasks({ timeoutMs: Math.max(1, deadline - Date.now()) });
			return undefined;
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}

	private async closeRuntime(agent: RuntimeAgent) {
		try {
			await agent.close();
		} catch (error) {
			this.logger.warn('[EvalAgentMock] Agent runtime teardown failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private runErrorMessage(
		error: unknown,
		budgetSignal: AbortSignal,
		timeoutMs: number,
		prefix: string,
	) {
		if (budgetSignal.aborted) {
			const seconds = Math.round(timeoutMs / 1000);
			return `Agent run exceeded its ${seconds}s eval budget and was stopped`;
		}
		const message = error instanceof Error ? error.message : String(error);
		return `${prefix}: ${message}`;
	}

	private async generateWithAutoApprovals(
		agent: RuntimeAgent,
		input: AgentInput,
		options: {
			abortSignal: AbortSignal;
			maxIterations: number;
			persistence?: MemoryTurn['persistence'];
			onSideCallUsage: (report: SideCallUsageReport) => void;
		},
	): Promise<AgentRunOutput> {
		const autoApprovedToolNames = new Set<string>();
		const segmentToolCalls: NonNullable<GenerateResult['toolCalls']> = [];
		const collectToolCalls = (segment: GenerateResult) => {
			for (const entry of segment.toolCalls ?? []) {
				if (!segmentToolCalls.includes(entry)) segmentToolCalls.push(entry);
			}
		};
		let result = await raceWithAbort(
			async () => await agent.generate(input, options),
			options.abortSignal,
		);
		collectToolCalls(result);
		let approvals = 0;
		while (approvals < MAX_AUTO_APPROVALS) {
			const pending = result.pendingSuspend?.[0];
			if (!pending) break;
			autoApprovedToolNames.add(effectiveToolName(pending.toolName, pending.input));
			approvals++;
			result = await raceWithAbort(
				async () =>
					await agent.approve('generate', {
						runId: pending.runId,
						toolCallId: pending.toolCallId,
						...options,
					}),
				options.abortSignal,
			);
			collectToolCalls(result);
		}
		return { result, segmentToolCalls, autoApprovedToolNames, resumed: approvals > 0 };
	}

	private executionResult(
		{ result, segmentToolCalls, autoApprovedToolNames }: AgentRunOutput,
		preparation: AgentEvaluationPreparation,
		seed: InstanceAiEvalAgentScenarioSeed,
		{ recorder, toolLedger, credentialHelpers }: AgentRunEvidence,
	): InstanceAiEvalAgentExecutionResult {
		const { tools: toolSummaries, skippedFeatures, config } = preparation;
		const mcpServers = config.mcpServers ?? [];
		const errors: string[] = [];
		if ((result.pendingSuspend?.length ?? 0) > 0) {
			errors.push(`Run still suspended after ${MAX_AUTO_APPROVALS} auto-approvals`);
		}
		if (result.error !== undefined) {
			errors.push(
				`Model run error: ${result.error instanceof Error ? result.error.message : String(result.error)}`,
			);
		}

		const kindByToolName = new Map(toolSummaries.map((tool) => [tool.name, tool.kind]));
		// MCP summaries are keyed by SERVER name; the model calls the client-side
		// prefixed `<server>_<tool>` names. Sub-agent-brought servers aren't in
		// this agent's summaries — their ledger entries carry an `mcp:` nodeType.
		const kindForTool = (tool: string): InstanceAiEvalAgentToolCallRecord['kind'] =>
			kindByToolName.get(tool) ??
			(mcpServers.some((server) => tool.startsWith(sanitizeMcpToolName(`${server.name}_`))) ||
			(toolLedger.get(tool) ?? []).some((request) => request.nodeType?.startsWith('mcp:'))
				? 'mcp'
				: 'other');
		const toolCalls = segmentToolCalls.map((entry): InstanceAiEvalAgentToolCallRecord => {
			// The ledger and the tool summaries use the real tool name, not `call_tool`.
			const tool = effectiveToolName(entry.tool, entry.input);
			const interceptedRequests = toolLedger.get(tool) ?? [];
			return {
				tool,
				kind: kindForTool(tool),
				input: truncateRecordedValue(entry.input),
				output: truncateRecordedValue(entry.output),
				...(entry.canceled ? { error: 'canceled' } : {}),
				mocked: interceptedRequests.length > 0,
				interceptedRequests,
				...(autoApprovedToolNames.has(tool) ? { autoApproved: true } : {}),
			};
		});
		// Ledger entries with no matching toolCalls record are either errored
		// calls (GenerateResult omits those) or a delegated sub-agent's calls
		// (never reported on the parent) — surface them without asserting
		// failure so the judge can weigh the intercepted traffic itself.
		const reportedTools = new Set(toolCalls.map((entry) => entry.tool));
		for (const [tool, interceptedRequests] of toolLedger) {
			if (reportedTools.has(tool)) continue;
			toolCalls.push({
				tool,
				kind: kindForTool(tool),
				error:
					'Not attributed to a reported tool call (a delegated sub-agent call, or an errored call) — see interceptedRequests',
				mocked: interceptedRequests.length > 0,
				interceptedRequests,
				...(autoApprovedToolNames.has(tool) ? { autoApproved: true } : {}),
			});
		}

		return {
			runId: result.runId,
			success: errors.length === 0 && result.finishReason !== 'error',
			errors,
			finalText: extractFinalAssistantText(result),
			model: result.model,
			finishReason: result.finishReason,
			toolCalls,
			modelTurns: recorder.turns,
			...(result.usage
				? {
						usage: {
							inputTokens: result.usage.promptTokens,
							outputTokens: result.usage.completionTokens,
						},
					}
				: {}),
			seed,
			skippedFeatures,
			mockedCredentials: credentialHelpers.flatMap((helper) => helper.mockedCredentials),
		};
	}

	/**
	 * Wraps the shared mock handler to record intercepted requests against the
	 * owning tool — the agent-eval analog of the workflow eval's
	 * `createInterceptingHandler`, keyed by tool instead of node.
	 */
	private createRecordingMockHandler(
		mockHandler: EvalLlmMockHandler,
		toolName: string,
		ledger: ToolLedger,
	): EvalLlmMockHandler {
		return async (requestOptions, node) => {
			const response = await mockHandler(requestOptions, node);
			let entries = ledger.get(toolName);
			if (!entries) {
				entries = [];
				ledger.set(toolName, entries);
			}
			entries.push({
				url: requestOptions.url ?? '(no URL)',
				method: requestOptions.method ?? 'GET',
				nodeType: node.type,
				requestBody: requestOptions.body,
				mockResponse: snapshotLedgerBody(response?.body),
			});
			this.logger.debug(
				`[EvalAgentMock] Intercepted ${requestOptions.method ?? 'GET'} ${requestOptions.url} from tool "${toolName}" (${node.type})`,
			);
			return response;
		};
	}

	private errorResult(
		message: string,
		seed?: InstanceAiEvalAgentScenarioSeed,
		skippedFeatures: InstanceAiEvalAgentSkippedFeature[] = [],
		partial?: {
			modelTurns: InstanceAiEvalAgentExecutionResult['modelTurns'];
			toolLedger: ToolLedger;
			credentialHelpers: EvalMockedCredentialsHelper[];
		},
	): InstanceAiEvalAgentExecutionResult {
		this.logger.error(`[EvalAgentMock] ${message}`);
		return {
			runId: '',
			success: false,
			errors: [message],
			finalText: '',
			toolCalls: partial
				? [...partial.toolLedger.entries()].map(([tool, interceptedRequests]) => ({
						tool,
						kind: salvagedToolKind(interceptedRequests),
						mocked: interceptedRequests.length > 0,
						interceptedRequests,
					}))
				: [],
			modelTurns: partial?.modelTurns ?? [],
			seed: seed ?? { openingMessage: '', globalContext: '', toolHints: {}, warnings: [] },
			skippedFeatures,
			mockedCredentials: (partial?.credentialHelpers ?? []).flatMap(
				(helper) => helper.mockedCredentials,
			),
		};
	}
}

/** The turn's failed and skipped memory tasks, as a suffix for "memory not settled". */
function unfinishedMemoryTasks(tasks: InstanceAiEvalAgentMemoryTask[]): string {
	const unfinished = tasks.filter((task) => task.outcome !== 'completed');
	if (unfinished.length === 0) return '';
	const listed = unfinished.map(
		(task) => `${task.taskKind} ${task.outcome}${task.error ? `: ${task.error}` : ''}`,
	);
	return ` (memory tasks this turn: ${listed.join('; ')})`;
}

/** Add the turn's side-call usage and, on a thread turn with memory, the memory
 *  config; fail the turn when memory did not settle. */
function withTurnExtras(
	output: InstanceAiEvalAgentExecutionResult,
	{
		sideCalls,
		memoryError,
		memoryConfig,
	}: {
		sideCalls: InstanceAiEvalAgentSideCallUsage[];
		memoryError?: string;
		memoryConfig?: AgentJsonConfig['memory'];
	},
): InstanceAiEvalAgentExecutionResult {
	return {
		...output,
		...(memoryConfig ? { memoryConfig } : {}),
		...(sideCalls.length > 0 ? { sideCallUsage: sideCalls } : {}),
		...(memoryError ? { success: false, errors: [...output.errors, memoryError] } : {}),
	};
}

// ---------------------------------------------------------------------------
// Config pruning
// ---------------------------------------------------------------------------

/**
 * Strip the config features the eval mock layer can't serve yet. Each removal
 * is reported so the judge (and anyone debugging) can see the run diverged
 * from the authored config, and why.
 */
// ---------------------------------------------------------------------------
// Tool summaries + result shaping
// ---------------------------------------------------------------------------

/**
 * Sanitized tool names must match what the factories register (and therefore
 * what `GenerateResult.toolCalls` reports): `nodeNameToToolName` for node
 * tools, `sanitizeToolName` for workflow tools, the stored descriptor name
 * for custom tools.
 */
/**
 * Best-effort kind for a salvaged ledger entry on the failure path, where the
 * summary map is gone: MCP and web-search entries are self-describing via
 * nodeType; anything else with a nodeType came through the node/workflow
 * engine seam.
 */
function salvagedToolKind(
	interceptedRequests: InstanceAiEvalInterceptedRequest[],
): InstanceAiEvalAgentToolCallRecord['kind'] {
	const nodeType = interceptedRequests.find((request) => request.nodeType)?.nodeType;
	if (!nodeType) return 'other';
	if (nodeType.startsWith('mcp:')) return 'mcp';
	if (nodeType === 'web-search:fallback') return 'other';
	return 'node';
}
