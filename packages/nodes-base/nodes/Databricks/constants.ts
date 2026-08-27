// Imported by both credential files, so this module must stay import-free: it is
// loaded whenever a credential type is loaded.

/** Single source of truth: also feeds `description.version` in Databricks.node.ts. */
export const DATABRICKS_NODE_VERSION = 1;

/** Partner User-Agent so Databricks can attribute traffic to n8n in audit logs. */
export const databricksUserAgent = (version: number = DATABRICKS_NODE_VERSION) =>
	`n8n_DatabricksNode/${version}.0`;
