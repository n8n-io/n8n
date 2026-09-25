export interface ToolModeDefinition {
	/** One sentence that tells the model when to use this mode. */
	description: string;
	/** Names of tools added with `.tool()` that are visible only in this mode. */
	tools: string[];
}

/**
 * Named tool sets. The model sees the tools of the active mode plus every tool
 * that no mode names, and calls `switch_mode` to change the mode.
 */
export interface ToolModesConfig {
	modes: Record<string, ToolModeDefinition>;
	/** The mode that each run starts in. */
	initialMode: string;
}
