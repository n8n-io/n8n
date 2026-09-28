/**
 * Tool names used by the agent builder. Centralised so tool implementations,
 * prompts, and tests can't drift on string typos.
 *
 * Keep registered tool IDs stable — they are part of the model/tool contract
 * and may appear in checkpoints. Prefer clearer descriptions and UI i18n
 * labels over renaming existing IDs.
 *
 * The interactive tools (`credential_ask`, `embedding_credential_ask`,
 * `user_questions_ask`, `channel_configure`) are NOT listed here — their names live
 * in `@n8n/api-types` (`agent-builder-interactive.ts` / `agents/agent-interaction.schema.ts`)
 * alongside the suspend/resume schemas they share with instance AI's FE cards.
 */
export const BUILDER_TOOLS = {
	// WRITE_CONFIG / PATCH_CONFIG / PUBLISH_AGENT / UNPUBLISH_AGENT values must
	// match `CONFIG_MUTATION_TOOL_NAMES` in `@n8n/api-types`
	// (agents/agent-interaction.schema.ts).
	WRITE_CONFIG: 'config_write',
	PATCH_CONFIG: 'config_patch',
	BUILD_CUSTOM_TOOL: 'custom_tool_build',
	CREATE_SKILLS: 'skills_create',
	UPDATE_SKILL: 'skill_update',
	CREATE_TASKS: 'tasks_create',
	UPDATE_TASK: 'task_update',
	FINISH_SETUP: 'setup_finish',
	GET_RESOURCE_LOCATOR_OPTIONS: 'resource_locator_options_get',
	CALL_AGENT: 'agent_call',
	PUBLISH_AGENT: 'agent_publish',
	UNPUBLISH_AGENT: 'agent_unpublish',
	RESOLVE_LLM: 'llm_resolve',
	VERIFY_MCP_SERVER: 'mcp_server_verify',
} as const;

export type BuilderToolName = (typeof BUILDER_TOOLS)[keyof typeof BUILDER_TOOLS];

/** Thread-id prefix scoping the test-chat surface of an agent. */
export const AGENT_THREAD_PREFIX = {
	TEST: 'test-',
} as const;
