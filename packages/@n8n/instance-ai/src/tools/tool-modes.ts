import type { ToolModesConfig } from '@n8n/agents';
import type {
	InstanceAiHandoffContext,
	InstanceAiThreadArtifactsContext,
	InstanceAiToolMode,
} from '@n8n/api-types';

import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from './tool-ids';

interface InstanceAiToolModeDefinition {
	description: string;
	tools: readonly string[];
}

const WEB_TOOLS = [DOMAIN_TOOL_IDS.RESEARCH, 'web-search', 'fetch-url'] as const;

/**
 * Each mode lists every always-loaded tool that it binds. An always-loaded tool
 * that no mode names is core, and stays bound in all modes: `ask-user`,
 * `parse-file`, `activity`, and `save_user_preference`. Only always-loaded
 * tools belong here: deferred tools stay behind `search_tools` in every mode.
 *
 * The `agents` mode binds only Agent tools besides the core ones. Every other
 * mode binds the sandbox workspace tools.
 */
export const INSTANCE_AI_TOOL_MODES = {
	general: {
		description: 'Answer questions about n8n, this instance, and past conversations.',
		tools: [
			DOMAIN_TOOL_IDS.WORKFLOWS,
			DOMAIN_TOOL_IDS.CREDENTIALS,
			DOMAIN_TOOL_IDS.N8N_DOCS,
			DOMAIN_TOOL_IDS.CONVERSATION_HISTORY,
			DOMAIN_TOOL_IDS.MCP_SERVERS,
			...WEB_TOOLS,
		],
	},
	build: {
		description: 'Create or edit workflows, then run and verify them.',
		tools: [
			DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
			DOMAIN_TOOL_IDS.NODES,
			ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
			DOMAIN_TOOL_IDS.EXECUTIONS,
			DOMAIN_TOOL_IDS.DATA_TABLES,
			DOMAIN_TOOL_IDS.WORKFLOWS,
			DOMAIN_TOOL_IDS.CREDENTIALS,
			DOMAIN_TOOL_IDS.N8N_DOCS,
			DOMAIN_TOOL_IDS.CONVERSATION_HISTORY,
			DOMAIN_TOOL_IDS.MCP_SERVERS,
			...WEB_TOOLS,
		],
	},
	debug: {
		description: 'Find out why an existing workflow or execution failed.',
		tools: [
			DOMAIN_TOOL_IDS.EXECUTIONS,
			DOMAIN_TOOL_IDS.NODES,
			DOMAIN_TOOL_IDS.WORKFLOWS,
			DOMAIN_TOOL_IDS.CREDENTIALS,
			DOMAIN_TOOL_IDS.N8N_DOCS,
			...WEB_TOOLS,
		],
	},
	data: {
		description: 'Read, create, or change data tables and their rows.',
		tools: [DOMAIN_TOOL_IDS.DATA_TABLES, DOMAIN_TOOL_IDS.N8N_DOCS],
	},
	agents: {
		description:
			'Create, edit, test, or publish n8n Agents, or check which chat channels and capabilities Agents support.',
		// The Agent Builder tools that the host supplies join this mode at runtime.
		tools: [
			ORCHESTRATION_TOOL_IDS.SELECT_AGENT,
			DOMAIN_TOOL_IDS.AGENTS,
			ORCHESTRATION_TOOL_IDS.LIST_AGENT_CAPABILITIES,
		],
	},
} as const satisfies Record<InstanceAiToolMode, InstanceAiToolModeDefinition>;

const DEFAULT_TOOL_MODE: InstanceAiToolMode = 'build';

const ARTIFACT_TOOL_MODES = {
	workflow: 'build',
	agent: 'agents',
	'data-table': 'data',
} as const satisfies Record<
	InstanceAiThreadArtifactsContext['artifacts'][number]['type'],
	InstanceAiToolMode
>;

/**
 * Selects the mode a run starts in: the mode the user picked, else the mode
 * for what the user is looking at, else `build`.
 */
export function resolveStartingToolMode(input: {
	requested?: InstanceAiToolMode;
	handoffContext?: InstanceAiHandoffContext;
	threadArtifacts?: InstanceAiThreadArtifactsContext;
}): InstanceAiToolMode {
	if (input.requested) return input.requested;
	if (input.handoffContext?.source === 'agent-preview') return 'agents';

	const artifacts = input.threadArtifacts;
	const active = artifacts?.artifacts.find((artifact) => artifact.id === artifacts.activeId);
	if (active) return ARTIFACT_TOOL_MODES[active.type];

	return DEFAULT_TOOL_MODE;
}

/**
 * Reads large tool results that the workspace offloaded, so every mode keeps
 * it: any tool result can be offloaded.
 */
const WORKSPACE_READ_TOOL_RESULT = 'workspace_read_tool_result';

export interface RuntimeModeTools {
	/** Host-supplied Agent Builder tools; only the `agents` mode binds them. */
	agentBuilderToolNames?: ReadonlySet<string>;
	/** Sandbox workspace tools; every mode except `agents` binds them. */
	workspaceToolNames?: ReadonlySet<string>;
}

/**
 * Builds the SDK config, and drops tools that this run does not register. The
 * host announces the mode in `<thread-context>`, so the runtime adds no note.
 */
export function createToolModesConfig(
	initialMode: InstanceAiToolMode,
	registeredToolNames: ReadonlySet<string>,
	{ agentBuilderToolNames = new Set(), workspaceToolNames = new Set() }: RuntimeModeTools = {},
): ToolModesConfig {
	const scopedWorkspaceTools = [...workspaceToolNames].filter(
		(tool) => tool !== WORKSPACE_READ_TOOL_RESULT,
	);
	const modes: ToolModesConfig['modes'] = {};
	for (const [name, mode] of Object.entries(INSTANCE_AI_TOOL_MODES)) {
		const tools: string[] = mode.tools.filter((tool) => registeredToolNames.has(tool));
		if (name === 'agents') {
			tools.push(...[...agentBuilderToolNames].filter((tool) => registeredToolNames.has(tool)));
		} else {
			tools.push(...scopedWorkspaceTools);
		}
		modes[name] = { description: mode.description, tools };
	}
	return { modes, initialMode, announceMode: false };
}
