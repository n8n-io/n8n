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
			'Create, edit, or inspect n8n Agents, or check which chat channels and capabilities Agents support.',
		tools: [
			ORCHESTRATION_TOOL_IDS.BUILD_AGENT,
			DOMAIN_TOOL_IDS.AGENTS,
			ORCHESTRATION_TOOL_IDS.LIST_AGENT_CAPABILITIES,
			DOMAIN_TOOL_IDS.WORKFLOWS,
			DOMAIN_TOOL_IDS.CREDENTIALS,
			DOMAIN_TOOL_IDS.MCP_SERVERS,
			DOMAIN_TOOL_IDS.N8N_DOCS,
			...WEB_TOOLS,
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

/** Builds the SDK config, and drops tools that this run does not register. */
export function createToolModesConfig(
	initialMode: InstanceAiToolMode,
	registeredToolNames: ReadonlySet<string>,
): ToolModesConfig {
	const modes: ToolModesConfig['modes'] = {};
	for (const [name, mode] of Object.entries(INSTANCE_AI_TOOL_MODES)) {
		modes[name] = {
			description: mode.description,
			tools: mode.tools.filter((tool) => registeredToolNames.has(tool)),
		};
	}
	return { modes, initialMode };
}
