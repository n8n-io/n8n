import type { ToolsInput } from '@mastra/core/agent';

// Tools that only the builder sub-agent should use (not the orchestrator).
// The orchestrator should submit planned build-workflow tasks instead.
const BUILDER_ONLY_TOOLS = new Set([
	'search-nodes',
	'list-nodes',
	'get-node-type-definition',
	'get-node-description',
	'get-best-practices',
	'search-template-structures',
	'search-template-parameters',
	'build-workflow',
	'get-workflow-as-code',
]);

// Write/mutate data-table tools are not exposed directly to the orchestrator.
// Read tools (list, schema, query) remain directly available.
// Detached table changes should go through planned manage-data-tables tasks.
const DATA_TABLE_WRITE_TOOLS = new Set([
	'create-data-table',
	'delete-data-table',
	'add-data-table-column',
	'delete-data-table-column',
	'rename-data-table-column',
	'insert-data-table-rows',
	'update-data-table-rows',
	'delete-data-table-rows',
]);

export function getOrchestratorDomainTools(domainTools: ToolsInput): ToolsInput {
	// Orchestrator sees domain tools minus builder-only and data-table-write tools.
	// Execution tools (run-workflow, get-execution, etc.) are now directly available
	// with output truncation to prevent context bloat.
	return Object.fromEntries(
		Object.entries(domainTools).filter(
			([name]) => !BUILDER_ONLY_TOOLS.has(name) && !DATA_TABLE_WRITE_TOOLS.has(name),
		),
	);
}
