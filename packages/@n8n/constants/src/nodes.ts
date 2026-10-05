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
export const MODULE_GATED_NODE_TYPES: Readonly<Record<string, string>> = {
	'n8n-nodes-base.dataTable': 'data-table',
	'n8n-nodes-base.dataTableTool': 'data-table',
	'n8n-nodes-base.messageAnAgent': 'agents',
	'n8n-nodes-base.messageAnAgentTool': 'agents',
};
