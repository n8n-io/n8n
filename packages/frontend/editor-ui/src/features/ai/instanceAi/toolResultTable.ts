import {
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** Assistant tools whose results list items, so they show as a table. */
const TABLE_TOOL_NAMES = new Set<string>([
	SHARED_BUILDER_TOOL_NAMES.QUERY_DATA_TABLE,
	SHARED_BUILDER_TOOL_NAMES.LIST_DATA_TABLES,
	SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS,
	SHARED_BUILDER_TOOL_NAMES.SEARCH_NODES,
	WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOWS,
	WORKFLOW_BUILDER_TOOL_NAMES.LIST_EXECUTIONS,
]);

const TABLE_NODES_ACTIONS = new Set<unknown>(['search', 'list']);

/** The result keys that hold the rows of a table tool. */
const TABLE_ROW_KEYS = [
	'data',
	'workflows',
	'executions',
	'credentials',
	'results',
	'nodes',
	'tables',
] as const;

/**
 * Whether an Assistant tool call lists items that show as a table. Pass the
 * call's arguments, so a former multi-action tool resolves by its `action`.
 */
export function isTableToolCall(toolName: string, args?: Record<string, unknown>): boolean {
	const action = args?.action;
	if (TABLE_TOOL_NAMES.has(resolveBuilderToolName(toolName, action))) return true;
	return (
		resolveBuilderToolName(toolName) === WORKFLOW_BUILDER_TOOL_NAMES.NODES &&
		TABLE_NODES_ACTIONS.has(action)
	);
}

/** The rows of a table tool result, or `null` when the result has no rows of objects. */
export function extractTableRows(result: unknown): Array<Record<string, unknown>> | null {
	if (!isRecord(result)) return null;
	for (const key of TABLE_ROW_KEYS) {
		const rows = result[key];
		if (Array.isArray(rows) && rows.length > 0 && rows.every(isRecord)) return rows;
	}
	return null;
}
