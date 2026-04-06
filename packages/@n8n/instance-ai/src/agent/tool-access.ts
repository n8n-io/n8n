import type { ToolsInput } from '@mastra/core/agent';

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
	return Object.fromEntries(
		Object.entries(domainTools).filter(
			([name]) => !BUILDER_ONLY_TOOLS.has(name) && !DATA_TABLE_WRITE_TOOLS.has(name),
		),
	);
}
