/**
 * Per-role working memory templates for sub-agents.
 *
 * Each template defines the structure the agent fills in over time as it learns
 * durable patterns from the user's instance. Templates are injected into the
 * sub-agent's system prompt via Mastra's working memory mechanism, persisted
 * per-user across invocations.
 *
 * Guidelines for writing good templates:
 * - Sections should capture *actionable* knowledge, not observations
 * - Each bullet is a slot the agent can fill when it discovers something durable
 * - Keep the empty template short — the agent grows it over time
 */

// ── Builder ──────────────────────────────────────────────────────────────────

export const BUILDER_MEMORY_TEMPLATE = `
# User Preferences
Style and convention choices that affect how workflows are built.
- **naming**:
- **default trigger**:
- **structure**:
- **other**:

# Instance Knowledge
Facts specific to this user's environment, not derivable from tools or schemas.
- **credential disambiguation**: (when multiple credentials of same type exist, which to prefer)
- **node runtime quirks**: (issues unique to this instance's data/setup, not in schema)
- **recurring failures**: (stable instance-specific failures worth remembering)
`;

// ── Debugger ─────────────────────────────────────────────────────────────────

export const DEBUGGER_MEMORY_TEMPLATE = `
# Known Failure Patterns
Errors seen before — skip the investigation next time.
- **error message / code → root cause → fix**:

# Credential & Auth Issues
Service-specific authentication quirks.
- **service → auth type, token refresh, scopes needed**:

# Environment Quirks
Rate limits, timeouts, and infrastructure gotchas.
- **service / node → limit or quirk**:

# Workflow Health
Workflows with recurring issues.
- **workflow name (ID) → failure pattern, last fix**:
`;

// ── Data Table Manager ───────────────────────────────────────────────────────

export const DATA_TABLE_MEMORY_TEMPLATE = `
# Table Inventory
Tables and their purpose.
- **table name (ID) → purpose, key columns, relationships**:

# Schema Patterns
Column naming, type conventions, common structures.
- **convention → description**:

# Query Patterns
Frequently used filters and data shapes.
- **use case → filter / query approach**:
`;

// ── Lookup ───────────────────────────────────────────────────────────────────

/** Roles that have persistent working memory enabled. */
const ROLE_TEMPLATES: ReadonlyMap<string, string> = new Map([
	['workflow-builder', BUILDER_MEMORY_TEMPLATE],
	['execution-debugger', DEBUGGER_MEMORY_TEMPLATE],
	['data-table-manager', DATA_TABLE_MEMORY_TEMPLATE],
]);

/**
 * Returns the working memory template for a given sub-agent role, or undefined
 * if the role does not have persistent memory enabled.
 */
export function getSubAgentMemoryTemplate(role: string): string | undefined {
	return ROLE_TEMPLATES.get(role);
}

/** Set of roles that have persistent working memory. */
export const MEMORY_ENABLED_ROLES = new Set(ROLE_TEMPLATES.keys());
