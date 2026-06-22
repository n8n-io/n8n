import { Agent, Memory } from '@n8n/agents';

import { applyAgentThinking } from './apply-agent-thinking';
import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from './mcp-tool-name-validation';
import { attachRuntimeWorkspaceCapabilities } from './runtime-workspace';
import { getSystemPrompt } from './system-prompt';
import { hasRuntimeSkills } from '../skills/runtime-skills';
import { createToolRegistry, mergeToolRegistries, toolRegistryValues } from '../tool-registry';
import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { ALWAYS_LOADED_TOOL_NAMES, CHECKPOINT_FOLLOW_UP_TOOL_NAMES } from '../tools/tool-ids';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions, InstanceAiToolRegistry } from '../types';

// ── Agent factory ───────────────────────────────────────────────────────────

function splitDeferredTools(
	tools: InstanceAiToolRegistry,
	options: { isCheckpointFollowUp?: boolean } = {},
) {
	const coreTools = createToolRegistry();
	const deferredTools = createToolRegistry();

	for (const [name, tool] of tools) {
		if (
			ALWAYS_LOADED_TOOL_NAMES.has(name) ||
			(options.isCheckpointFollowUp && CHECKPOINT_FOLLOW_UP_TOOL_NAMES.has(name))
		) {
			coreTools.set(name, tool);
		} else {
			deferredTools.set(name, tool);
		}
	}

	return { coreTools, deferredTools };
}

export async function createInstanceAgent(options: CreateInstanceAgentOptions): Promise<Agent> {
	const {
		modelId,
		context,
		orchestrationContext,
		mcpServers = [],
		mcpManager,
		memoryConfig,
	} = options;

	// Build native n8n domain tools (context captured via closures — per-run)
	const domainTools = createAllTools(context);
	const orchestratorDomainTools = createOrchestratorDomainTools(context);

	// Load MCP tools (cached by config hash inside the manager — only spawns
	// processes / opens connections on first call or config change).
	const requireMcpToolApproval = context.permissions?.executeMcpTool !== 'always_allow';
	const mcpTools = await mcpManager.getRegularTools(
		mcpServers,
		context.logger,
		requireMcpToolApproval,
	);
	const rawLocalMcpTools = context.localMcpServer
		? createToolsFromLocalMcpServer(context.localMcpServer, context.logger)
		: createToolRegistry();

	const browserToolNames = new Set(
		context.localMcpServer?.getToolsByCategory('browser').map((tool) => tool.name) ?? [],
	);

	const warnSkippedMcpTool = (error: McpToolNameValidationError) => {
		context.logger.warn('Skipped MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};

	// Build orchestration tools (plan, delegate) — orchestrator-only.
	const orchestrationTools = orchestrationContext
		? createOrchestrationTools(orchestrationContext)
		: createToolRegistry();

	// Keep MCP tools from shadowing domain or orchestration tools during object composition.
	const reservedToolNames = new Set([...domainTools.keys(), ...orchestrationTools.keys()]);

	// Store all MCP tools on orchestrationContext for sub-agents.
	const allMcpTools = createToolRegistry();
	const mcpContextToolNames = createClaimedToolNames(reservedToolNames);
	addSafeMcpTools(allMcpTools, rawLocalMcpTools, {
		source: 'local gateway MCP',
		claimedToolNames: mcpContextToolNames,
		warn: warnSkippedMcpTool,
	});
	addSafeMcpTools(allMcpTools, mcpTools, {
		source: 'external MCP',
		claimedToolNames: mcpContextToolNames,
		warn: warnSkippedMcpTool,
	});
	if (orchestrationContext && allMcpTools.size > 0) {
		orchestrationContext.mcpTools = allMcpTools;
	}

	const claimedOrchestratorToolNames = createClaimedToolNames(reservedToolNames);
	const safeLocalMcpTools = createToolRegistry();
	addSafeMcpTools(safeLocalMcpTools, rawLocalMcpTools, {
		source: 'local gateway MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});
	const safeMcpTools = createToolRegistry();
	addSafeMcpTools(safeMcpTools, mcpTools, {
		source: 'external MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});

	const allOrchestratorTools = mergeToolRegistries(
		orchestratorDomainTools,
		orchestrationTools,
		safeLocalMcpTools,
		safeMcpTools,
	);
	const tracedOrchestratorTools =
		orchestrationContext?.tracing?.wrapTools(allOrchestratorTools, {
			agentRole: 'orchestrator',
			tags: ['orchestrator'],
		}) ?? allOrchestratorTools;
	const { coreTools, deferredTools } = splitDeferredTools(tracedOrchestratorTools, {
		isCheckpointFollowUp: orchestrationContext?.isCheckpointFollowUp,
	});
	const hasDeferrableTools = !options.disableDeferredTools && deferredTools.size > 0;
	const runtimeTools = hasDeferrableTools ? coreTools : tracedOrchestratorTools;
	const systemPrompt = getSystemPrompt({
		webhookBaseUrl: orchestrationContext?.webhookBaseUrl,
		formBaseUrl: orchestrationContext?.formBaseUrl,
		localGateway: context.localGatewayStatus,
		toolSearchEnabled: hasDeferrableTools,
		licenseHints: context.licenseHints,
		browserAvailable: browserToolNames.size > 0,
		branchReadOnly: context.branchReadOnly,
		workspaceRoot:
			orchestrationContext?.workspace && orchestrationContext.workspaceRoot
				? orchestrationContext.workspaceRoot
				: undefined,
	});

	const telemetry = orchestrationContext?.tracing?.getTelemetry?.({
		agentRole: 'orchestrator',
		functionId: 'instance-ai.orchestrator',
		executionMode: 'foreground',
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
	if (options.thinkingEnabled !== false) {
		applyAgentThinking(agent, modelId);
	}
	if (hasDeferrableTools) {
		agent.deferredTool(toolRegistryValues(deferredTools), { search: { topK: 5 } });
	}
	const runtimeSkills = orchestrationContext?.runtimeSkills;
	if (hasRuntimeSkills(runtimeSkills)) {
		agent.skills(runtimeSkills);
	}
	if (telemetry) {
		agent.telemetry(telemetry);
	}
	attachRuntimeWorkspaceCapabilities(agent, {
		workspace: orchestrationContext?.workspace,
		runtimeSkills: orchestrationContext?.runtimeSkills,
	});

	if (options.memory) {
		const mem = new Memory().storage(options.memory);

		if (memoryConfig.observationalMemory) {
			const { observerThresholdTokens, reflectorThresholdTokens } =
				memoryConfig.observationalMemory;
			mem.observationalMemory({
				observerThresholdTokens,
				reflectorThresholdTokens,
			});
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
			inputProcessors: hasDeferrableTools ? ['NativeToolSearch'] : undefined,
			runtimeSkills: runtimeSkills?.registry,
		}),
	);

	return agent;
}
