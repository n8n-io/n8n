// Kept dependency-free: loaded eagerly whenever either credential type is loaded.

export const DATABRICKS_NODE_VERSION = 1;

/**
 * Partner User-Agent so Databricks can attribute traffic to n8n in audit logs.
 * Unversioned by agreement with Databricks; all Databricks nodes (action node,
 * AI sub-nodes) must send this exact string.
 */
export const databricksUserAgent = () => 'n8n_DatabricksNode';
