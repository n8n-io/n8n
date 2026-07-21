import type { GenerateResult, Agent as RuntimeAgent } from '@n8n/agents';
import {
	hasNativeWebSearchProvider,
	isNativeWebSearchRequested,
} from '@n8n/ai-utilities/agent-config';
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
import { nodeNameToToolName } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
// Static agents-module imports are safe here: the ModuleRegistry gate decides
// availability at runtime.
import { AgentRuntimeReconstructionService } from '@/modules/agents/agent-runtime-reconstruction.service';
import type { Agent as AgentEntity } from '@/modules/agents/entities/agent.entity';
import { sanitizeToolName } from '@/modules/agents/json-config/agent-config-composition';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { createAgentModelTurnRecorder } from './agent-model-turn-recorder';
import { generateAgentScenarioSeed, type AgentSeedToolSummary } from './agent-scenario-seed';
import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { createMcpMockFetch, type McpMockCanonicalTool } from './mcp-mock-fetch';
import { createLlmMockHandler } from './mock-handler';
import { truncateForLlm } from './request-sanitizer';
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
const DEFAULT_MAX_ITERATIONS = 25;
const MAX_ITERATIONS_CAP = 40;
const MAX_AUTO_APPROVALS = 20;
const MAX_RECORDED_TOOL_VALUE_CHARS = 4_000;

// Keyed by the runtime tool name so entries merge with GenerateResult's tool
// calls; a name collision across kinds (e.g. an MCP `<server>_<tool>` equal to
// a node tool's sanitized name) merges into one record — accepted, the
// interceptedRequests still disambiguate.
type ToolLedger = Map<string, InstanceAiEvalInterceptedRequest[]>;

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

@Service()
export class EvalAgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly outboundHttp: OutboundHttp,
		private readonly credentialsService: CredentialsService,
	) {}

	async executeWithLlmMock(
		agentId: string,
		user: User,
		options: InstanceAiEvalAgentExecutionRequest,
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
		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
			return this.errorResult(`Agent ${agentId} not found or not accessible`);
		}

		const agentEntity = await Container.get(AgentRepository).findByIdAndProjectId(
			agentId,
			projectId,
		);
		if (!agentEntity) {
			return this.errorResult(`Agent ${agentId} not found or not accessible`);
		}
		if (!agentEntity.schema) {
			return this.errorResult(`Agent ${agentId} has no JSON config to run.`);
		}

		const { config, skippedFeatures } = pruneConfigForEval(agentEntity.schema);
		if ((agentEntity.integrations ?? []).length > 0) {
			skippedFeatures.push({
				feature: 'integrations',
				reason:
					'Chat integrations are not attached in eval runs — the harness drives the agent directly.',
			});
		}
		// The entity is detached (never saved back); mutate the copy the
		// runtime is built from so pruning applies to reconstruction too.
		agentEntity.schema = config;
		agentEntity.integrations = [];

		const toolSummaries = summarizeTools(config, agentEntity.tools ?? {}, sanitizeToolName);

		let seed: InstanceAiEvalAgentScenarioSeed;
		try {
			seed = await generateAgentScenarioSeed({
				agentName: config.name,
				instructions: config.instructions,
				tools: toolSummaries,
				scenarioHints: options.scenarioHints,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return this.errorResult(
				message.startsWith('FRAMEWORK ISSUE:') ? message : `FRAMEWORK ISSUE: ${message}`,
			);
		}

		const mockHandler = createLlmMockHandler({
			scenarioHints: options.scenarioHints,
			globalContext: seed.globalContext,
			nodeHints: seed.toolHints,
		});

		const toolLedger: ToolLedger = new Map();
		const credentialHelpers: EvalMockedCredentialsHelper[] = [];
		const recorder = createAgentModelTurnRecorder(
			createAiProxyFetch(this.outboundHttp),
			this.logger,
		);

		// Mock MCP server; ledger keys use the client-side `<server>_<tool>`
		// names so entries merge with GenerateResult's tool calls. Always
		// created — delegated sub-agents may bring their own servers.
		const mcpServers = config.mcpServers ?? [];
		const knownToolsByServer = await this.resolveCanonicalMcpCatalogs(mcpServers);
		const mcpFetch = createMcpMockFetch({
			servers: mcpServers.map((server) => ({
				name: server.name,
				url: server.url,
				description: server.description,
			})),
			agentInstructions: config.instructions,
			scenarioHints: options.scenarioHints,
			globalContext: seed.globalContext,
			serverHints: seed.toolHints,
			knownToolsByServer,
			logger: this.logger,
			onToolCall: (call) => {
				const key = `${call.serverName}_${call.toolName}`;
				let entries = toolLedger.get(key);
				if (!entries) {
					entries = [];
					toolLedger.set(key, entries);
				}
				entries.push({
					url: mcpServers.find((server) => server.name === call.serverName)?.url ?? call.serverName,
					method: 'POST',
					nodeType: `mcp:${call.serverName}`,
					requestBody: call.args,
					mockResponse: call.result,
				});
			},
		});

		// Fallback web_search mock — always created (sub-agents may enable web
		// search); with native search the tool is never built and this goes unused.
		const webSearchMock = createWebSearchMock({
			agentInstructions: config.instructions,
			scenarioHints: options.scenarioHints,
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
			},
		});

		const reconstruction = Container.get(AgentRuntimeReconstructionService);
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);

		let agent: RuntimeAgent;
		try {
			({ agent } = await reconstruction.reconstructFromAgentEntity(
				agentEntity,
				credentialProvider,
				undefined,
				user,
				{
					modelFetch: recorder.fetch,
					mcpFetch,
					webSearch: webSearchMock,
					// Delegated (configured) sub-agents inherit every seam above; their
					// configs get the same pruning, reported under the child's id.
					transformDelegatedAgentConfig: (childConfig, delegationContext) => {
						const pruned = pruneConfigForEval(childConfig);
						skippedFeatures.push(
							...pruned.skippedFeatures.map((skip) => ({
								...skip,
								feature: `subAgent ${delegationContext.subAgentId}: ${skip.feature}`,
							})),
						);
						return pruned.config;
					},
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
						);
					},
				},
			));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return this.errorResult(`Failed to build agent runtime: ${message}`, seed, skippedFeatures);
		}

		const errors: string[] = [];
		// GenerateResult.toolCalls carry no toolCallId — approvals are attributed
		// by tool name, enough to flag auto-approval for the judge.
		const autoApprovedToolNames = new Set<string>();
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const maxIterations = Math.min(
			config.config?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
			MAX_ITERATIONS_CAP,
		);

		let result: GenerateResult;
		// Each resume returns its own GenerateResult segment — collect tool
		// calls across all of them so pre-suspension calls aren't lost.
		const segmentToolCalls: NonNullable<GenerateResult['toolCalls']> = [];
		const collectToolCalls = (segment: GenerateResult) => {
			for (const entry of segment.toolCalls ?? []) {
				if (!segmentToolCalls.includes(entry)) segmentToolCalls.push(entry);
			}
		};
		try {
			const abortSignal = AbortSignal.timeout(timeoutMs);
			result = await agent.generate(seed.openingMessage, { abortSignal, maxIterations });
			collectToolCalls(result);

			// Approval-gated tools suspend the run. In real usage the user
			// approves in the UI; the eval happy-path stands in for them, and
			// flags every call it approved.
			let approvals = 0;
			while (approvals < MAX_AUTO_APPROVALS) {
				const pending = result.pendingSuspend?.[0];
				if (!pending) break;
				autoApprovedToolNames.add(pending.toolName);
				approvals++;
				result = await agent.approve('generate', {
					runId: pending.runId,
					toolCallId: pending.toolCallId,
					abortSignal,
					maxIterations,
				});
				collectToolCalls(result);
			}
			if ((result.pendingSuspend?.length ?? 0) > 0) {
				errors.push(`Run still suspended after ${MAX_AUTO_APPROVALS} auto-approvals`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			// Flush so the failure result carries the recorded response bodies too.
			await recorder.flush();
			return this.errorResult(`Agent run failed: ${message}`, seed, skippedFeatures, {
				modelTurns: recorder.turns,
				toolLedger,
				credentialHelpers,
			});
		} finally {
			await recorder.flush();
			try {
				await agent.close();
			} catch (error) {
				this.logger.warn('[EvalAgentMock] Agent runtime teardown failed', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
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
			(mcpServers.some((server) => tool.startsWith(`${server.name}_`)) ||
			(toolLedger.get(tool) ?? []).some((request) => request.nodeType?.startsWith('mcp:'))
				? 'mcp'
				: 'other');
		const toolCalls = segmentToolCalls.map((entry): InstanceAiEvalAgentToolCallRecord => {
			const interceptedRequests = toolLedger.get(entry.tool) ?? [];
			return {
				tool: entry.tool,
				kind: kindForTool(entry.tool),
				input: truncateRecordedValue(entry.input),
				output: truncateRecordedValue(entry.output),
				...(entry.canceled ? { error: 'canceled' } : {}),
				mocked: interceptedRequests.length > 0,
				interceptedRequests,
				...(autoApprovedToolNames.has(entry.tool) ? { autoApproved: true } : {}),
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
	 * Resolve canonical tool catalogs for configured MCP servers, so the mock
	 * exposes the tools the real server would: registry entries carry the
	 * server's declared catalog (matched by remote URL), and an allow-mode
	 * toolFilter pins names even without a registry match. Best-effort —
	 * without a match the mock's LLM-designed catalog applies.
	 */
	private async resolveCanonicalMcpCatalogs(
		mcpServers: NonNullable<AgentJsonConfig['mcpServers']>,
	): Promise<Record<string, McpMockCanonicalTool[]> | undefined> {
		if (mcpServers.length === 0) return undefined;
		const result: Record<string, McpMockCanonicalTool[]> = {};

		if (this.moduleRegistry.isActive('mcp-registry')) {
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
				this.logger.debug(
					`[EvalAgentMock] MCP registry catalog lookup failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		for (const server of mcpServers) {
			if (result[server.name]) continue;
			if (server.toolFilter?.mode === 'allow' && server.toolFilter.tools.length > 0) {
				result[server.name] = server.toolFilter.tools.map((name) => ({
					name,
					description: name,
				}));
			}
		}

		return Object.keys(result).length > 0 ? result : undefined;
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
				mockResponse: response?.body,
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

// ---------------------------------------------------------------------------
// Config pruning
// ---------------------------------------------------------------------------

/**
 * Strip the config features the eval mock layer can't serve yet. Each removal
 * is reported so the judge (and anyone debugging) can see the run diverged
 * from the authored config, and why.
 */
export function pruneConfigForEval(original: AgentJsonConfig): {
	config: AgentJsonConfig;
	skippedFeatures: InstanceAiEvalAgentSkippedFeature[];
} {
	const skippedFeatures: InstanceAiEvalAgentSkippedFeature[] = [];
	const config: AgentJsonConfig = { ...original };

	if (config.memory?.enabled) {
		skippedFeatures.push({
			feature: 'memory',
			reason:
				'Observational/episodic memory worker models and embeddings are not mockable yet — memory is disabled for the run.',
		});
		config.memory = undefined;
	}

	if ((config.vectorStores?.length ?? 0) > 0) {
		skippedFeatures.push({
			feature: 'vectorStores',
			reason: 'Vector stores use native DB clients the mock layer cannot intercept.',
		});
		config.vectorStores = undefined;
	}

	// Streamable-HTTP MCP servers are served by the mock MCP fetch; only the
	// non-default SSE transport (stateful long-lived stream) stays unmockable.
	const sseServers = (config.mcpServers ?? []).filter((server) => server.transport === 'sse');
	if (sseServers.length > 0) {
		skippedFeatures.push({
			feature: 'mcpServers (sse transport)',
			reason: `SSE-transport MCP servers are not mockable yet (streamable-HTTP ones are): ${sseServers.map((server) => server.name).join(', ')}.`,
		});
		const remaining = (config.mcpServers ?? []).filter((server) => server.transport !== 'sse');
		config.mcpServers = remaining.length > 0 ? remaining : undefined;
	}

	// Configured sub-agents stay: the delegated child inherits the run's
	// instrumentation and its config is pruned by the same rules via
	// `transformDelegatedAgentConfig`. Web search stays too: the native
	// variant runs inside the real model call and the fallback tool is served
	// by the web-search mock.

	return { config, skippedFeatures };
}

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

export function summarizeTools(
	config: AgentJsonConfig,
	customTools: NonNullable<AgentEntity['tools']>,
	sanitizeWorkflowToolName: (name: string) => string,
): AgentSeedToolSummary[] {
	const summaries: AgentSeedToolSummary[] = [];
	for (const ref of config.tools ?? []) {
		if (ref.type === 'node') {
			summaries.push({
				name: nodeNameToToolName(ref.name),
				kind: 'node',
				description: ref.description,
				nodeType: ref.node.nodeType,
			});
		} else if (ref.type === 'workflow') {
			summaries.push({
				name: sanitizeWorkflowToolName(ref.name ?? ref.workflow),
				kind: 'workflow',
				description: ref.description,
			});
		} else {
			const descriptor = customTools[ref.id]?.descriptor;
			if (descriptor) {
				summaries.push({
					name: descriptor.name,
					kind: 'custom',
					description: descriptor.description,
				});
			}
		}
	}
	// MCP servers are summarized by SERVER name — the seed's hint for that name
	// steers both the generated tool catalog and every tool result it serves.
	for (const server of config.mcpServers ?? []) {
		summaries.push({
			name: server.name,
			kind: 'mcp',
			description: server.description ?? `MCP tool server at ${server.url}`,
		});
	}
	// The fallback web_search tool is served by the web-search mock; a hint
	// keyed by its name steers the generated result sets. Native web search
	// runs inside the real model call and needs no hint.
	if (
		config.config?.webSearch?.enabled &&
		!(isNativeWebSearchRequested(config) && hasNativeWebSearchProvider(config.model))
	) {
		summaries.push({
			name: 'web_search',
			kind: 'other',
			description: 'Web search returning {title, url, snippet} result lists',
		});
	}
	return summaries;
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
	for (let i = result.messages.length - 1; i >= 0; i--) {
		const message = result.messages[i];
		if (!('role' in message) || message.role !== 'assistant') continue;
		const texts = message.content
			.filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
			.map((part) => part.text)
			.filter((text) => text.trim().length > 0);
		if (texts.length > 0) return texts.join('\n');
	}
	return '';
}
