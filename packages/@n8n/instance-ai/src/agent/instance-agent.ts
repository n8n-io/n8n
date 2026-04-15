import type { ToolsInput } from '@mastra/core/agent';
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { ToolSearchProcessor, type ToolSearchProcessorOptions } from '@mastra/core/processors';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { MCPClient } from '@mastra/mcp';
import { nanoid } from 'nanoid';

import { createMemory } from '../memory/memory-config';
import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { sanitizeMcpToolSchemas } from './sanitize-mcp-schemas';
import { getSystemPrompt } from './system-prompt';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions, McpServerConfig } from '../types';
function buildMcpServers(
	configs: McpServerConfig[],
): Record<
	string,
	{ url: URL } | { command: string; args?: string[]; env?: Record<string, string> }
> {
	const servers: Record<
		string,
		{ url: URL } | { command: string; args?: string[]; env?: Record<string, string> }
	> = {};
	for (const server of configs) {
		if (server.url) {
			servers[server.name] = { url: new URL(server.url) };
		} else if (server.command) {
			servers[server.name] = { command: server.command, args: server.args, env: server.env };
		}
	}
	return servers;
}

// ── Cached MCP tools (expensive to initialize — spawn processes, connect, list) ──

let cachedMcpTools: ToolsInput | null = null;
let cachedMcpServersKey = '';

let cachedBrowserMcpTools: ToolsInput | null = null;
let cachedBrowserMcpKey = '';

let cachedMastra: Mastra | null = null;
let cachedMastraStorageKey = '';

// Tools that are always loaded into the orchestrator's context (no search required).
// These are used in nearly every conversation per system prompt analysis.
// All other tools are deferred behind ToolSearchProcessor for on-demand discovery.
const ALWAYS_LOADED_TOOLS = new Set(['plan', 'delegate', 'ask-user', 'research']);

function getOrCreateToolSearchProcessor(tools: ToolsInput): ToolSearchProcessor {
	// Deferred tools capture per-run closures via the orchestration context.
	// Reusing a processor across runs can inject stale tool instances into a new agent.
	return new ToolSearchProcessor({
		tools: tools as ToolSearchProcessorOptions['tools'],
		search: { topK: 5 },
	});
}

async function getMcpTools(mcpServers: McpServerConfig[]): Promise<ToolsInput> {
	const key = JSON.stringify(mcpServers);
	if (cachedMcpTools && cachedMcpServersKey === key) return cachedMcpTools;

	if (mcpServers.length === 0) {
		cachedMcpTools = {};
		cachedMcpServersKey = key;
		return cachedMcpTools;
	}

	const mcpClient = new MCPClient({
		id: `mcp-${nanoid(6)}`,
		servers: buildMcpServers(mcpServers),
	});
	cachedMcpTools = sanitizeMcpToolSchemas(await mcpClient.listTools());
	cachedMcpServersKey = key;
	return cachedMcpTools;
}

async function getBrowserMcpTools(config: McpServerConfig | undefined): Promise<ToolsInput> {
	if (!config) return {};

	const key = JSON.stringify(config);
	if (cachedBrowserMcpTools && cachedBrowserMcpKey === key) return cachedBrowserMcpTools;

	const browserClient = new MCPClient({
		id: `browser-mcp-${nanoid(6)}`,
		servers: buildMcpServers([config]),
	});
	cachedBrowserMcpTools = sanitizeMcpToolSchemas(await browserClient.listTools());
	cachedBrowserMcpKey = key;
	return cachedBrowserMcpTools;
}

function ensureMastraRegistered(agent: Agent, storage: MastraCompositeStore): void {
	const key = storage.id ?? 'default';
	if (!cachedMastra || cachedMastraStorageKey !== key) {
		// Create a storage-only Mastra — no agents registered.
		// The agent only needs the Mastra back-reference to access getStorage()
		// for workflow snapshot persistence during suspend/resume.
		cachedMastra = new Mastra({ storage });
		cachedMastraStorageKey = key;
	}
	agent.__registerMastra(cachedMastra);
}

// ── Agent factory ───────────────────────────────────────────────────────────

export async function createInstanceAgent(options: CreateInstanceAgentOptions): Promise<Agent> {
	const {
		modelId,
		context,
		orchestrationContext,
		mcpServers = [],
		memoryConfig,
		disableDeferredTools = false,
	} = options;

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
	const allMcpTools: ToolsInput = {};
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
	const safeMcpTools: ToolsInput = {};
	for (const [name, tool] of Object.entries(mcpTools)) {
		if (reservedToolNames.has(name)) continue;
		safeMcpTools[name] = tool;
	}

	// ── Tool search: split tools into always-loaded core vs deferred ────────
	// Anthropic guidance: "Keep your 3-5 most-used tools always loaded, defer the rest."
	// Tool selection accuracy degrades past 10+ tools; tool search improves it significantly.
	const localMcpTools = context.localMcpServer
		? Object.fromEntries(
				Object.entries(createToolsFromLocalMcpServer(context.localMcpServer)).filter(
					([name]) => !browserToolNames.has(name),
				),
			)
		: {};

	const allOrchestratorTools: ToolsInput = {
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

	const coreTools: ToolsInput = {};
	const deferrableTools: ToolsInput = {};
	for (const [name, tool] of Object.entries(tracedOrchestratorTools)) {
		if (ALWAYS_LOADED_TOOLS.has(name)) {
			coreTools[name] = tool;
		} else {
			deferrableTools[name] = tool;
		}
	}

	const hasDeferrableTools = !disableDeferredTools && Object.keys(deferrableTools).length > 0;
	const toolSearchProcessor = hasDeferrableTools
		? getOrCreateToolSearchProcessor(deferrableTools)
		: undefined;

	// Use pre-built memory if provided, otherwise create from config
	const memory = options.memory ?? createMemory(memoryConfig);
	const systemPrompt = getSystemPrompt({
		researchMode: orchestrationContext?.researchMode,
		webhookBaseUrl: orchestrationContext?.webhookBaseUrl,
		filesystemAccess: (context.localMcpServer?.getToolsByCategory('filesystem').length ?? 0) > 0,
		localGateway: context.localGatewayStatus,
		toolSearchEnabled: hasDeferrableTools,
		licenseHints: context.licenseHints,
		timeZone: options.timeZone,
		browserAvailable: browserToolNames.size > 0,
		branchReadOnly: context.branchReadOnly,
	});

	const agent = new Agent({
		id: 'n8n-instance-agent',
		name: 'n8n Instance Agent',
		instructions: {
			role: 'system' as const,
			content: systemPrompt,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		},
		model: modelId,
		tools: hasDeferrableTools ? coreTools : tracedOrchestratorTools,
		inputProcessors: toolSearchProcessor ? [toolSearchProcessor] : undefined,
		memory,
		workspace: options.workspace,
	});

	mergeTraceRunInputs(
		orchestrationContext?.tracing?.actorRun,
		buildAgentTraceInputs({
			systemPrompt,
			tools: hasDeferrableTools ? coreTools : tracedOrchestratorTools,
			deferredTools: hasDeferrableTools ? deferrableTools : undefined,
			modelId,
			memory,
			toolSearchEnabled: hasDeferrableTools,
			inputProcessors: toolSearchProcessor ? ['ToolSearchProcessor'] : undefined,
		}),
	);

	// Register agent with Mastra for HITL suspend/resume snapshot storage
	ensureMastraRegistered(agent, memoryConfig.storage);

	return agent;
}
