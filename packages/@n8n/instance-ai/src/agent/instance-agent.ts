import type { ToolsInput } from '@mastra/core/agent';
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import { ToolSearchProcessor, type ToolSearchProcessorOptions } from '@mastra/core/processors';
import type { MastraCompositeStore } from '@mastra/core/storage';

import { createMemory } from '../memory/memory-config';
import { createAllTools, createOrchestratorDomainTools, createOrchestrationTools } from '../tools';
import { getSystemPrompt } from './system-prompt';
import { createToolsFromLocalMcpServer } from '../tools/filesystem/create-tools-from-mcp-server';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { CreateInstanceAgentOptions } from '../types';
import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from './mcp-tool-name-validation';

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
		mcpManager,
		memoryConfig,
		disableDeferredTools = false,
	} = options;

	// Build native n8n domain tools (context captured via closures — per-run)
	const domainTools = createAllTools(context);

	const orchestratorDomainTools = createOrchestratorDomainTools(context);

	// Load MCP tools (cached by config-hash inside the manager — only spawns
	// processes / opens connections on first call or config change).
	const mcpTools = await mcpManager.getRegularTools(mcpServers, context.logger);
	const browserMcpTools = await mcpManager.getBrowserTools(
		orchestrationContext?.browserMcpConfig,
		context.logger,
	);
	const rawLocalMcpTools = context.localMcpServer
		? createToolsFromLocalMcpServer(context.localMcpServer, context.logger)
		: {};

	// Browser tool names — used to exclude them from the orchestrator's direct toolset.
	// Browser tools are only accessible via browser-credential-setup (sub-agent) to prevent
	// 200KB+ screenshots/snapshots from bloating the orchestrator's context.
	const browserToolNames = new Set([
		...Object.keys(browserMcpTools),
		...(context.localMcpServer?.getToolsByCategory('browser').map((t) => t.name) ?? []),
	]);

	// Store ALL MCP tools (external + browser + local gateway) on orchestrationContext for
	// sub-agents (browser-credential-setup, delegate). NOT given to the orchestrator directly.
	const allMcpTools: ToolsInput = {};
	const warnSkippedMcpTool = (error: McpToolNameValidationError) => {
		context.logger?.warn('Skipped MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};

	// Build orchestration tools (plan, delegate) — orchestrator-only
	const orchestrationTools = orchestrationContext
		? createOrchestrationTools(orchestrationContext)
		: {};

	// Keep MCP tools from shadowing domain or orchestration tools during object composition.
	const reservedToolNames = new Set([
		...Object.keys(domainTools),
		...Object.keys(orchestrationTools),
	]);
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
	const safeLocalMcpTools: ToolsInput = {};
	addSafeMcpTools(safeLocalMcpTools, orchestratorLocalMcpTools, {
		source: 'local gateway MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});
	const safeMcpTools: ToolsInput = {};
	addSafeMcpTools(safeMcpTools, mcpTools, {
		source: 'external MCP',
		claimedToolNames: claimedOrchestratorToolNames,
		warn: warnSkippedMcpTool,
	});

	// ── Tool search: split tools into always-loaded core vs deferred ────────
	// Anthropic guidance: "Keep your 3-5 most-used tools always loaded, defer the rest."
	// Tool selection accuracy degrades past 10+ tools; tool search improves it significantly.
	const allOrchestratorTools: ToolsInput = {
		...orchestratorDomainTools,
		...orchestrationTools,
		...safeLocalMcpTools, // gateway tools — browser tools excluded via browserToolNames
		...safeMcpTools, // external MCP only — browser tools excluded
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
		formBaseUrl: orchestrationContext?.formBaseUrl,
		localGateway: context.localGatewayStatus,
		toolSearchEnabled: hasDeferrableTools,
		licenseHints: context.licenseHints,
		timeZone: options.timeZone,
		browserAvailable: browserToolNames.size > 0,
		branchReadOnly: context.branchReadOnly,
	});

	// NOTE: we intentionally do NOT pass `workspace` to the orchestrator Agent.
	// Mastra auto-registers `mastra_workspace_*` tools (execute_command, write_file,
	// get_process_output, etc.) whenever a workspace is provided. The orchestrator
	// has no legitimate need for them — it does not run commands or write files —
	// and the LLM has been observed abusing `execute_command` as a `sleep` primitive
	// and calling `get_process_output` with `build-*` task IDs that live in a
	// different namespace than Mastra process PIDs. The workflow-builder subagent
	// creates its own per-task sandbox via `builderSandboxFactory`; the
	// `orchestrationContext.workspace` referenced by that factory is untouched.
	// `options.workspace` is kept on the type as @deprecated for one release so
	// external callers get a compile-time warning; it is otherwise ignored here.

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
