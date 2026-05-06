/**
 * Consolidated data-tables tool — list, schema, query, create, delete,
 * add-column, delete-column, rename-column, insert-rows, update-rows, delete-rows.
 */
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Shared schemas ─────────────────────────────────────────────────────────

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

const listAction = z.object({
	action: z.literal('list').describe('List data tables in a project'),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const schemaAction = z.object({
	action: z.literal('schema').describe('Get column definitions for a data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
	projectId: z.string().optional().describe(projectIdDescribe),
});

const queryAction = z.object({
	action: z.literal('query').describe('Query rows from a data table with optional filtering'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
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
	projectId: z.string().optional().describe(projectIdDescribe),
});

const addColumnAction = z.object({
	action: z.literal('add-column').describe('Add a new column to an existing data table'),
	dataTableId: z
		.string()
		.describe(
			'ID (UUID) of the data table. A name also works as a fallback, but pass an id when possible.',
		),
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
	projectId: z.string().optional().describe(projectIdDescribe),
	filter: filterSchemaWithMinOne.describe('Row filter conditions'),
});

const readOnlyActions = [listAction, schemaAction, queryAction] as const;

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

type ReadOnlyInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof readOnlyActions>>;
type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

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
	const columns = await context.dataTableService.getSchema(input.dataTableId, {
		projectId: input.projectId,
	});
	return { columns };
}

async function handleQuery(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'query' }>,
) {
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
			...result,
			hint: `${remaining} more rows available. Use plan with a manage-data-tables task for bulk operations.`,
		};
	}

	return result;
}

async function handleCreate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.createDataTable === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.createDataTable !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		let message = `Create data table "${input.name}"?`;
		if (input.projectId) {
			const project = await context.workspaceService?.getProject?.(input.projectId);
			const projectLabel = project?.name ?? input.projectId;
			message = `Create data table "${input.name}" in project "${projectLabel}"?`;
		}
		await suspend?.({
			requestId: nanoid(),
			message,
			severity: 'info' as const,
		});
		return {};
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
				reason: `Table "${input.name}" already exists. Use list-data-tables to find it and get-data-table-schema to check its columns.`,
			};
		}
		throw error;
	}
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.deleteDataTable === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteDataTable !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Delete data table "${input.dataTableId}"? This will permanently remove the table and all its data.`,
			severity: 'destructive' as const,
		});
		return { success: false };
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Add column "${input.columnName}" (${input.type}) to data table "${input.dataTableId}"?`,
			severity: 'warning' as const,
		});
		return {};
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Delete column "${input.columnId}" from data table "${input.dataTableId}"? All data in this column will be permanently lost.`,
			severity: 'destructive' as const,
		});
		return { success: false };
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.mutateDataTableSchema === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.mutateDataTableSchema !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Rename column "${input.columnId}" to "${input.newName}" in data table "${input.dataTableId}"?`,
			severity: 'warning' as const,
		});
		return { success: false };
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.mutateDataTableRows === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Insert ${input.rows.length} row(s) into data table "${input.dataTableId}"?`,
			severity: 'warning' as const,
		});
		return {};
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.mutateDataTableRows === 'blocked') {
		return { denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.mutateDataTableRows !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Update rows in data table "${input.dataTableId}"?`,
			severity: 'warning' as const,
		});
		return {};
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
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

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
		await suspend?.({
			requestId: nanoid(),
			message: `Delete rows where ${filterDesc}? This cannot be undone.`,
			severity: 'destructive' as const,
		});
		return { success: false };
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

export function createDataTablesTool(
	context: InstanceAiContext,
	surface: 'full' | 'orchestrator' = 'full',
) {
	if (surface === 'orchestrator') {
		const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...readOnlyActions]));

		return createTool({
			id: 'data-tables',
			description: 'Manage data tables — list, get schema, and query rows.',
			inputSchema,
			execute: async (input: ReadOnlyInput) => {
				switch (input.action) {
					case 'list':
						return await handleList(context, input);
					case 'schema':
						return await handleSchema(context, input);
					case 'query':
						return await handleQuery(context, input);
				}
			},
		});
	}

	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return createTool({
		id: 'data-tables',
		description: 'Manage data tables — list, query, create, modify columns, and manage rows.',
		inputSchema,
		suspendSchema: confirmationSuspendSchema,
		resumeSchema: confirmationResumeSchema,
		execute: async (input: FullInput, ctx) => {
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
		},
	});
}
