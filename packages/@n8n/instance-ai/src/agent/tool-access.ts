/**
 * Tool access filtering is now handled via surface-scoped factories.
 *
 * `createOrchestratorDomainTools(context)` returns tools with restricted action sets:
 * - workflows: no get-as-code
 * - nodes: only explore-resources
 * - data-tables: read-only (list, schema, query)
 * - templates: excluded entirely
 * - build-workflow: excluded entirely
 *
 * `createAllTools(context)` returns the full action surface for delegate/builder use.
 *
 * This file is kept as the single import point for the orchestrator filtering step.
 */
import type { ToolsInput } from '@mastra/core/agent';

/**
 * Returns orchestrator domain tools. With consolidated family tools,
 * the surface restriction is already applied at factory creation time
 * by `createOrchestratorDomainTools()`. This function is a pass-through
 * kept for call-site compatibility.
 */
export function getOrchestratorDomainTools(domainTools: ToolsInput): ToolsInput {
	return domainTools;
}
