/**
 * Tool names used by the agent builder. Centralised so prompts, the SSE event
 * routing, and tests can't drift on string typos.
 */
export const BUILDER_TOOLS = {
	READ_CONFIG: 'read_config',
	WRITE_CONFIG: 'write_config',
	PATCH_CONFIG: 'patch_config',
	BUILD_CUSTOM_TOOL: 'build_custom_tool',
	CREATE_SKILL: 'create_skill',
	LIST_INTEGRATION_TYPES: 'list_integration_types',
	RESOLVE_LLM: 'resolve_llm',
} as const;

export type BuilderToolName = (typeof BUILDER_TOOLS)[keyof typeof BUILDER_TOOLS];

/** Thread-id prefixes scoping different chat surfaces of the same agent. */
export const AGENT_THREAD_PREFIX = {
	TEST: 'test-',
	BUILDER: 'builder:',
} as const;
