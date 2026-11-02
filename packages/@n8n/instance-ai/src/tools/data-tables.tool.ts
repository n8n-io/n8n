/**
 * Data table tools — one tool for each action of the former multi-action
 * `data_tables` tool. The handlers keep the action so session grant keys and
 * stored calls of the former tool still resolve.
 */
import {
	DATA_TABLE_TOOL_ACTIONS,
	DATA_TABLE_TOOL_NAME_BY_ACTION,
	getLegacyBuilderToolActions,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	buildDataTablesSessionGrantKey,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { DataTableToolAction, InstanceAiApprovalDetails } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';

// ── Shared schemas ─────────────────────────────────────────────────────────

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
	approvalDetails: instanceAiApprovalDetailsSchema.optional(),
	resourceName: z.string().optional(),
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
	"Project ID. Scopes list (defaults to this conversation's project); for id-based actions, disambiguates when `dataTableId` is a name found in multiple accessible projects. Ignored when `dataTableId` is a UUID.";

const dataTableNameDescribe =
	'Data table name for the approval card. Pass whenever known so users see a name instead of an ID.';

const columnNameForCardDescribe =
	'Current column name for the approval card. Pass whenever known so users see a name instead of an ID.';

async function assertTableInThreadProject(
	context: InstanceAiContext,
	input: DataTableReferenceInput,
): Promise<void> {
	await context.assertInThreadProject?.({
		kind: 'data-table',
		id: input.dataTableId,
		projectId: input.projectId,
	});
}

/** Name shown in the approval card title. Falls back to the id when the agent passed no name. */
function dataTableResourceName(input: DataTableReferenceInput): string {
	return input.dataTableName ?? input.dataTableId;
}

function describeRowFilter(filter: z.infer<typeof filterSchema>): string {
	const conditions = {
		eq: 'is',
		neq: 'is not',
		like: 'matches the text pattern',
		ilike: 'matches the text pattern (ignoring case)',
		gt: 'is greater than',
		gte: 'is greater than or equal to',
		lt: 'is less than',
		lte: 'is less than or equal to',
	};
	return filter.filters
		.map(({ columnName, condition, value }) => {
			if (value === null && (condition === 'eq' || condition === 'neq')) {
				return `"${columnName}" ${condition === 'eq' ? 'has no value' : 'has a value'}`;
			}
			if (
				(condition === 'like' || condition === 'ilike') &&
				typeof value === 'string' &&
				!value.includes('%')
			) {
				return `"${columnName}" contains ${JSON.stringify(value)}${condition === 'ilike' ? ' (ignoring case)' : ' (matching case)'}`;
			}
			return `"${columnName}" ${conditions[condition]} ${JSON.stringify(value)}`;
		})
		.join(` ${filter.type} `);
}

const MAX_DESCRIBED_COLUMNS = 5;
const MAX_DESCRIBED_ROWS = 3;

function previewRow(data: Record<string, unknown>) {
	const entries = Object.entries(data);
	return {
		values: entries.slice(0, MAX_DESCRIBED_COLUMNS).map(([column, value]) => {
			const text = value === null || value === undefined ? null : JSON.stringify(value);
			return { column, value: text && text.length > 100 ? `${text.slice(0, 100)}…` : text };
		}),
		remainingColumns: Math.max(0, entries.length - MAX_DESCRIBED_COLUMNS),
	};
}

function describeRowChanges(data: Record<string, unknown>): string {
	const { values, remainingColumns } = previewRow(data);
	const described = values.map(({ column, value }) => `"${column}" to ${value ?? 'no value'}`);
	if (remainingColumns > 0) {
		described.push(`${remainingColumns} more ${remainingColumns === 1 ? 'column' : 'columns'}`);
	}
	return described.join(', ');
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
	currentColumnName: z.string().optional().describe(columnNameForCardDescribe),
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
	currentColumnName: z.string().optional().describe(columnNameForCardDescribe),
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

const ACTION_SCHEMAS = {
	list: listAction,
	schema: schemaAction,
	query: queryAction,
	create: createAction,
	delete: deleteAction,
	'add-column': addColumnAction,
	'delete-column': deleteColumnAction,
	'rename-column': renameColumnAction,
	'insert-rows': insertRowsAction,
	'update-rows': updateRowsAction,
	'delete-rows': deleteRowsAction,
} as const satisfies Record<DataTableToolAction, z.ZodDiscriminatedUnionOption<'action'>>;

type FullInput = {
	[A in DataTableToolAction]: z.infer<(typeof ACTION_SCHEMAS)[A]>;
}[DataTableToolAction];

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

/**
 * Tell the host that the agent worked on a table, so it shows the table's tab.
 * Reads count too, because the frontend also previews a table the agent reads.
 */
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

/**
 * Report a table that a column action changed. The action accepts a table name
 * as `dataTableId`, so resolve it to the table's ID. A failed lookup must not
 * fail the change that already happened.
 */
async function reportChangedDataTable(context: InstanceAiContext, input: DataTableReferenceInput) {
	const table = await resolveDataTableReference(context, input, 'read').catch(() => ({
		dataTableId: input.dataTableId,
		dataTableName: input.dataTableName,
		projectId: input.projectId,
	}));
	await reportDataTableAction(context, {
		id: table.dataTableId,
		name: table.dataTableName,
		projectId: table.projectId,
	});
}

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
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Create the table with ${input.columns.length} ${input.columns.length === 1 ? 'column' : 'columns'}: ${input.columns.map((column) => `"${column.name}"`).join(', ')}`,
			resourceName: input.name,
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
		await reportDataTableAction(context, table);
		return { table };
	} catch (error) {
		// If table already exists, guide the agent to use the existing one
		// rather than throwing — which would cause the agent to waste iterations retrying
		if (isNameConflictError(error)) {
			return {
				denied: true,
				reason: `Table "${input.name}" already exists. Use list_data_tables to find it and get_data_table_schema to check its columns.`,
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message: 'Permanently delete the table and all its rows',
			approvalDetails: { action: 'delete-table' } satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Add column "${input.columnName}" (${input.type})`,
			approvalDetails: {
				action: 'add-column',
				column: input.columnName,
				columnType: input.type,
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
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
	await reportChangedDataTable(context, input);
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete column "${input.currentColumnName ?? input.columnId}" and its values`,
			approvalDetails: {
				action: 'delete-column',
				column: input.currentColumnName ?? input.columnId,
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
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
	await reportChangedDataTable(context, input);
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Rename column "${input.currentColumnName ?? input.columnId}" to "${input.newName}"`,
			approvalDetails: {
				action: 'rename-column',
				column: input.currentColumnName ?? input.columnId,
				newName: input.newName,
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
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
	await reportChangedDataTable(context, input);
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
		await assertTableInThreadProject(context, input);
		const rowDescriptions = input.rows.slice(0, MAX_DESCRIBED_ROWS).map((row, index) => {
			const changes = describeRowChanges(row);
			return `Row ${index + 1}: ${changes ? `set ${changes}` : 'no column values supplied'}`;
		});
		const remaining = input.rows.length - rowDescriptions.length;
		if (remaining > 0) {
			rowDescriptions.push(`${remaining} more ${remaining === 1 ? 'row' : 'rows'}`);
		}
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Add ${input.rows.length} ${input.rows.length === 1 ? 'row' : 'rows'}\n\n${rowDescriptions.join('\n\n')}`,
			approvalDetails: {
				action: 'insert-rows',
				count: input.rows.length,
				rows: input.rows.slice(0, MAX_DESCRIBED_ROWS).map(previewRow),
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'insert-rows', resumeData);

	// State 3: Approved or always_allow — execute
	const result = await context.dataTableService.insertRows(input.dataTableId, input.rows, {
		projectId: input.projectId,
	});
	await reportDataTableAction(context, {
		id: result.dataTableId,
		name: result.tableName,
		projectId: result.projectId,
	});
	return result;
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message:
				input.filter.filters.length === 0
					? `Set ${describeRowChanges(input.data)} in all rows`
					: `Set ${describeRowChanges(input.data)} in rows where ${describeRowFilter(input.filter)}`,
			approvalDetails: {
				action: 'update-rows',
				changes: previewRow(input.data),
				filter: input.filter,
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
			severity: 'warning' as const,
		});
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { denied: true, reason: 'User denied the action' };
	}

	await persistSessionGrantIfRequested(context, 'update-rows', resumeData);

	// State 3: Approved or always_allow — execute
	const result = await context.dataTableService.updateRows(
		input.dataTableId,
		input.filter,
		input.data,
		{ projectId: input.projectId },
	);
	await reportDataTableAction(context, {
		id: result.dataTableId,
		name: result.tableName,
		projectId: result.projectId,
	});
	return result;
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
		await assertTableInThreadProject(context, input);
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete rows where ${describeRowFilter(input.filter)}`,
			approvalDetails: {
				action: 'delete-rows',
				filter: input.filter,
			} satisfies InstanceAiApprovalDetails,
			resourceName: dataTableResourceName(input),
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
	await reportDataTableAction(context, {
		id: result.dataTableId,
		name: result.tableName,
		projectId: result.projectId,
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

export interface DataTablesToolOptions {
	allowedActions?: readonly DataTableToolAction[];
	/** Set to false for agents without `load_skill`, so descriptions do not point to skills. */
	skillGuidance?: boolean;
}

/** Actions whose extra guidance tells the model to load a skill. */
const SKILL_GUIDANCE_ACTIONS = new Set<DataTableToolAction>(['list']);

const READ_ACTIONS = new Set<DataTableToolAction>(['list', 'schema', 'query']);

/** Guidance that the former single tool carried, placed on the tool where it applies. */
const EXTRA_DESCRIPTIONS: Partial<Record<DataTableToolAction, string>> = {
	list:
		'Load `data-table-manager` via `load_skill` before working with data tables, including ' +
		'natural requests like "what data tables do I have?". For workflow builds that create or ' +
		'write Data Tables, load `data-table-manager` then `workflow-builder` before ' +
		'`workflow_builder_build_workflow`.',
	query:
		'Keep queries targeted (column filter and/or limit ≤ 5), especially when diagnosing. Never ' +
		'pull a table unfiltered. After a failed or 0-row query, only retry strictly narrower.',
	create: 'Call get_data_table_schema before you reference the new table in SDK code.',
};

function getActionDescription(action: DataTableToolAction, skillGuidance: boolean): string {
	const base = ACTION_SCHEMAS[action].shape.action.description ?? '';
	const extra =
		!skillGuidance && SKILL_GUIDANCE_ACTIONS.has(action) ? undefined : EXTRA_DESCRIPTIONS[action];
	return extra ? `${base}. ${extra}` : base;
}

const NON_SUSPENDING_CONTEXT: ConfirmationToolContext = {
	resumeData: undefined,
	suspend: async () => {
		throw new Error('This data table tool cannot suspend');
	},
};

/**
 * Build the tool that owns one data table action. A suspended call of the
 * former multi-action tool resumes here through its legacy action mapping.
 */
export function createDataTableTool(
	context: InstanceAiContext,
	action: DataTableToolAction,
	{ skillGuidance = true }: Pick<DataTablesToolOptions, 'skillGuidance'> = {},
) {
	const name = DATA_TABLE_TOOL_NAME_BY_ACTION[action];
	const schema: z.ZodDiscriminatedUnionOption<'action'> = ACTION_SCHEMAS[action];
	const tool = new Tool(name)
		.description(getActionDescription(action, skillGuidance))
		.input(sanitizeInputSchema(schema.omit({ action: true })));
	for (const [legacyName, actions] of getLegacyBuilderToolActions(name)) {
		tool.legacyActions(legacyName, ...actions);
	}
	// The input schema omits `action`, so restore it for the shared handlers.
	const withAction = (input: unknown) =>
		({ ...(typeof input === 'object' && input !== null ? input : {}), action }) as FullInput;

	if (READ_ACTIONS.has(action)) {
		return tool
			.handler(
				async (input) =>
					await runDataTableAction(context, withAction(input), NON_SUSPENDING_CONTEXT),
			)
			.build();
	}

	return tool
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input, ctx) => await runDataTableAction(context, withAction(input), ctx))
		.build();
}

/** Build one tool for each data table action the caller allows. */
export function createDataTableTools(
	context: InstanceAiContext,
	options: DataTablesToolOptions = {},
) {
	const allowed = new Set(options.allowedActions ?? DATA_TABLE_TOOL_ACTIONS);
	return DATA_TABLE_TOOL_ACTIONS.filter((action) => allowed.has(action)).map((action) =>
		createDataTableTool(context, action, options),
	);
}

async function runDataTableAction(
	context: InstanceAiContext,
	input: FullInput,
	ctx: ConfirmationToolContext,
) {
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
}
