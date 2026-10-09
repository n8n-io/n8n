/**
 * Packages whose node type definitions are generated to disk at build time.
 * These names are also reserved and cannot be installed as community packages.
 */
export const BUILTIN_NODES_PACKAGES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'] as const;

/**
 * Built-in node types that need a backend module to run, keyed to that module.
 * The node panel and the AI builder offer them only while the module is enabled.
 * Workflows that already use them still load, and the node fails with a clear error.
 */
export const MODULE_GATED_NODE_TYPES = {
	'n8n-nodes-base.dataTable': 'data-table',
	'n8n-nodes-base.dataTableTool': 'data-table',
	'n8n-nodes-base.messageAnAgent': 'agents',
	'n8n-nodes-base.messageAnAgentTool': 'agents',
} as const;

export type ModuleGatedNodeType = keyof typeof MODULE_GATED_NODE_TYPES;
export type NodeGatingModule = (typeof MODULE_GATED_NODE_TYPES)[ModuleGatedNodeType];

export const isModuleGatedNodeType = (nodeType: string): nodeType is ModuleGatedNodeType =>
	Object.hasOwn(MODULE_GATED_NODE_TYPES, nodeType);

/** The module that `nodeType` needs, or `undefined` when it needs none. */
export function getNodeGatingModule(nodeType: string): NodeGatingModule | undefined {
	return isModuleGatedNodeType(nodeType) ? MODULE_GATED_NODE_TYPES[nodeType] : undefined;
}
