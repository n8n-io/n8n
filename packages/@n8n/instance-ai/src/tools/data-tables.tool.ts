/**
 * Consolidated data-tables tool — list, schema, query, create, delete,
 * add-column, delete-column, rename-column, insert-rows, update-rows, delete-rows.
 */
import { Tool } from '@n8n/agents';
import {
	instanceAiApprovalResumeSchema,
	buildDataTablesSessionGrantKey,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { DATA_TABLES_TOOL_ID } from './tool-ids';

// ── Shared schemas ─────────────────────────────────────────────────────────

export { DATA_TABLES_TOOL_ID };

const columnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

const filterSchema = z.object({
	type: z.enum(['and', 'or']).describe('Combine filters with AND or OR'),
	filters: z.array(
		z.object({
			columnName: z.string(),
			condition: z.enum(['eq', 'neq', 'like', 'ilike', 'gt', 'gte', 'lt', 'lte']),
			value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
		}),
	),
});

const filterSchemaWithMinOne = z.object({
	type: z.enum(['and', 'or']).describe('Combine filters with AND or OR'),
	filters: z
		.array(
			z.object({
				columnName: z.string(),
				condition: z.enum(['eq', 'neq', 'like', 'ilike', 'gt', 'gte', 'lt', 'lte']),
				value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
			}),
		)
		.min(1),
});

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = instanceAiApprovalResumeSchema;

type ResumeData = z.infer<typeof confirmationResumeSchema>;

interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

function hasSessionGrant(context: InstanceAiContext, action: string): boolean {
	return context.sessionApprovedToolKeys?.has(buildDataTablesSessionGrantKey(action)) === true;
}

async function persistSessionGrantIfRequested(
	context: InstanceAiContext,
	action: string,
	resumeData: ResumeData | undefined,
): Promise<void> {
	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(buildDataTablesSessionGrantKey(action));
	}
}

/**
 * Check if an error (or its cause chain) is a DataTableNameConflictError.
 * The error class lives in packages/cli so we can't import it directly —
 * instead we match on the class name through the cause chain.
 */
function isNameConflictError(error: unknown): boolean {
	let current: unknown = error;
	while (current instanceof Error) {
		if (current.constructor.name === 'DataTableNameConflictError') return true;
		current = (current as Error & { cause?: unknown }).cause;
	}
	return false;
}

// ── Action schemas ─────────────────────────────────────────────────────────

/** Cells can hold arbitrarily large values (e.g. inline base64 images); cap what a
 *  query feeds back to the model so one broad query cannot flood the conversation. */
const MAX_CELL_CHARS = 1024;

/** When full cell values are requested, cap rows per call — a few intact blob
 *  cells are useful; dozens re-create the flood truncation exists to prevent. */
const MAX_FULL_VALUE_ROWS = 5;

const filterDescribe =
	'Row filter conditions. For text matching use `ilike` (case-insensitive contains); `like` is ' +
	'case-sensitive. Values without `%` are wrapped as `%value%`.';

const projectIdDescribe =
	'Project ID. Scopes list/create (defaults to personal); for id-based actions, disambiguates when `dataTableId` is a name found in multiple accessible projects. Ignored when `dataTableId` is a UUID.';

const dataTableNameDescribe =
	'Data table name, shown next to the ID in the approval card. Pass whenever known so users see a recognisable label instead of a bare UUID.';

/** Renders `"{name} (ID: {id})"` when the agent supplied a name, otherwise the bare id. */
function buildDataTableLabel(input: { dataTableId: string; dataTableName?: string }): string {
	return input.dataTableName
		? `${input.dataTableName} (ID: ${input.dataTableId})`
		: input.dataTableId;
}

const listAction = z.object({
	action: z.literal('list').describe('List data tables in a project'),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const schemaAction = z.object({
	action: z
		.literal('schema')
		.describe(
			'Get column definitions for a data table. Call before using a table in workflow code — column names are normalized to snake_case.',
		),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const queryAction = z.object({
	action: z
		.literal('query')
		.describe(
			'Query rows from a data table. Prefer a column filter and a small limit over broad pulls; ' +
				'results include the total matching `count`, so `limit: 1` is enough to check row existence.',
		),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
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

const createAction = z.object({
	action: z.literal('create').describe('Create a new data table with typed columns'),
	name: z.string().min(1).max(128).describe('Table name'),
	projectId: z.string().optional().describe(projectIdDescribe),
	columns: z
		.array(
			z.object({
				name: z.string().describe('Column name (alphanumeric + underscores)'),
				type: columnTypeSchema.describe('Column data type'),
			}),
		)
		.min(1)
		.describe('Column definitions'),
});

const deleteAction = z.object({
	action: z.literal('delete').describe('Permanently delete a data table and all its rows'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const addColumnAction = z.object({
	action: z.literal('add-column').describe('Add a new column to an existing data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnName: z.string().describe('Column name (alphanumeric + underscores)'),
	type: columnTypeSchema.describe('Column data type'),
});

const deleteColumnAction = z.object({
	action: z.literal('delete-column').describe('Remove a column from a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnId: z.string().describe('ID of the column'),
});

const renameColumnAction = z.object({
	action: z.literal('rename-column').describe('Rename a column in a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	columnId: z.string().describe('ID of the column'),
	newName: z.string().describe('New column name'),
});

const insertRowsAction = z.object({
	action: z.literal('insert-rows').describe('Insert rows into a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	rows: z
		.array(z.record(z.unknown()))
		.min(1)
		.max(100)
		.describe('Array of row objects (column name → value)'),
});

const updateRowsAction = z.object({
	action: z.literal('update-rows').describe('Update rows matching a filter in a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchema.describe(filterDescribe),
	data: z.record(z.unknown()).describe('Column values to set on matching rows'),
});

const deleteRowsAction = z.object({
	action: z
		.literal('delete-rows')
		.describe(
			'Delete rows matching a filter from a data table. At least one filter condition is required.',
		),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchemaWithMinOne.describe(filterDescribe),
});

const allActions = [
	listAction,
	schemaAction,
	queryAction,
	createAction,
	deleteAction,
	addColumnAction,
	deleteColumnAction,
	renameColumnAction,
	insertRowsAction,
	updateRowsAction,
	deleteRowsAction,
] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

type DataTableReferenceInput = {
	dataTableId: string;
	dataTableName?: string;
	projectId?: string;
};

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

async function handleList(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const tables = await context.dataTableService.list({ projectId: input.projectId });
	return { tables };
}

async function handleSchema(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'schema' }>,
) {
	const table = await resolveDataTableReference(context, input, 'read');
	const columns = await context.dataTableService.getSchema(input.dataTableId, {
		projectId: input.projectId,
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

async function handleQuery(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'query' }>,
) {
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
			`${remaining} more rows available. Use additional paginated data-tables queries for bulk operations.`,
		);
	}

	const response = { ...table, count: result.count, data };
	return hints.length > 0 ? { ...response, hint: hints.join(' ') } : response;
}

async function handleCreate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.createDataTable === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.createDataTable !== 'always_allow' && !hasSessionGrant(context, 'create');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		let message = `Create ${input.name}`;
		if (input.projectId) {
			const project = await context.workspaceService?.getProject?.(input.projectId);
			const projectLabel = project?.name ?? input.projectId;
			message = `Create ${input.name} in project ${projectLabel}`;
		}
		return await ctx.suspend({
			requestId: nanoid(),
			message,
			severity: 'info' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'create', resumeData);

	// State 3: Approved or always_allow — execute
	try {
		const table = await context.dataTableService.create(input.name, input.columns, {
			projectId: input.projectId,
		});
		return { table };
	} catch (error) {
		// If table already exists, guide the agent to use the existing one
		// rather than throwing — which would cause the agent to waste iterations retrying
		if (isNameConflictError(error)) {
			return {
				denied: true,
				reason: `Table "${input.name}" already exists. Use data-tables(action="list") to find it and data-tables(action="schema") to check its columns.`,
			};
		}
		throw error;
	}
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.deleteDataTable === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.deleteDataTable !== 'always_allow' && !hasSessionGrant(context, 'delete');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete ${buildDataTableLabel(input)}`,
			severity: 'destructive' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'delete', resumeData);

	// State 3: Approved or always_allow — execute
	await context.dataTableService.delete(input.dataTableId, { projectId: input.projectId });
	return { success: true };
}

async function handleAddColumn(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'add-column' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableSchema !== 'always_allow' &&
		!hasSessionGrant(context, 'add-column');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Add ${input.columnName} (${input.type}) to ${buildDataTableLabel(input)}`,
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'add-column', resumeData);

	// State 3: Approved or always_allow — execute
	const column = await context.dataTableService.addColumn(
		input.dataTableId,
		{ name: input.columnName, type: input.type },
		{ projectId: input.projectId },
	);
	return { column };
}

async function handleDeleteColumn(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete-column' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableSchema !== 'always_allow' &&
		!hasSessionGrant(context, 'delete-column');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete ${input.columnId} from ${buildDataTableLabel(input)}`,
			severity: 'destructive' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'delete-column', resumeData);

	// State 3: Approved or always_allow — execute
	await context.dataTableService.deleteColumn(input.dataTableId, input.columnId, {
		projectId: input.projectId,
	});
	return { success: true };
}

async function handleRenameColumn(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'rename-column' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableSchema !== 'always_allow' &&
		!hasSessionGrant(context, 'rename-column');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Rename ${input.columnId} to ${input.newName} in ${buildDataTableLabel(input)}`,
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'rename-column', resumeData);

	// State 3: Approved or always_allow — execute
	await context.dataTableService.renameColumn(input.dataTableId, input.columnId, input.newName, {
		projectId: input.projectId,
	});
	return { success: true };
}

async function handleInsertRows(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'insert-rows' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableRows === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableRows !== 'always_allow' &&
		!hasSessionGrant(context, 'insert-rows');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Insert ${input.rows.length} row(s) into ${buildDataTableLabel(input)}`,
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'insert-rows', resumeData);

	// State 3: Approved or always_allow — execute
	return await context.dataTableService.insertRows(input.dataTableId, input.rows, {
		projectId: input.projectId,
	});
}

async function handleUpdateRows(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'update-rows' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableRows === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableRows !== 'always_allow' &&
		!hasSessionGrant(context, 'update-rows');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Update rows in ${buildDataTableLabel(input)}`,
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'update-rows', resumeData);

	// State 3: Approved or always_allow — execute
	return await context.dataTableService.updateRows(input.dataTableId, input.filter, input.data, {
		projectId: input.projectId,
	});
}

async function handleDeleteRows(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete-rows' }>,
	ctx: ConfirmationToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.mutateDataTableRows === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval =
		context.permissions?.mutateDataTableRows !== 'always_allow' &&
		!hasSessionGrant(context, 'delete-rows');

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const filterDesc = input.filter.filters
			.map(
				(f: {
					columnName: string;
					condition: string;
					value: string | number | boolean | null;
				}) => `${f.columnName} ${f.condition} ${String(f.value)}`,
			)
			.join(` ${input.filter.type} `);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete rows from ${buildDataTableLabel(input)} where ${filterDesc}`,
			severity: 'destructive' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'delete-rows', resumeData);

	// State 3: Approved or always_allow — execute
	const result = await context.dataTableService.deleteRows(input.dataTableId, input.filter, {
		projectId: input.projectId,
	});
	return {
		success: true,
		deletedCount: result.deletedCount,
		dataTableId: result.dataTableId,
		tableName: result.tableName,
		projectId: result.projectId,
	};
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createDataTablesTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(DATA_TABLES_TOOL_ID)
		.description(
			'Manage data tables — list, query, create, modify columns, and manage rows. ' +
				'Load `data-table-manager` via `load_skill` before calling this tool — including natural ' +
				'list/show requests like "what data tables do I have?" or "show/list my tables". ' +
				'For workflow builds that create or write Data Tables, load `data-table-manager` then ' +
				'`workflow-builder` before `build-workflow`. Use list, create, and schema before ' +
				'referencing tables in SDK code. Keep queries targeted (column filter and/or limit ≤ 5), ' +
				'especially when diagnosing — never pull a table unfiltered, and after a failed or 0-row ' +
				'query only retry strictly narrower.',
		)
		.input(inputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'schema':
					return await handleSchema(context, input);
				case 'query':
					return await handleQuery(context, input);
				case 'create':
					return await handleCreate(context, input, ctx);
				case 'delete':
					return await handleDelete(context, input, ctx);
				case 'add-column':
					return await handleAddColumn(context, input, ctx);
				case 'delete-column':
					return await handleDeleteColumn(context, input, ctx);
				case 'rename-column':
					return await handleRenameColumn(context, input, ctx);
				case 'insert-rows':
					return await handleInsertRows(context, input, ctx);
				case 'update-rows':
					return await handleUpdateRows(context, input, ctx);
				case 'delete-rows':
					return await handleDeleteRows(context, input, ctx);
			}
		})
		.build();
}
