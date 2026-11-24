/**
 * Data table read tools — one tool for each read action of the former
 * multi-action `data_tables` tool. Writes go through `change_data_tables`.
 */
import {
	DATA_TABLE_READ_TOOL_ACTIONS,
	DATA_TABLE_TOOL_NAME_BY_ACTION,
	getLegacyBuilderToolActions,
} from '@n8n/api-types';
import type { DataTableReadToolAction } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import {
	dataTableNameDescribe,
	filterDescribe,
	filterSchema,
	projectIdDescribe,
} from './data-tables/schemas';

// ── Input schemas ──────────────────────────────────────────────────────────

/** Cells can hold arbitrarily large values (e.g. inline base64 images); cap what a
 *  query feeds back to the model so one broad query cannot flood the conversation. */
const MAX_CELL_CHARS = 1024;

/** When full cell values are requested, cap rows per call — a few intact blob
 *  cells are useful; dozens re-create the flood truncation exists to prevent. */
const MAX_FULL_VALUE_ROWS = 5;

const dataTableIdField = z
	.string()
	.describe(
		'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
	);

const listInputSchema = z.object({
	projectId: z.string().optional().describe(projectIdDescribe),
});

const schemaInputSchema = z.object({
	dataTableId: dataTableIdField,
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const queryInputSchema = z.object({
	dataTableId: dataTableIdField,
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchema.optional().describe(filterDescribe),
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe('Max rows to return (default 50)'),
	offset: z.number().int().min(0).optional().describe('Number of rows to skip'),
	fullCellValues: z
		.boolean()
		.optional()
		.describe(
			`Return cell values untruncated. By default values longer than ${MAX_CELL_CHARS} characters ` +
				'(e.g. inline base64 images) are truncated. Requires a filter matching the specific ' +
				`row(s) whose full values are needed (ignored without one) and returns at most ${MAX_FULL_VALUE_ROWS} ` +
				'rows per call (default 1) — paginate for more.',
		),
});

type DataTableReferenceInput = z.infer<typeof schemaInputSchema>;

async function resolveDataTableReference(
	context: InstanceAiContext,
	input: DataTableReferenceInput,
	permission: 'read' | 'readRow',
): Promise<{ dataTableId: string; dataTableName?: string; projectId?: string }> {
	const reference = await context.dataTableService.resolveTableReference?.(input.dataTableId, {
		projectId: input.projectId,
		permission,
	});

	const table: { dataTableId: string; dataTableName?: string; projectId?: string } = {
		dataTableId: reference?.id ?? input.dataTableId,
	};
	const dataTableName = reference?.name ?? input.dataTableName;
	const projectId = reference?.projectId ?? input.projectId;
	if (dataTableName !== undefined) table.dataTableName = dataTableName;
	if (projectId !== undefined) table.projectId = projectId;

	return table;
}

// ── Handlers ───────────────────────────────────────────────────────────────

/** Tell the host that the agent read a table, so the frontend previews the table's tab. */
async function reportDataTableAction(
	context: InstanceAiContext,
	table: { id: string; name?: string; projectId?: string },
) {
	await context.onArtifactChanged?.({
		type: 'data-table',
		id: table.id,
		...(table.name ? { name: table.name } : {}),
		...(table.projectId ? { projectId: table.projectId } : {}),
	});
}

async function handleList(context: InstanceAiContext, input: z.infer<typeof listInputSchema>) {
	const tables = await context.dataTableService.list({ projectId: input.projectId });
	return { tables };
}

async function handleSchema(context: InstanceAiContext, input: z.infer<typeof schemaInputSchema>) {
	const table = await resolveDataTableReference(context, input, 'read');
	const columns = await context.dataTableService.getSchema(input.dataTableId, {
		projectId: input.projectId,
	});
	await reportDataTableAction(context, {
		id: table.dataTableId,
		name: table.dataTableName,
		projectId: table.projectId,
	});
	return { ...table, columns };
}

function truncateOversizedCells(rows: Array<Record<string, unknown>>): {
	rows: Array<Record<string, unknown>>;
	truncatedColumns: string[];
} {
	const truncatedColumns = new Set<string>();
	const truncatedRows = rows.map((row) => {
		const oversized = Object.entries(row).filter(
			([, value]) => typeof value === 'string' && value.length > MAX_CELL_CHARS,
		);
		if (oversized.length === 0) return row;

		const next = { ...row };
		for (const [column, value] of oversized) {
			if (typeof value !== 'string') continue;
			next[column] =
				`${value.slice(0, MAX_CELL_CHARS)}… [truncated, ${String(value.length)} chars total]`;
			truncatedColumns.add(column);
		}
		return next;
	});
	return { rows: truncatedRows, truncatedColumns: [...truncatedColumns] };
}

async function handleQuery(context: InstanceAiContext, input: z.infer<typeof queryInputSchema>) {
	const table = await resolveDataTableReference(context, input, 'readRow');
	// Honor fullCellValues only for filtered queries, and bound how many intact
	// rows one call can return — an unfiltered "give me everything untruncated"
	// is the exact flood shape truncation exists to prevent.
	const hasFilter = (input.filter?.filters.length ?? 0) > 0;
	const returnFullValues = input.fullCellValues === true && hasFilter;
	const limit = returnFullValues ? Math.min(input.limit ?? 1, MAX_FULL_VALUE_ROWS) : input.limit;
	const result = await context.dataTableService.queryRows(input.dataTableId, {
		filter: input.filter,
		limit,
		offset: input.offset,
		projectId: input.projectId,
	});

	const returnedRows = result.data.length;
	const remaining = result.count - (input.offset ?? 0) - returnedRows;

	const hints: string[] = [];
	let data = result.data;
	if (!returnFullValues) {
		const truncation = truncateOversizedCells(result.data);
		if (truncation.truncatedColumns.length > 0) {
			data = truncation.rows;
			hints.push(
				input.fullCellValues === true
					? `fullCellValues was ignored because the query has no filter. Values in column(s) ${truncation.truncatedColumns.join(', ')} were truncated to ${String(MAX_CELL_CHARS)} characters. Re-query with a filter matching only the specific row(s) to get full values.`
					: `Values in column(s) ${truncation.truncatedColumns.join(', ')} were truncated to ${String(MAX_CELL_CHARS)} characters. If a full value is needed, re-query with fullCellValues: true and a filter matching only the specific row(s).`,
			);
		}
	}
	if (remaining > 0) {
		hints.push(
			`${remaining} more rows available. Use additional paginated query_data_table calls for bulk operations.`,
		);
	}

	await reportDataTableAction(context, {
		id: table.dataTableId,
		name: table.dataTableName,
		projectId: table.projectId,
	});
	const response = { ...table, count: result.count, data };
	return hints.length > 0 ? { ...response, hint: hints.join(' ') } : response;
}

// ── Tool factory ───────────────────────────────────────────────────────────

export interface DataTablesToolOptions {
	allowedActions?: readonly DataTableReadToolAction[];
	/** Set to false for agents without `load_skill`, so descriptions do not point to skills. */
	skillGuidance?: boolean;
}

const LIST_SKILL_GUIDANCE =
	'Load `data-table-manager` via `load_skill` before working with data tables, including ' +
	'natural requests like "what data tables do I have?". For workflow builds that create or ' +
	'write Data Tables, load `data-table-manager` then `workflow-builder` before ' +
	'`workflow_builder_build_workflow`.';

const DESCRIPTIONS: Record<DataTableReadToolAction, string> = {
	list: 'List data tables in a project',
	schema:
		'Get column definitions for a data table. Call before using a table in workflow code — column names are normalized to snake_case.',
	query:
		'Query rows from a data table. Prefer a column filter and a small limit over broad pulls; ' +
		'results include the total matching `count`, so `limit: 1` is enough to check row existence. ' +
		'Keep queries targeted (column filter and/or limit ≤ 5), especially when diagnosing. Never ' +
		'pull a table unfiltered. After a failed or 0-row query, only retry strictly narrower.',
};

function getDescription(action: DataTableReadToolAction, skillGuidance: boolean): string {
	const base = DESCRIPTIONS[action];
	return action === 'list' && skillGuidance ? `${base}. ${LIST_SKILL_GUIDANCE}` : base;
}

function buildReadTool(context: InstanceAiContext, action: DataTableReadToolAction) {
	const name = DATA_TABLE_TOOL_NAME_BY_ACTION[action];
	const tool = new Tool(name);
	for (const [legacyName, actions] of getLegacyBuilderToolActions(name)) {
		tool.legacyActions(legacyName, ...actions);
	}
	switch (action) {
		case 'list':
			return tool
				.input(sanitizeInputSchema(listInputSchema))
				.handler(async (input) => await handleList(context, input));
		case 'schema':
			return tool
				.input(sanitizeInputSchema(schemaInputSchema))
				.handler(async (input) => await handleSchema(context, input));
		case 'query':
			return tool
				.input(sanitizeInputSchema(queryInputSchema))
				.handler(async (input) => await handleQuery(context, input));
	}
}

/**
 * Build the tool that owns one data table read action. A call of the former
 * multi-action tool resolves here through its legacy action mapping.
 */
export function createDataTableTool(
	context: InstanceAiContext,
	action: DataTableReadToolAction,
	{ skillGuidance = true }: Pick<DataTablesToolOptions, 'skillGuidance'> = {},
) {
	return buildReadTool(context, action).description(getDescription(action, skillGuidance)).build();
}

/** Build one tool for each data table read action the caller allows. */
export function createDataTableTools(
	context: InstanceAiContext,
	options: DataTablesToolOptions = {},
) {
	const allowed = new Set(options.allowedActions ?? DATA_TABLE_READ_TOOL_ACTIONS);
	return DATA_TABLE_READ_TOOL_ACTIONS.filter((action) => allowed.has(action)).map((action) =>
		createDataTableTool(context, action, options),
	);
}
