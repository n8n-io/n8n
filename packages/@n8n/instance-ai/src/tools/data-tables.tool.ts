/**
 * Consolidated data-tables tool — list, schema, query, create, delete,
 * add-column, delete-column, rename-column, insert-rows, update-rows, delete-rows.
 */
import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
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
			condition: z.enum(['eq', 'neq', 'like', 'gt', 'gte', 'lt', 'lte']),
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
				condition: z.enum(['eq', 'neq', 'like', 'gt', 'gte', 'lt', 'lte']),
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

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

type ResumeData = z.infer<typeof confirmationResumeSchema>;

interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
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

const projectIdDescribe =
	'Project ID. For list/create, scopes the operation to this project (defaults to personal). For id-based actions (schema, query, delete, add-column, delete-column, rename-column, insert/update/delete-rows), disambiguates when `dataTableId` is a name that exists in multiple accessible projects. Ignored when `dataTableId` is a UUID; rejected when the UUID belongs to a different project.';

const dataTableNameDescribe =
	'Human-readable name of the data table, shown alongside the ID in the approval card. Pass this whenever you know it (e.g. from a prior `list` call) so users see a recognisable label instead of a bare UUID.';

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
	action: z.literal('query').describe('Query rows from a data table with optional filtering'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	dataTableName: z.string().optional().describe(dataTableNameDescribe),
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchema.optional().describe('Row filter conditions'),
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe('Max rows to return (default 50)'),
	offset: z.number().int().min(0).optional().describe('Number of rows to skip'),
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
	filter: filterSchema.describe('Row filter conditions'),
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
	filter: filterSchemaWithMinOne.describe('Row filter conditions'),
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

async function handleQuery(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'query' }>,
) {
	const table = await resolveDataTableReference(context, input, 'readRow');
	const result = await context.dataTableService.queryRows(input.dataTableId, {
		filter: input.filter,
		limit: input.limit,
		offset: input.offset,
		projectId: input.projectId,
	});

	const returnedRows = result.data.length;
	const remaining = result.count - (input.offset ?? 0) - returnedRows;

	if (remaining > 0) {
		return {
			...table,
			...result,
			hint: `${remaining} more rows available. Use additional paginated data-tables queries for bulk operations.`,
		};
	}

	return { ...table, ...result };
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

	const needsApproval = context.permissions?.createDataTable !== 'always_allow';

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

	const needsApproval = context.permissions?.deleteDataTable !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

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

	const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

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
				'For workflow building, use list, create, and schema before referencing tables in SDK code.',
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
