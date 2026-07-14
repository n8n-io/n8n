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
import type { Agent as AgentEntity } from '@/modules/agents/entities/agent.entity';
import { userHasScopes } from '@/permissions.ee/check-access';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { createAgentModelTurnRecorder } from './agent-model-turn-recorder';
import { generateAgentScenarioSeed, type AgentSeedToolSummary } from './agent-scenario-seed';
import { EvalMockedCredentialsHelper } from './eval-mocked-credentials-helper';
import { createLlmMockHandler } from './mock-handler';
import { truncateForLlm } from './request-sanitizer';

// ---------------------------------------------------------------------------
// Runs a built first-class Agent for ONE scenario turn:
//   - the agent's own model call is REAL (builder-chosen model, keys from the
//     seeded credentials) and recorded via a passthrough fetch;
//   - node-tool and workflow-tool HTTP is intercepted at the same engine
//     choke points the workflow eval uses (`evalLlmMockHandler` on the tools'
//     additionalData) with LLM-generated responses;
//   - features the mock layer can't serve yet (memory, vector stores, MCP,
//     configured sub-agents, chat integrations, fallback web search) are
//     pruned from a config copy and reported as `skippedFeatures`.
// The runtime is built UNCACHED (never through AgentRuntimeCacheService) so an
// instrumented runtime can never leak into a normal chat run.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_MAX_ITERATIONS = 25;
const MAX_ITERATIONS_CAP = 40;
const MAX_AUTO_APPROVALS = 20;
const MAX_RECORDED_TOOL_VALUE_CHARS = 4_000;

type ToolLedger = Map<string, InstanceAiEvalInterceptedRequest[]>;

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
		// Workflow tools run sub-executions through WorkflowRunner with a
		// configureAdditionalData closure that doesn't survive queue
		// serialization — refuse upfront so tool HTTP can never leak to real
		// services from a worker that never wired the mock.
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

		// Lazy-load the agents module surface: this path only runs for eval
		// requests, and the module gate above already vouched for availability.
		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository');
		const { AgentRuntimeReconstructionService } = await import(
			'@/modules/agents/agent-runtime-reconstruction.service'
		);
		const { createAgentCredentialProvider } = await import(
			'@/modules/agents/utils/agent-credential-provider'
		);
		const { sanitizeToolName } = await import(
			'@/modules/agents/json-config/agent-config-composition'
		);

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
		// GenerateResult.toolCalls entries carry no toolCallId, so approvals are
		// attributed by tool name — good enough to flag "this tool's calls were
		// auto-approved" for the judge.
		const autoApprovedToolNames = new Set<string>();
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const maxIterations = Math.min(
			config.config?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
			MAX_ITERATIONS_CAP,
		);

		let result: GenerateResult;
		try {
			const abortSignal = AbortSignal.timeout(timeoutMs);
			result = await agent.generate(seed.openingMessage, { abortSignal, maxIterations });

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
			}
			if ((result.pendingSuspend?.length ?? 0) > 0) {
				errors.push(`Run still suspended after ${MAX_AUTO_APPROVALS} auto-approvals`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return this.errorResult(`Agent run failed: ${message}`, seed, skippedFeatures, {
				modelTurns: recorder.turns,
				toolLedger,
				credentialHelpers,
			});
		} finally {
			try {
				await agent.close();
			} catch (error) {
				this.logger.warn('[EvalAgentMock] Agent runtime teardown failed', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		await recorder.flush();

		if (result.error !== undefined) {
			errors.push(
				`Model run error: ${result.error instanceof Error ? result.error.message : String(result.error)}`,
			);
		}

		const kindByToolName = new Map(toolSummaries.map((tool) => [tool.name, tool.kind]));
		const toolCalls = (result.toolCalls ?? []).map((entry): InstanceAiEvalAgentToolCallRecord => {
			const interceptedRequests = toolLedger.get(entry.tool) ?? [];
			return {
				tool: entry.tool,
				kind: kindByToolName.get(entry.tool) ?? 'other',
				input: truncateRecordedValue(entry.input),
				output: truncateRecordedValue(entry.output),
				...(entry.canceled ? { error: 'canceled' } : {}),
				mocked: interceptedRequests.length > 0,
				interceptedRequests,
				...(autoApprovedToolNames.has(entry.tool) ? { autoApproved: true } : {}),
			};
		});
		// GenerateResult.toolCalls omits errored calls (node tools throw on
		// failure), but their intercepted HTTP is exactly what the judge needs
		// to verify the attempt (e.g. an injected channel_not_found). Surface
		// ledger-only tools as explicit error records.
		const reportedTools = new Set(toolCalls.map((entry) => entry.tool));
		for (const [tool, interceptedRequests] of toolLedger) {
			if (reportedTools.has(tool)) continue;
			toolCalls.push({
				tool,
				kind: kindByToolName.get(tool) ?? 'other',
				error: 'Tool call failed (not reported in the run result — see interceptedRequests)',
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
						kind: 'other' as const,
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

	if ((config.mcpServers?.length ?? 0) > 0) {
		skippedFeatures.push({
			feature: 'mcpServers',
			reason: 'MCP servers are not mockable yet (JSON-RPC mock envelope pending).',
		});
		config.mcpServers = undefined;
	}

	if ((config.subAgents?.agents?.length ?? 0) > 0) {
		skippedFeatures.push({
			feature: 'subAgents',
			reason:
				'Configured sub-agents do not propagate the mock context yet; inline delegation remains available and mocked.',
		});
		config.subAgents = undefined;
	}

	if (config.config?.webSearch?.enabled) {
		// Provider-native web search executes server-side within the real model
		// call and stays enabled; only the fallback tool (a live Brave/SearXNG
		// call with a placeholder key) is stripped.
		const nativeCapable =
			isNativeWebSearchRequested(config) && hasNativeWebSearchProvider(config.model);
		if (!nativeCapable) {
			skippedFeatures.push({
				feature: 'webSearch',
				reason:
					'Fallback web search would make live calls with a placeholder credential — disabled for the run.',
			});
			config.config = { ...config.config, webSearch: undefined };
		}
	}

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
