import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { withLangsmithMetadata, LangSmithExporter } from '@mastra/langsmith';
import { MCPClient } from '@mastra/mcp';
import { buildTracingOptions, Observability } from '@mastra/observability';
import { nanoid } from 'nanoid';

import { createMemory } from '../memory/memory-config';
import { createAllTools, createOrchestrationTools } from '../tools';
import type { CreateInstanceAgentOptions, McpServerConfig } from '../types';
import { sanitizeMcpToolSchemas } from './sanitize-mcp-schemas';
import { getSystemPrompt } from './system-prompt';

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
	// Only recreate Mastra if the storage instance changed
	const key = storage.id ?? 'default';
	if (cachedMastra && cachedMastraStorageKey === key) {
		// Re-register the new agent instance with the existing Mastra
		// Mastra constructor is the only way to register — but we can reuse storage
	}

	cachedMastra = new Mastra({
		agents: { 'n8n-instance-agent': agent },
		storage,
		observability: new Observability({
			configs: {
				langsmith: {
					serviceName: 'my-service',
					exporters: [new LangSmithExporter({ projectName: 'instance-ai' })],
				},
			},
		}),
	});
	cachedMastraStorageKey = key;
}

// ── Agent factory ───────────────────────────────────────────────────────────

export async function createInstanceAgent(options: CreateInstanceAgentOptions): Promise<Agent> {
	const { modelId, context, orchestrationContext, mcpServers = [], memoryConfig } = options;

	// Build native n8n domain tools (context captured via closures — per-run)
	const domainTools = createAllTools(context);

	// Tools that only the builder sub-agent should use (not the orchestrator).
	// The orchestrator should call build-workflow-with-agent for all workflow work.
	const BUILDER_ONLY_TOOLS = new Set([
		'search-nodes',
		'list-nodes',
		'get-node-type-definition',
		'get-node-description',
		'get-best-practices',
		'search-template-structures',
		'search-template-parameters',
		'build-workflow',
		'get-workflow-as-code',
	]);

	// Tools whose output is too large for the orchestrator's context window.
	// Sub-agents (via delegate) can still use them — they return concise summaries.
	const DELEGATE_ONLY_TOOLS = new Set([
		'run-workflow',
		'get-execution',
		'debug-execution',
		'stop-execution',
		'list-executions',
		'get-suggested-nodes',
		'explore-node-resources',
	]);

	// Tools that only the data table sub-agent should use (not the orchestrator).
	// The orchestrator should call manage-data-tables-with-agent instead.
	const DATA_TABLE_ONLY_TOOLS = new Set([
		'list-data-tables',
		'create-data-table',
		'delete-data-table',
		'get-data-table-schema',
		'add-data-table-column',
		'delete-data-table-column',
		'rename-data-table-column',
		'query-data-table-rows',
		'insert-data-table-rows',
		'update-data-table-rows',
		'delete-data-table-rows',
	]);

	// Orchestrator sees domain tools minus builder-only, delegate-only, and data-table-only tools
	const orchestratorDomainTools: ToolsInput = {};
	for (const [name, tool] of Object.entries(domainTools)) {
		if (
			!BUILDER_ONLY_TOOLS.has(name) &&
			!DELEGATE_ONLY_TOOLS.has(name) &&
			!DATA_TABLE_ONLY_TOOLS.has(name)
		) {
			orchestratorDomainTools[name] = tool;
		}
	}

	// Load MCP tools (cached — only spawns processes on first call or config change)
	const mcpTools = await getMcpTools(mcpServers);
	const browserMcpTools = await getBrowserMcpTools(orchestrationContext?.browserMcpConfig);

	// Make ALL MCP tools available for sub-agents (browser agent, delegate),
	// excluding any that collide with domain tool names
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

	// Orchestrator only gets non-browser MCP tools directly.
	// Browser tools are accessed via browser-credential-setup (which creates its own agent).
	// This prevents the orchestrator from calling take_screenshot/take_snapshot directly,
	// which would add 200KB+ images to the orchestrator's context.
	const orchestratorMcpTools: ToolsInput = { ...safeMcpTools };

	// Use pre-built memory if provided, otherwise create from config
	const memory = options.memory ?? createMemory(memoryConfig);

	const agent = new Agent({
		id: 'n8n-instance-agent',
		name: 'n8n Instance Agent',
		instructions: {
			role: 'system' as const,
			content: getSystemPrompt({
				researchMode: orchestrationContext?.researchMode,
				webhookBaseUrl: orchestrationContext?.webhookBaseUrl,
				filesystemAccess: !!(context.localMcpServer ?? context.filesystemService),
			}),
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		},
		model: modelId,
		tools: {
			...orchestratorDomainTools,
			...orchestrationTools,
			...orchestratorMcpTools,
			...(context.localMcpServer
				? context.localMcpServer.getAvailableTools().reduce(
						(result, tool) => ({
							...result,
							[tool.name]: tool,
						}),
						{},
					)
				: {}),
		},
		defaultOptions: {
			tracingOptions: buildTracingOptions(
				withLangsmithMetadata({ projectName: 'instance-ai' }),
				// Prevent full tool results (execution output, node data) from being
				// logged in traces — they can contain PII and API tokens.
				// Tool names and execution IDs are still recorded via tool-call spans.
				(opts) => ({ ...opts, recordOutputs: false }),
			),
		},
		memory,
		workspace: options.workspace,
	});

	// Register agent with Mastra for HITL suspend/resume snapshot storage
	ensureMastraRegistered(agent, memoryConfig.storage);

	return agent;
}
