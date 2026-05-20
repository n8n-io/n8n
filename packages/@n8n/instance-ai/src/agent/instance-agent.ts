import { Agent } from '@n8n/agents';

import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from './mcp-tool-name-validation';
import { getSystemPrompt } from './system-prompt';
import {
	createToolRegistry,
	filterToolRegistry,
	mergeToolRegistries,
	toolRegistryValues,
} from '../tool-registry';
import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions, InstanceAiToolRegistry } from '../types';

// ── Agent factory ───────────────────────────────────────────────────────────

const ALWAYS_LOADED_TOOLS = new Set([
	'plan',
	'create-tasks',
	'delegate',
	'ask-user',
	'credentials',
	'workflows',
	'build-workflow-with-agent',
	'verify-built-workflow',
	'research',
	'web-search',
	'fetch-url',
]);

const CHECKPOINT_FOLLOW_UP_TOOLS = new Set(['complete-checkpoint', 'executions']);

function splitDeferredTools(
	tools: InstanceAiToolRegistry,
	options: { isCheckpointFollowUp?: boolean } = {},
) {
	const coreTools = createToolRegistry();
	const deferredTools = createToolRegistry();

	for (const [name, tool] of tools) {
		if (
			ALWAYS_LOADED_TOOLS.has(name) ||
			(options.isCheckpointFollowUp && CHECKPOINT_FOLLOW_UP_TOOLS.has(name))
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
	const mcpTools = await mcpManager.getRegularTools(mcpServers, context.logger);
	const browserMcpTools = await mcpManager.getBrowserTools(
		orchestrationContext?.browserMcpConfig,
		context.logger,
	);
	const rawLocalMcpTools = context.localMcpServer
		? createToolsFromLocalMcpServer(context.localMcpServer, context.logger)
		: createToolRegistry();

	// Browser tool names are excluded from the orchestrator's direct toolset.
	// They remain available to browser-oriented sub-agents via orchestrationContext.mcpTools.
	const browserToolNames = new Set([
		...browserMcpTools.keys(),
		...(context.localMcpServer?.getToolsByCategory('browser').map((tool) => tool.name) ?? []),
	]);

	const warnSkippedMcpTool = (error: McpToolNameValidationError) => {
		context.logger?.warn('Skipped MCP tool with unsafe name', {
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

	// Store all MCP tools (external + browser + local gateway) on orchestrationContext for
	// sub-agents. These are not all given to the orchestrator directly.
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
	addSafeMcpTools(allMcpTools, browserMcpTools, {
		source: 'browser MCP',
		claimedToolNames: mcpContextToolNames,
		warn: warnSkippedMcpTool,
	});

	const orchestratorLocalMcpTools = filterToolRegistry(
		rawLocalMcpTools,
		([name]) => !browserToolNames.has(name),
	);
	if (orchestrationContext && allMcpTools.size > 0) {
		orchestrationContext.mcpTools = allMcpTools;
	}

	const claimedOrchestratorToolNames = createClaimedToolNames(reservedToolNames);
	const safeLocalMcpTools = createToolRegistry();
	addSafeMcpTools(safeLocalMcpTools, orchestratorLocalMcpTools, {
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
		timeZone: options.timeZone,
		browserAvailable: browserToolNames.size > 0,
		branchReadOnly: context.branchReadOnly,
	});

	// The orchestrator intentionally does not receive a workspace. Sandbox access
	// is scoped to the workflow-builder subagent via `builderSandboxFactory`.
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
	if (hasDeferrableTools) {
		agent.deferredTool(toolRegistryValues(deferredTools), { search: { topK: 5 } });
	}
	if (telemetry) {
		agent.telemetry(telemetry);
	}

	if (options.memory) {
		agent.memory({
			memory: options.memory,
			lastMessages: memoryConfig.lastMessages ?? 20,
			...(memoryConfig.embedderModel && memoryConfig.semanticRecallTopK
				? {
						semanticRecall: {
							topK: memoryConfig.semanticRecallTopK,
							embedder: memoryConfig.embedderModel,
						},
					}
				: {}),
		});
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
						lastMessages: memoryConfig.lastMessages ?? 20,
						semanticRecallTopK: memoryConfig.semanticRecallTopK,
					}
				: undefined,
			toolSearchEnabled: hasDeferrableTools,
			inputProcessors: hasDeferrableTools ? ['NativeToolSearch'] : undefined,
		}),
	);

	return agent;
}
