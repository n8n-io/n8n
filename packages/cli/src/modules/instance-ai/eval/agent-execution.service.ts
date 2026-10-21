import { isDeepStrictEqual } from 'node:util';
import {
	AgentEvent,
	sanitizeToolName as sanitizeMcpToolName,
	raceWithAbort,
	throwIfAborted,
	type Agent as RuntimeAgent,
	type GenerateResult,
} from '@n8n/agents';
import type {
	AgentJsonConfig,
	InstanceAiEvalAgentExecutionRequest,
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalAgentScenarioSeed,
	InstanceAiEvalAgentSkippedFeature,
	InstanceAiEvalAgentToolCallRecord,
	InstanceAiEvalInterceptedRequest,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';

import type { AgentEvaluationPreparation } from '@/modules/agents/evaluation/agent-evaluation.contracts';
import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import type { AgentRunSource } from '@/modules/agents/utils/agent-published-snapshot';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

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
//     yet (memory, vector stores, SSE-transport MCP, chat integrations) are
//     pruned from a config copy and reported as `skippedFeatures`.
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
	progress: AgentToolProgress;
}

type ToolProgressWriter = (calls: InstanceAiEvalAgentToolCallRecord[]) => Promise<void>;

interface AgentRunOutput {
	result: GenerateResult;
	segmentToolCalls: NonNullable<GenerateResult['toolCalls']>;
	autoApprovedToolNames: Set<string>;
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
				const entry = entries.find((candidate) =>
					candidate.remotes.some((remote) => mcpUrlsMatch(server.url, remote.url)),
				);
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

type ToolKind = InstanceAiEvalAgentToolCallRecord['kind'];

/**
 * MCP summaries are keyed by SERVER name; the model calls the client-side
 * prefixed `<server>_<tool>` names. Sub-agent-brought servers aren't in this
 * agent's summaries — their ledger entries carry an `mcp:` nodeType.
 */
function toolKindResolver(
	{ tools: toolSummaries, config }: AgentEvaluationPreparation,
	toolLedger: ToolLedger,
): (tool: string) => ToolKind {
	const kindByToolName = new Map(toolSummaries.map((tool) => [tool.name, tool.kind]));
	const mcpServers = config.mcpServers ?? [];
	return (tool) =>
		kindByToolName.get(tool) ??
		(mcpServers.some((server) => tool.startsWith(sanitizeMcpToolName(`${server.name}_`))) ||
		(toolLedger.get(tool) ?? []).some((request) => request.nodeType?.startsWith('mcp:'))
			? 'mcp'
			: 'other');
}

/**
 * Live tool progress for one run, from the agent's tool events and the mock
 * ledger. Event handlers cannot await writes, so snapshots are serialized and
 * drained by `close()` before the run returns: progress cannot overwrite
 * completion or a later attempt.
 */
class AgentToolProgress {
	private readonly calls = new Map<string, InstanceAiEvalAgentToolCallRecord>();

	private writes = Promise.resolve();

	private closed = false;

	constructor(
		private readonly toolLedger: ToolLedger,
		private readonly toolSummaries: AgentEvaluationPreparation['tools'],
		private readonly logger: Logger,
		private readonly onProgress?: ToolProgressWriter,
	) {}

	attach(agent: RuntimeAgent) {
		if (!this.onProgress) return;
		agent.on(AgentEvent.ToolExecutionStart, (event) => {
			if (this.closed || event.type !== AgentEvent.ToolExecutionStart) return;
			this.calls.set(event.toolCallId, {
				toolCallId: event.toolCallId,
				tool: event.toolName,
				kind: this.toolSummaries.find((tool) => tool.name === event.toolName)?.kind ?? 'other',
				input: truncateRecordedValue(event.args),
				status: 'running',
				mocked: false,
				interceptedRequests: [],
			});
			this.publish();
		});
		agent.on(AgentEvent.ToolExecutionEnd, (event) => {
			if (this.closed || event.type !== AgentEvent.ToolExecutionEnd) return;
			const previous = this.calls.get(event.toolCallId);
			const interceptedRequests = this.toolLedger.get(event.toolName) ?? [];
			this.calls.set(event.toolCallId, {
				...previous,
				toolCallId: event.toolCallId,
				tool: event.toolName,
				kind: previous?.kind ?? 'other',
				output: truncateRecordedValue(event.result),
				status: event.isError ? 'error' : 'completed',
				...(event.isError ? { error: 'tool_execution_failed' } : {}),
				mocked: interceptedRequests.length > 0,
				interceptedRequests: [...interceptedRequests],
			});
			this.publish();
		});
	}

	/** A send-and-wait tool records its mocked send before the tool ends. */
	ledgerChanged(toolName: string, interceptedRequests: InstanceAiEvalInterceptedRequest[]) {
		if (this.closed || !this.onProgress) return;
		let changed = false;
		for (const [id, call] of this.calls) {
			if (call.tool !== toolName || call.status !== 'running') continue;
			this.calls.set(id, {
				...call,
				mocked: interceptedRequests.length > 0,
				interceptedRequests: [...interceptedRequests],
			});
			changed = true;
		}
		if (changed) this.publish();
	}

	async close() {
		if (this.closed) return;
		for (const [id, call] of this.calls) {
			if (call.status === 'running')
				this.calls.set(id, { ...call, status: 'error', error: 'execution_stopped' });
		}
		if (this.calls.size > 0) this.publish();
		this.closed = true;
		await this.writes;
	}

	/**
	 * The run's tool calls. Events own the IDs shown during progress; SDK entries
	 * that match a finished event are consumed once, so repeated calls remain
	 * distinct even when they finish out of order.
	 */
	terminalToolCalls(
		{ segmentToolCalls, autoApprovedToolNames }: Omit<AgentRunOutput, 'result'>,
		kindForTool: (tool: string) => ToolKind,
	): InstanceAiEvalAgentToolCallRecord[] {
		const reported = segmentToolCalls.map(
			(entry): InstanceAiEvalAgentToolCallRecord => ({
				tool: entry.tool,
				kind: kindForTool(entry.tool),
				input: truncateRecordedValue(entry.input),
				output: truncateRecordedValue(entry.output),
				...(entry.canceled ? { error: 'canceled' } : {}),
				mocked: false,
				interceptedRequests: [],
			}),
		);
		const calls = [...this.calls.values()].map((call) => {
			const index = reported.findIndex(
				(entry) =>
					call.status === 'completed' &&
					entry.tool === call.tool &&
					(call.input === undefined || isDeepStrictEqual(entry.input, call.input)) &&
					isDeepStrictEqual(entry.output, call.output),
			);
			const entry = index >= 0 ? reported.splice(index, 1)[0] : undefined;
			return {
				...entry,
				...call,
				kind: kindForTool(call.tool),
				...(call.status === 'running'
					? { status: 'error' as const, error: 'execution_stopped' }
					: {}),
			};
		});
		// Some cancelled calls never emit execution events. Keep those records too.
		calls.push(...reported);
		// Ledger entries with no matching record are either errored calls
		// (GenerateResult omits those) or a delegated sub-agent's calls (never
		// reported on the parent) — surface them without asserting failure so the
		// judge can weigh the intercepted traffic itself.
		const recordedTools = new Set(calls.map((call) => call.tool));
		for (const [tool] of this.toolLedger) {
			if (recordedTools.has(tool)) continue;
			calls.push({
				tool,
				kind: kindForTool(tool),
				error:
					'Not attributed to a reported tool call (a delegated sub-agent call, or an errored call) — see interceptedRequests',
				mocked: false,
				interceptedRequests: [],
			});
		}
		return calls.map((call) => {
			const interceptedRequests = this.toolLedger.get(call.tool) ?? [];
			return {
				...call,
				mocked: interceptedRequests.length > 0,
				interceptedRequests,
				...(autoApprovedToolNames.has(call.tool) ? { autoApproved: true } : {}),
			};
		});
	}

	private publish() {
		const onProgress = this.onProgress;
		if (!onProgress) return;
		const calls = [...this.calls.values()].map((call) => ({ ...call }));
		this.writes = this.writes
			.then(async () => await onProgress(calls))
			.catch((error: unknown) => {
				this.logger.warn('[EvalAgentMock] Could not record tool progress', { error });
			});
	}
}

@Service()
export class EvalAgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/** Keep the root agent and resolved skills fixed while a batch is in flight. */
	async captureRunSource(agent: ProjectAgent): Promise<AgentRunSource> {
		return await Container.get(AgentEvaluationService).captureRunSource(agent);
	}

	async executeWithLlmMock(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
		// When set, the run uses this exact text as the opening message instead of
		// a generated scenario. The seed is still generated (its shared context +
		// per-tool hints keep the tool mocks coherent), but the message the agent
		// receives is this input verbatim — how a fixed eval case is executed.
		caseInput?: string,
		hooks?: { onProgress?: ToolProgressWriter; source?: AgentRunSource },
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
		const { projectId } = options;
		const prepared = await Container.get(AgentEvaluationService).prepare(
			user,
			projectId,
			agentId,
			hooks?.source,
		);
		if (prepared.error !== undefined) return this.errorResult(prepared.error);
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
			return this.errorResult(
				message.startsWith('FRAMEWORK ISSUE:') ? message : `FRAMEWORK ISSUE: ${message}`,
			);
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

		const toolLedger: ToolLedger = new Map();
		const credentialHelpers: EvalMockedCredentialsHelper[] = [];
		const recorder = createAgentModelTurnRecorder(
			createAiProxyFetch(this.outboundHttp),
			this.logger,
		);
		const progress = new AgentToolProgress(
			toolLedger,
			toolSummaries,
			this.logger,
			hooks?.onProgress,
		);
		const evidence = { recorder, toolLedger, credentialHelpers, progress };
		const instrumentation = await this.createRuntimeInstrumentation(
			config,
			seed,
			scenarioSignal,
			mockHandler,
			evidence,
		);
		return await this.executePreparedRuntime(
			preparation,
			instrumentation,
			seed,
			evidence,
			options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		);
	}

	private async createRuntimeInstrumentation(
		config: AgentJsonConfig,
		seed: InstanceAiEvalAgentScenarioSeed,
		scenarioSignal: string | undefined,
		mockHandler: EvalLlmMockHandler,
		{ recorder, toolLedger, credentialHelpers, progress }: AgentRunEvidence,
	): Promise<Parameters<AgentEvaluationPreparation['buildRuntime']>[0]> {
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
			progress.ledgerChanged(key, entries);
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
				progress.ledgerChanged('web_search', entries);
			},
		});

		return {
			modelFetch: recorder.fetch,
			mcpFetch,
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
				credentialHelpers.push(helper);
				additionalData.credentialsHelper = helper;
				additionalData.evalLlmMockHandler = this.createRecordingMockHandler(
					mockHandler,
					toolContext.toolName,
					toolLedger,
					(entries) => progress.ledgerChanged(toolContext.toolName, entries),
				);
			},
		};
	}

	private async executePreparedRuntime(
		preparation: AgentEvaluationPreparation,
		instrumentation: Parameters<AgentEvaluationPreparation['buildRuntime']>[0],
		seed: InstanceAiEvalAgentScenarioSeed,
		evidence: AgentRunEvidence,
		timeoutMs: number,
	): Promise<InstanceAiEvalAgentExecutionResult> {
		const { config, skippedFeatures } = preparation;
		const { recorder, credentialHelpers, progress } = evidence;
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
			return this.errorResult(
				this.runErrorMessage(error, budgetSignal, timeoutMs, 'Failed to build agent runtime'),
				seed,
				skippedFeatures,
			);
		}

		const maxIterations = Math.min(
			config.config?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
			MAX_ITERATIONS_CAP,
		);
		progress.attach(agent);
		// Owned here, so a failed run still reports the calls of finished segments.
		const collected: Omit<AgentRunOutput, 'result'> = {
			segmentToolCalls: [],
			autoApprovedToolNames: new Set<string>(),
		};
		let output: AgentRunOutput;
		try {
			output = await this.generateWithAutoApprovals(
				agent,
				seed.openingMessage,
				{ abortSignal: budgetSignal, maxIterations },
				collected,
			);
		} catch (error) {
			// Flush so the failure result carries the recorded response bodies too.
			await recorder.flush();
			return this.errorResult(
				this.runErrorMessage(error, budgetSignal, timeoutMs, 'Agent run failed'),
				seed,
				skippedFeatures,
				{
					modelTurns: recorder.turns,
					credentialHelpers,
					toolCalls: progress.terminalToolCalls(
						collected,
						toolKindResolver(preparation, evidence.toolLedger),
					),
				},
			);
		} finally {
			await progress.close();
			await recorder.flush();
			if (budgetSignal.aborted) void this.closeRuntime(agent);
			else await this.closeRuntime(agent);
		}
		return this.executionResult(output, preparation, seed, evidence);
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
		openingMessage: string,
		options: { abortSignal: AbortSignal; maxIterations: number },
		{ segmentToolCalls, autoApprovedToolNames }: Omit<AgentRunOutput, 'result'>,
	): Promise<AgentRunOutput> {
		const collectToolCalls = (segment: GenerateResult) => {
			for (const entry of segment.toolCalls ?? []) {
				if (!segmentToolCalls.includes(entry)) segmentToolCalls.push(entry);
			}
		};
		let result = await raceWithAbort(
			async () => await agent.generate(openingMessage, options),
			options.abortSignal,
		);
		collectToolCalls(result);
		let approvals = 0;
		while (approvals < MAX_AUTO_APPROVALS) {
			const pending = result.pendingSuspend?.[0];
			if (!pending) break;
			autoApprovedToolNames.add(pending.toolName);
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
		return { result, segmentToolCalls, autoApprovedToolNames };
	}

	private executionResult(
		{ result, ...collected }: AgentRunOutput,
		preparation: AgentEvaluationPreparation,
		seed: InstanceAiEvalAgentScenarioSeed,
		{ recorder, toolLedger, credentialHelpers, progress }: AgentRunEvidence,
	): InstanceAiEvalAgentExecutionResult {
		const { skippedFeatures } = preparation;
		const errors: string[] = [];
		if ((result.pendingSuspend?.length ?? 0) > 0) {
			errors.push(`Run still suspended after ${MAX_AUTO_APPROVALS} auto-approvals`);
		}
		if (result.error !== undefined) {
			errors.push(
				`Model run error: ${result.error instanceof Error ? result.error.message : String(result.error)}`,
			);
		}

		return {
			runId: result.runId,
			success: errors.length === 0 && result.finishReason !== 'error',
			errors,
			finalText: extractFinalAssistantText(result),
			model: result.model,
			finishReason: result.finishReason,
			toolCalls: progress.terminalToolCalls(collected, toolKindResolver(preparation, toolLedger)),
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
		onRecorded?: (entries: InstanceAiEvalInterceptedRequest[]) => void,
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
			onRecorded?.(entries);
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
			credentialHelpers: EvalMockedCredentialsHelper[];
			toolCalls: InstanceAiEvalAgentToolCallRecord[];
		},
	): InstanceAiEvalAgentExecutionResult {
		this.logger.error(`[EvalAgentMock] ${message}`);
		return {
			runId: '',
			success: false,
			errors: [message],
			finalText: '',
			toolCalls: partial?.toolCalls ?? [],
			modelTurns: partial?.modelTurns ?? [],
			seed: seed ?? { openingMessage: '', globalContext: '', toolHints: {}, warnings: [] },
			skippedFeatures,
			mockedCredentials: (partial?.credentialHelpers ?? []).flatMap(
				(helper) => helper.mockedCredentials,
			),
		};
	}
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
