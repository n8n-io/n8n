/**
 * Tool names used by the agent builder. Centralised so tool implementations,
 * prompts, and tests can't drift on string typos.
 *
 * Keep registered tool IDs stable — they are part of the model/tool contract
 * and may appear in checkpoints. Prefer clearer descriptions and UI i18n
 * labels over renaming existing IDs.
 *
 * The interactive tools (`ask_credential`, `ask_embedding_credential`,
 * `ask_questions`, `configure_channel`) are NOT listed here — their names live
 * in `@n8n/api-types` (`agent-builder-interactive.ts` / `agents/agent-interaction.schema.ts`)
 * alongside the suspend/resume schemas they share with instance AI's FE cards.
 */
export const BUILDER_TOOLS = {
	READ_CONFIG: 'read_config',
	// WRITE_CONFIG / PATCH_CONFIG / PUBLISH_AGENT / UNPUBLISH_AGENT values must
	// match `CONFIG_MUTATION_TOOL_NAMES` in `@n8n/api-types`
	// (agents/agent-interaction.schema.ts).
	WRITE_CONFIG: 'write_config',
	PATCH_CONFIG: 'patch_config',
	BUILD_CUSTOM_TOOL: 'build_custom_tool',
	CREATE_SKILLS: 'create_skills',
	CREATE_TASKS: 'create_tasks',
	FINISH_SETUP: 'finish_setup',
	GET_RESOURCE_LOCATOR_OPTIONS: 'get_resource_locator_options',
	LIST_WORKFLOWS: 'list_workflows',
	LIST_INTEGRATION_TYPES: 'list_integration_types',
	LIST_SUB_AGENTS: 'list_sub_agents',
	PUBLISH_AGENT: 'publish_agent',
	UNPUBLISH_AGENT: 'unpublish_agent',
	RESOLVE_INTEGRATION: 'resolve_integration',
	RESOLVE_LLM: 'resolve_llm',
	SEARCH_MCP_SERVERS: 'search_mcp_servers',
	VERIFY_MCP_SERVER: 'verify_mcp_server',
} as const;

export type BuilderToolName = (typeof BUILDER_TOOLS)[keyof typeof BUILDER_TOOLS];

/** Thread-id prefix scoping the test-chat surface of an agent. */
export const AGENT_THREAD_PREFIX = {
	TEST: 'test-',
} as const;
