// Kept dependency-free: loaded eagerly whenever either credential type is loaded.

/**
 * Single source of truth for the integration version: feeds both
 * `description.version` in Databricks.node.ts and the partner User-Agent, so the
 * two cannot drift. Deliberately not read from a node's `typeVersion` — that is a
 * per-workflow compatibility marker frozen into saved workflows, so it would report
 * how old a workflow is rather than which integration version is running.
 */
export const DATABRICKS_NODE_VERSION = 1;

/**
 * Partner User-Agent so Databricks can attribute traffic to n8n in audit logs.
 * The `.0` keeps the wire format Databricks expects; bumping to a fractional node
 * version needs this format revisited first.
 */
export const databricksUserAgent = () => `n8n_DatabricksNode/${DATABRICKS_NODE_VERSION}.0`;
