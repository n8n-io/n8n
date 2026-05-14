import { Agent } from '@n8n/agents';

import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from './mcp-tool-name-validation';
import { getSystemPrompt } from './system-prompt';
import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions, InstanceAiToolRegistry } from '../types';

// ── Agent factory ───────────────────────────────────────────────────────────

const ALWAYS_LOADED_TOOLS = new Set([
	'plan',
	'delegate',
	'ask-user',
	'research',
	'web-search',
	'fetch-url',
]);

function splitDeferredTools(tools: InstanceAiToolRegistry) {
	const coreTools: InstanceAiToolRegistry = {};
	const deferredTools: InstanceAiToolRegistry = {};

	for (const [name, tool] of Object.entries(tools)) {
		if (ALWAYS_LOADED_TOOLS.has(name)) {
			coreTools[name] = tool;
		} else {
			deferredTools[name] = tool;
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
		: {};

	// Browser tool names are excluded from the orchestrator's direct toolset.
	// They remain available to browser-oriented sub-agents via orchestrationContext.mcpTools.
	const browserToolNames = new Set([
		...Object.keys(browserMcpTools),
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
		: {};

	// Keep MCP tools from shadowing domain or orchestration tools during object composition.
	const reservedToolNames = new Set([
		...Object.keys(domainTools),
		...Object.keys(orchestrationTools),
	]);

	// Store all MCP tools (external + browser + local gateway) on orchestrationContext for
	// sub-agents. These are not all given to the orchestrator directly.
	const allMcpTools: InstanceAiToolRegistry = {};
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

	const orchestratorLocalMcpTools = Object.fromEntries(
		Object.entries(rawLocalMcpTools).filter(([name]) => !browserToolNames.has(name)),
	);
	if (orchestrationContext && Object.keys(allMcpTools).length > 0) {
		orchestrationContext.mcpTools = allMcpTools;
	}

	const claimedOrchestratorToolNames = createClaimedToolNames(reservedToolNames);
	const safeLocalMcpTools: InstanceAiToolRegistry = {};
	addSafeMcpTools(safeLocalMcpTools, orchestratorLocalMcpTools, {
		source: 'local gateway MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});
	const safeMcpTools: InstanceAiToolRegistry = {};
	addSafeMcpTools(safeMcpTools, mcpTools, {
		source: 'external MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});

	const allOrchestratorTools: InstanceAiToolRegistry = {
		...orchestratorDomainTools,
		...orchestrationTools,
		...safeLocalMcpTools,
		...safeMcpTools,
	};
	const tracedOrchestratorTools =
		orchestrationContext?.tracing?.wrapTools(allOrchestratorTools, {
			agentRole: 'orchestrator',
			tags: ['orchestrator'],
		}) ?? allOrchestratorTools;
	const { coreTools, deferredTools } = splitDeferredTools(tracedOrchestratorTools);
	const hasDeferrableTools = !options.disableDeferredTools && Object.keys(deferredTools).length > 0;
	const runtimeTools = hasDeferrableTools ? coreTools : tracedOrchestratorTools;
	const systemPrompt = getSystemPrompt({
		researchMode: orchestrationContext?.researchMode,
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
		.tool(Object.values(runtimeTools))
		.checkpoint(options.checkpointStore ?? 'memory');
	if (hasDeferrableTools) {
		agent.deferredTool(Object.values(deferredTools), { search: { topK: 5 } });
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
