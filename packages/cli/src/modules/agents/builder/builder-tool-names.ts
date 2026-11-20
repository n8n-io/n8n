import { AGENT_BUILDER_TOOL_NAMES } from '@n8n/api-types';

/**
 * Tool names used by the agent builder. Centralised so tool implementations,
 * prompts, and tests can't drift on string typos.
 *
 * The values come from `AGENT_BUILDER_TOOL_NAMES` in `@n8n/api-types`. When you
 * rename a tool, add the former name to `LEGACY_BUILDER_TOOL_NAMES` there so
 * persisted checkpoints still resolve.
 *
 * The interactive `CONFIGURE_CHANNEL_TOOL_NAME` tool is NOT listed here. It
 * lives in `@n8n/api-types` (`agents/agent-interaction.schema.ts`) alongside the suspend/resume schemas it shares with instance AI's FE cards.
 */
export const BUILDER_TOOLS = {
	WRITE_CONFIG: AGENT_BUILDER_TOOL_NAMES.WRITE_CONFIG,
	PATCH_CONFIG: AGENT_BUILDER_TOOL_NAMES.PATCH_CONFIG,
	BUILD_CUSTOM_TOOL: AGENT_BUILDER_TOOL_NAMES.BUILD_CUSTOM_TOOL,
	CREATE_SKILLS: AGENT_BUILDER_TOOL_NAMES.CREATE_SKILLS,
	UPDATE_SKILL: AGENT_BUILDER_TOOL_NAMES.UPDATE_SKILL,
	CREATE_TASKS: AGENT_BUILDER_TOOL_NAMES.CREATE_TASKS,
	UPDATE_TASK: AGENT_BUILDER_TOOL_NAMES.UPDATE_TASK,
	FINISH_SETUP: AGENT_BUILDER_TOOL_NAMES.FINISH_SETUP,
	CALL_AGENT: AGENT_BUILDER_TOOL_NAMES.CALL_AGENT,
	PUBLISH_AGENT: AGENT_BUILDER_TOOL_NAMES.PUBLISH_AGENT,
	UNPUBLISH_AGENT: AGENT_BUILDER_TOOL_NAMES.UNPUBLISH_AGENT,
	RESOLVE_LLM: AGENT_BUILDER_TOOL_NAMES.RESOLVE_LLM,
	VERIFY_MCP_SERVER: AGENT_BUILDER_TOOL_NAMES.VERIFY_MCP_SERVER,
} as const;

/** Thread-id prefix scoping the test-chat surface of an agent. */
export const AGENT_THREAD_PREFIX = {
	TEST: 'test-',
} as const;
