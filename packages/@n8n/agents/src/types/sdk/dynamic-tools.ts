import type { BuiltTool } from './tool';

/** Permission for a dynamic tool. `deny` hides the tool and blocks calls to it. */
export type DynamicToolPermission = 'allow' | 'ask' | 'deny';

/** Availability of a namespace. Tools of a namespace that is not `ready` cannot be called. */
export type DynamicToolNamespaceStatus = 'ready' | 'needsAuth' | 'loading';

/** A group of tools that the model reaches through `get_tools` and `call_tool`. */
export interface DynamicToolNamespace {
	/** Unique namespace name, for example `slack` or `mcp_linear`. */
	name: string;
	/** One-line summary shown in the catalog. */
	description?: string;
	/** Usage guidance shown in the catalog, for example when to use these tools. */
	instructions?: string;
	status?: DynamicToolNamespaceStatus;
	/** Default permission for the tools in this namespace. Default `allow`. */
	permission?: DynamicToolPermission;
	/** Per-tool permission overrides, keyed by tool name. */
	toolPermissions?: Record<string, DynamicToolPermission>;
	tools: BuiltTool[];
}

export interface DynamicToolsConfig {
	namespaces: DynamicToolNamespace[];
	/**
	 * Approximate token budget for tool descriptions in the catalog. Above the
	 * budget the catalog lists tool names only. Default 8000.
	 */
	catalogDescriptionTokenBudget?: number;
}
