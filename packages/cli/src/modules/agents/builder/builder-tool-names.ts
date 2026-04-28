/**
 * Tool names used by the agent builder. Centralised so prompts, the SSE event
 * routing, and tests can't drift on string typos.
 */
export const BUILDER_TOOLS = {
	WRITE_CONFIG: 'write_config',
	PATCH_CONFIG: 'patch_config',
	BUILD_CUSTOM_TOOL: 'build_custom_tool',
} as const;

export type BuilderToolName = (typeof BUILDER_TOOLS)[keyof typeof BUILDER_TOOLS];
