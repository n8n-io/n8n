import { Agent } from '@n8n/agents';

import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { sanitizeMcpToolSchemas } from './sanitize-mcp-schemas';
import { getSystemPrompt } from './system-prompt';
import { McpClientManager } from '../mcp/mcp-client-manager';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions, InstanceAiToolRegistry, McpServerConfig } from '../types';

// ── Cached MCP tools (expensive to initialize — spawn processes, connect, list) ──

let cachedMcpTools: InstanceAiToolRegistry | null = null;
let cachedMcpServersKey = '';
let cachedMcpClientManager: McpClientManager | undefined;

let cachedBrowserMcpTools: InstanceAiToolRegistry | null = null;
let cachedBrowserMcpKey = '';
let cachedBrowserMcpClientManager: McpClientManager | undefined;

function toolsToRegistry(
	tools: Awaited<ReturnType<McpClientManager['connect']>>,
): InstanceAiToolRegistry {
	return sanitizeMcpToolSchemas(Object.fromEntries(tools.map((tool) => [tool.name, tool])));
}

async function getMcpTools(mcpServers: McpServerConfig[]): Promise<InstanceAiToolRegistry> {
	const key = JSON.stringify(mcpServers);
	if (cachedMcpTools && cachedMcpServersKey === key) return cachedMcpTools;

	if (mcpServers.length === 0) {
		cachedMcpTools = {};
		cachedMcpServersKey = key;
		return cachedMcpTools;
	}

	await cachedMcpClientManager?.disconnect();
	cachedMcpClientManager = new McpClientManager();
	cachedMcpTools = toolsToRegistry(await cachedMcpClientManager.connect(mcpServers));
	cachedMcpServersKey = key;
	return cachedMcpTools;
}

async function getBrowserMcpTools(
	config: McpServerConfig | undefined,
): Promise<InstanceAiToolRegistry> {
	if (!config) return {};

	const key = JSON.stringify(config);
	if (cachedBrowserMcpTools && cachedBrowserMcpKey === key) return cachedBrowserMcpTools;

	await cachedBrowserMcpClientManager?.disconnect();
	cachedBrowserMcpClientManager = new McpClientManager();
	cachedBrowserMcpTools = toolsToRegistry(await cachedBrowserMcpClientManager.connect([config]));
	cachedBrowserMcpKey = key;
	return cachedBrowserMcpTools;
}

// ── Agent factory ───────────────────────────────────────────────────────────

export async function createInstanceAgent(options: CreateInstanceAgentOptions): Promise<Agent> {
	const { modelId, context, orchestrationContext, mcpServers = [], memoryConfig } = options;

	// Build native n8n domain tools (context captured via closures — per-run)
	const domainTools = createAllTools(context);

	const orchestratorDomainTools = createOrchestratorDomainTools(context);

	// Load MCP tools (cached — only spawns processes on first call or config change)
	const mcpTools = await getMcpTools(mcpServers);
	const browserMcpTools = await getBrowserMcpTools(orchestrationContext?.browserMcpConfig);

	// Browser tool names — used to exclude them from the orchestrator's direct toolset.
	// Browser tools are only accessible via browser-credential-setup (sub-agent) to prevent
	// 200KB+ screenshots/snapshots from bloating the orchestrator's context.
	const browserToolNames = new Set([
		...Object.keys(browserMcpTools),
		...(context.localMcpServer?.getToolsByCategory('browser').map((t) => t.name) ?? []),
	]);

	// Store ALL MCP tools (external + browser) on orchestrationContext for sub-agents
	// (browser-credential-setup, delegate). NOT given to the orchestrator directly.
	const allMcpTools: InstanceAiToolRegistry = {};
	const domainToolNames = new Set(Object.keys(domainTools));
	for (const [name, tool] of Object.entries({ ...mcpTools, ...browserMcpTools })) {
		if (!domainToolNames.has(name)) {
			allMcpTools[name] = tool;
		}
	}
	if (orchestrationContext && Object.keys(allMcpTools).length > 0) {
		orchestrationContext.mcpTools = allMcpTools;
	}

	// Build orchestration tools (plan, delegate) — orchestrator-only
	// Must happen after mcpTools are set on orchestrationContext
	const orchestrationTools = orchestrationContext
		? createOrchestrationTools(orchestrationContext)
		: {};

	// Prevent MCP tools from shadowing domain or orchestration tools.
	// A malicious/misconfigured MCP server could register a tool named "run-workflow"
	// which would silently replace the real domain tool via object spread.
	const reservedToolNames = new Set([
		...Object.keys(domainTools),
		...Object.keys(orchestrationTools),
	]);
	const safeMcpTools: InstanceAiToolRegistry = {};
	for (const [name, tool] of Object.entries(mcpTools)) {
		if (reservedToolNames.has(name)) continue;
		safeMcpTools[name] = tool;
	}

	const localMcpTools = context.localMcpServer
		? Object.fromEntries(
				Object.entries(createToolsFromLocalMcpServer(context.localMcpServer)).filter(
					([name]) => !browserToolNames.has(name),
				),
			)
		: {};

	const allOrchestratorTools: InstanceAiToolRegistry = {
		...orchestratorDomainTools,
		...orchestrationTools,
		...safeMcpTools, // external MCP only — browser tools excluded
		...localMcpTools, // gateway tools — browser tools excluded via browserToolNames
	};
	const tracedOrchestratorTools =
		orchestrationContext?.tracing?.wrapTools(allOrchestratorTools, {
			agentRole: 'orchestrator',
			tags: ['orchestrator'],
		}) ?? allOrchestratorTools;
	const systemPrompt = getSystemPrompt({
		researchMode: orchestrationContext?.researchMode,
		webhookBaseUrl: orchestrationContext?.webhookBaseUrl,
		filesystemAccess: (context.localMcpServer?.getToolsByCategory('filesystem').length ?? 0) > 0,
		localGateway: context.localGatewayStatus,
		toolSearchEnabled: false,
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
		.tool(Object.values(tracedOrchestratorTools))
		.checkpoint(options.checkpointStore ?? 'memory');
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
			tools: tracedOrchestratorTools,
			modelId,
			memory: options.memory
				? {
						lastMessages: memoryConfig.lastMessages ?? 20,
						semanticRecallTopK: memoryConfig.semanticRecallTopK,
					}
				: undefined,
			toolSearchEnabled: false,
		}),
	);

	return agent;
}
