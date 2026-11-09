import {
	Agent,
	createObservationLogObserveFn,
	createObservationLogReflectFn,
	extendRuntimeSkillSource,
	Memory,
} from '@n8n/agents';
import { SPLIT_BUILDER_TOOLS } from '@n8n/api-types';

import { applyAgentThinking } from './apply-agent-thinking';
import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from './mcp-tool-name-validation';
import { listConnectedMcpServices } from '../mcp/connected-mcp-services';
import { getVersionedSystemPrompt, resolvePromptProfile } from '../prompts/prompt-profiles';
import { createGotchaNotesProvider } from '../skills/gotcha-notes';
import { INTENT_RECOGNITION_GOTCHAS } from '../skills/gotchas/intent-recognition.gotchas';
import { POST_BUILD_FLOW_GOTCHAS } from '../skills/gotchas/post-build-flow.gotchas';
import { WORKFLOW_BUILDER_GOTCHAS } from '../skills/gotchas/workflow-builder.gotchas';
import { parseAblatedGotchas } from '../skills/skill-gotchas';
import { createToolRegistry, mergeToolRegistries, toolRegistryValues } from '../tool-registry';
import {
	createOrchestratorDomainTools,
	createOrchestrationTools,
	getActiveOrchestratorDomainToolNames,
} from '../tools';
import { createToolsFromLocalMcpServer } from '../tools/create-tools-from-mcp-server';
import {
	ALWAYS_LOADED_TOOL_NAMES,
	getToolNamespace,
	getToolNamespaceDescription,
} from '../tools/tool-ids';
import { isSetupPanelEnabled } from '../tools/workflows/setup-items';
import {
	buildAgentTraceInputs,
	mergeTraceRunInputs,
	modelIdTraceMetadata,
	setTraceModelId,
	setTracePromptVersion,
} from '../tracing/langsmith-tracing';
import type {
	CreateInstanceAgentOptions,
	InstanceAiContext,
	InstanceAiToolRegistry,
	ModelConfig,
} from '../types';
import { withModalSession } from '../utils/modal-session';

function resolveModalSessionModelId(
	modelId: ModelConfig,
	context: InstanceAiContext,
	orchestrationThreadId: string | undefined,
): ModelConfig {
	const threadId = [context.threadId, orchestrationThreadId]
		.map((value) => value?.trim())
		.find((value): value is string => value !== undefined && value.length > 0);
	if (!threadId) return modelId;

	const stickyModelId = withModalSession(modelId, threadId);
	if (stickyModelId === modelId) return modelId;

	context.modelId = stickyModelId;
	return stickyModelId;
}

// ── Agent factory ───────────────────────────────────────────────────────────

function splitDeferredTools(tools: InstanceAiToolRegistry) {
	const coreTools = createToolRegistry();
	const deferredTools = createToolRegistry();

	for (const [name, tool] of tools) {
		if (ALWAYS_LOADED_TOOL_NAMES.has(name)) {
			coreTools.set(name, tool);
		} else {
			deferredTools.set(name, tool);
		}
	}

	return { coreTools, deferredTools };
}

export async function createInstanceAgent(
	options: CreateInstanceAgentOptions,
): Promise<{ agent: Agent; mcpConnectionFailures: Array<{ server: string; error: string }> }> {
	const {
		modelId: rawModelId,
		context,
		orchestrationContext,
		mcpServers = [],
		mcpManager,
		memoryConfig,
	} = options;

	const modelId = resolveModalSessionModelId(rawModelId, context, orchestrationContext?.threadId);
	if (orchestrationContext && orchestrationContext.modelId !== modelId) {
		orchestrationContext.modelId = modelId;
	}

	// Thread the trace handle in so domain tools (e.g. workflow_builder_build_workflow) can emit
	// explicit child runs that land on the active trace — orchestration tools
	// (e.g. verify) already get it via OrchestrationContext.
	const domainContext: InstanceAiContext = {
		...context,
		tracing: orchestrationContext?.tracing,
	};
	if (orchestrationContext) {
		orchestrationContext.domainContext = domainContext;
	}
	// Load MCP tools (cached by config hash inside the manager — only spawns
	// processes / opens connections on first call or config change). The manager
	// returns per-server connection failures alongside the tools so they travel
	// with this call (not shared mutable state) — concurrent runs with different
	// configs can't read each other's failures.
	const { tools: mcpTools, connectionFailures: managerMcpFailures } =
		await mcpManager.getRegularTools(mcpServers, context.logger, context.permissions);
	// Map manager-reported connection failures to the generic SDK event type so
	// the runtime can inject a model-facing note into the orchestrator's system
	// message. The adapter owns the n8n-specific server config → plain SDK event
	// translation; the SDK runtime does the rest.
	const mcpConnectionFailures = managerMcpFailures.map((f) => ({
		server: f.server.name,
		error: f.error,
	}));
	const browserCredentialSetup = context.browserCredentialSetup;
	const rawLocalMcpTools = context.localMcpServer
		? createToolsFromLocalMcpServer({
				server: context.localMcpServer,
				logger: context.logger,
				onCredentialCreateResult: browserCredentialSetup
					? (credentialType, outcome) => {
							if (outcome.ok) browserCredentialSetup.markCreated(credentialType);
							else browserCredentialSetup.markCreateFailed(credentialType, outcome.errorCode);
						}
					: undefined,
			})
		: createToolRegistry();

	const warnSkippedMcpTool = (error: McpToolNameValidationError) => {
		context.logger.warn('Skipped MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};

	// Build orchestration tools — orchestrator-only.
	const orchestrationTools = orchestrationContext
		? createOrchestrationTools(orchestrationContext)
		: createToolRegistry();

	// Keep MCP tools from shadowing domain or orchestration tools. Former split tool
	// names stay reserved so persisted calls still resolve through their legacy actions.
	const reservedToolNames = new Set<string>([
		...getActiveOrchestratorDomainToolNames(domainContext),
		...orchestrationTools.keys(),
		...Object.keys(SPLIT_BUILDER_TOOLS),
	]);

	const claimedOrchestratorToolNames = createClaimedToolNames(reservedToolNames);
	const safeLocalMcpTools = createToolRegistry();
	addSafeMcpTools(safeLocalMcpTools, rawLocalMcpTools, {
		source: 'Browser Use MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});
	const safeMcpTools = createToolRegistry();
	addSafeMcpTools(safeMcpTools, mcpTools, {
		source: 'external MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});
	if (orchestrationContext) {
		const builderMcpTools = mergeToolRegistries(safeLocalMcpTools, safeMcpTools);
		if (builderMcpTools.size > 0) orchestrationContext.mcpTools = builderMcpTools;
	}

	domainContext.connectedMcpServices = listConnectedMcpServices(mcpServers, safeMcpTools);
	const orchestratorDomainTools = createOrchestratorDomainTools(domainContext);

	const allOrchestratorTools = mergeToolRegistries(
		orchestratorDomainTools,
		orchestrationTools,
		safeLocalMcpTools,
		safeMcpTools,
	);
	for (const name of orchestrationContext?.disabledToolNames ?? [])
		allOrchestratorTools.delete(name);
	const tracedOrchestratorTools =
		orchestrationContext?.tracing?.wrapTools(allOrchestratorTools, {
			agentRole: 'orchestrator',
			tags: ['orchestrator'],
		}) ?? allOrchestratorTools;
	const { coreTools, deferredTools } = splitDeferredTools(tracedOrchestratorTools);
	const hasDeferrableTools = !options.disableDeferredTools && deferredTools.size > 0;
	const hasDeferredExternalMcpTools =
		hasDeferrableTools && Array.from(safeMcpTools.keys()).some((name) => deferredTools.has(name));
	const runtimeTools = hasDeferrableTools ? coreTools : tracedOrchestratorTools;
	const systemPrompt = getVersionedSystemPrompt(
		orchestrationContext?.promptConfiguration?.systemPromptVersion ??
			resolvePromptProfile({}).profile.systemPromptVersion,
		{
			browserUseState: context.browserUseState,
			toolSearchEnabled: hasDeferrableTools,
			mcpToolSearchEnabled: hasDeferredExternalMcpTools,
			licenseHints: context.licenseHints,
			branchReadOnly: context.branchReadOnly,
			parameterValuesHidden: context.allowSendingParameterValues === false,
			projectId: context.projectId,
			// Presence of the service IS the experiment gate — the host only wires it
			// for flagged-in users on project-bound runs.
			conversationHistoryEnabled: Boolean(context.conversationHistoryService),
			preferenceSavingEnabled: Boolean(context.aiPreferenceService),
			skillManagementEnabled: Boolean(context.skillService),
			setupPanelEnabled: isSetupPanelEnabled(context),
			workspaceRoot:
				orchestrationContext?.workspace && orchestrationContext.workspaceRoot
					? orchestrationContext.workspaceRoot
					: undefined,
		},
	);

	setTracePromptVersion(
		orchestrationContext?.tracing,
		orchestrationContext?.promptConfiguration?.version,
	);
	setTraceModelId(orchestrationContext?.tracing, modelId);
	const functionId = 'instance-ai.orchestrator';
	const telemetry = orchestrationContext?.tracing?.getTelemetry?.({
		agentRole: 'orchestrator',
		functionId,
		executionMode: 'foreground',
		metadata: modelIdTraceMetadata(modelId),
	});
	const agent = new Agent('n8n-instance-agent')
		.model(modelId)
		.instructions(systemPrompt, {
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		})
		.tool(toolRegistryValues(runtimeTools))
		.checkpoint(options.checkpointStore ?? 'memory');
	if (mcpConnectionFailures.length > 0) {
		agent.mcpConnectionFailures(mcpConnectionFailures);
	}
	if (options.modelFetch) agent.modelFetch(options.modelFetch);
	if (options.requestLabels) agent.functionId(functionId);
	if (options.thinkingEnabled !== false) {
		applyAgentThinking(agent, modelId);
	}
	if (hasDeferrableTools) {
		// Catalog mode keeps the toolset fixed for the whole run, so the prompt cache
		// survives, and a deferred tool costs one call_tool call instead of a load step.
		agent.toolDeferral({ mode: 'catalog' });
		// MCP tools are listed under their server and n8n tools under their resource
		// (workflows, data_tables, agents, ...), so the model can browse one area
		// with find_tools({ namespace }) instead of searching the whole set.
		const byNamespace = new Map<string | undefined, InstanceAiToolRegistry>();
		for (const [name, tool] of deferredTools) {
			const namespace = tool.mcpServerName ?? getToolNamespace(name);
			const group = byNamespace.get(namespace) ?? createToolRegistry();
			group.set(name, tool);
			byNamespace.set(namespace, group);
		}
		for (const [namespace, group] of byNamespace) {
			const namespaceDescription = namespace
				? (getToolNamespaceDescription(namespace) ?? `tools from the ${namespace} MCP server`)
				: undefined;
			agent.deferredTool(
				toolRegistryValues(group),
				namespace ? { namespace, namespaceDescription } : undefined,
			);
		}
	}
	// The agents module owns the builder skills that are generated from its config schema.
	const builderSkills = context.builderDelegate?.getRuntimeSkills() ?? [];
	const baseSkills = orchestrationContext?.skills;
	const skills =
		baseSkills && builderSkills.length > 0
			? extendRuntimeSkillSource(baseSkills, builderSkills)
			: baseSkills;
	if (telemetry) {
		agent.telemetry(telemetry);
	}
	if (orchestrationContext?.workspace) agent.workspace(orchestrationContext.workspace);
	if (skills) agent.skills(skills);
	if (skills) {
		const threshold = Number(process.env.N8N_INSTANCE_AI_GOTCHA_THRESHOLD);
		agent.contextNotes(
			createGotchaNotesProvider({
				sets: [WORKFLOW_BUILDER_GOTCHAS, INTENT_RECOGNITION_GOTCHAS, POST_BUILD_FLOW_GOTCHAS],
				embeddingModel: options.gotchaRetrieval?.embeddingModel,
				onRetrieval: options.gotchaRetrieval?.onRetrieval,
				onEmbeddingFailure: (error) =>
					context.logger.warn('Gotcha embedding failed; ranking gotchas with BM25 for this run', {
						error: error instanceof Error ? error.message : String(error),
					}),
				// Eval-only overrides: tune the threshold and ablate gotchas without a code change.
				threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
				ablated: parseAblatedGotchas(process.env.N8N_INSTANCE_AI_SKILL_ABLATE),
			}),
		);
	}

	if (options.memory) {
		const mem = new Memory().storage(options.memory);

		if (memoryConfig.observationalMemory) {
			const {
				observerThresholdTokens,
				reflectorThresholdTokens,
				midRunObservation,
				onTaskUsage,
				model: memoryModel,
			} = memoryConfig.observationalMemory;
			const taskModel = memoryModel ?? modelId;
			mem.observationalMemory({
				observerThresholdTokens,
				reflectorThresholdTokens,
				...(midRunObservation !== undefined ? { midRunObservation } : {}),
				...(onTaskUsage || memoryModel
					? {
							observe: createObservationLogObserveFn(taskModel, { onUsage: onTaskUsage }),
							reflect: createObservationLogReflectFn(taskModel, { onUsage: onTaskUsage }),
						}
					: {}),
			});
		}

		if (memoryConfig.titleGeneration) {
			mem.titleGeneration({ ...memoryConfig.titleGeneration });
		}

		agent.memory(mem);
	}
	if (options.onMemoryTaskEvent) {
		agent.memoryTaskObserver(options.onMemoryTaskEvent);
	}
	mergeTraceRunInputs(
		orchestrationContext?.tracing?.actorRun,
		buildAgentTraceInputs({
			systemPrompt,
			promptConfiguration: orchestrationContext?.promptConfiguration,
			tools: runtimeTools,
			deferredTools: hasDeferrableTools ? deferredTools : undefined,
			modelId,
			memory: options.memory
				? {
						...(memoryConfig.observationalMemory
							? {
									observationalMemory: {
										enabled: true,
										observerThresholdTokens:
											memoryConfig.observationalMemory.observerThresholdTokens,
										reflectorThresholdTokens:
											memoryConfig.observationalMemory.reflectorThresholdTokens,
									},
								}
							: {}),
					}
				: undefined,
			toolSearchEnabled: hasDeferrableTools,
			inputProcessors: hasDeferrableTools ? ['ToolCatalog'] : undefined,
			skills: skills?.registry,
		}),
	);

	return { agent, mcpConnectionFailures };
}
