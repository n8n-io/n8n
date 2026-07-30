import type { User } from '@n8n/db';
import z from 'zod';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import {
	columnNameSchema,
	dataTableColumnSchema,
	dataTableColumnTypeSchema,
	dataTableProjectIdSchema,
} from '../schemas';

const TOOL_NAME = 'manage_data_table';

const ADD_ROWS_MAX = 1000;

const OPERATIONS = [
	'create',
	'rename',
	'add_column',
	'delete_column',
	'rename_column',
	'add_rows',
] as const;

const tableNameSchema = z.string().min(1).max(128);

const createColumnSchema = z.object({
	name: columnNameSchema,
	type: dataTableColumnTypeSchema,
});

const rowsSchema = z
	.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])))
	.min(1)
	.max(ADD_ROWS_MAX);

// The advertised schema stays flat because MCP tool input schemas must be a
// single object shape; which fields each operation requires is enforced at
// runtime by `operationSchema` below.
const inputSchema = {
	operation: z
		.enum(OPERATIONS)
		.describe(
			'The operation to perform: "create" a data table, "rename" a data table, "add_column", "delete_column", "rename_column", or "add_rows" to insert rows.',
		),
	projectId: dataTableProjectIdSchema,
	dataTableId: z
		.string()
		.optional()
		.describe(
			'The ID of the data table to operate on. Required for every operation except "create". Use search_data_tables to find it.',
		),
	name: z
		.string()
		.optional()
		.describe(
			'The new name. Required for "create" and "rename" (table name, max 128 chars, unique within the project) and for "add_column" and "rename_column" (column name: must start with a letter, contain only letters, numbers, and underscores, max 63 chars).',
		),
	columns: z
		.array(createColumnSchema)
		.optional()
		.describe('The columns of the new data table. Required for "create"; at least one column.'),
	columnType: dataTableColumnTypeSchema
		.optional()
		.describe('The data type of the new column. Required for "add_column".'),
	columnId: z
		.string()
		.optional()
		.describe(
			'The ID of the column to operate on. Required for "delete_column" and "rename_column".',
		),
	rows: rowsSchema
		.optional()
		.describe(
			`Array of row objects to insert, each mapping column names to values. Required for "add_rows". Maximum ${ADD_ROWS_MAX} rows per call.`,
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean().describe('Whether the operation succeeded'),
	message: z.string().describe('Description of the result'),
	dataTable: z
		.object({
			id: z.string().describe('The unique identifier of the created data table'),
			name: z.string().describe('The name of the created data table'),
			projectId: z.string().describe('The project ID of the created data table'),
		})
		.optional()
		.describe('The created data table ("create" only)'),
	column: dataTableColumnSchema
		.omit({ index: true })
		.optional()
		.describe('The affected column ("add_column" and "rename_column" only)'),
	insertedCount: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Number of rows successfully inserted ("add_rows" only)'),
} satisfies z.ZodRawShape;

const baseFields = { projectId: dataTableProjectIdSchema };

const operationSchema = z.discriminatedUnion('operation', [
	z.object({
		operation: z.literal('create'),
		...baseFields,
		name: tableNameSchema,
		columns: z.array(createColumnSchema).min(1),
	}),
	z.object({
		operation: z.literal('rename'),
		...baseFields,
		dataTableId: z.string(),
		name: tableNameSchema,
	}),
	z.object({
		operation: z.literal('add_column'),
		...baseFields,
		dataTableId: z.string(),
		name: columnNameSchema,
		columnType: dataTableColumnTypeSchema,
	}),
	z.object({
		operation: z.literal('delete_column'),
		...baseFields,
		dataTableId: z.string(),
		columnId: z.string(),
	}),
	z.object({
		operation: z.literal('rename_column'),
		...baseFields,
		dataTableId: z.string(),
		columnId: z.string(),
		name: columnNameSchema,
	}),
	z.object({
		operation: z.literal('add_rows'),
		...baseFields,
		dataTableId: z.string(),
		rows: rowsSchema,
	}),
]);

type ManageDataTableArgs = z.infer<typeof operationSchema>;

type OperationOutput = {
	success: true;
	message: string;
	dataTable?: { id: string; name: string; projectId: string };
	column?: { id: string; name: string; type: string };
	insertedCount?: number;
};

const executeOperation = async (
	args: ManageDataTableArgs,
	dataTableOps: DataTableUserOperations,
): Promise<{ output: OperationOutput; telemetryData?: Record<string, unknown> }> => {
	switch (args.operation) {
		case 'create': {
			const created = await dataTableOps.createDataTable(args.projectId, {
				name: args.name,
				columns: args.columns.map((col) => ({ name: col.name, type: col.type })),
			});

			return {
				output: {
					success: true,
					message: `Data table '${created.name}' created`,
					dataTable: { id: created.id, name: created.name, projectId: created.projectId },
				},
				telemetryData: { dataTableId: created.id },
			};
		}
		case 'rename': {
			await dataTableOps.updateDataTable(args.dataTableId, args.projectId, { name: args.name });

			return {
				output: { success: true, message: `Data table renamed to '${args.name}'` },
			};
		}
		case 'add_column': {
			const column = await dataTableOps.addColumn(args.dataTableId, args.projectId, {
				name: args.name,
				type: args.columnType,
			});

			return {
				output: {
					success: true,
					message: `Column '${args.name}' added with type '${args.columnType}'`,
					column: { id: column.id, name: column.name, type: column.type },
				},
			};
		}
		case 'delete_column': {
			await dataTableOps.deleteColumn(args.dataTableId, args.projectId, args.columnId);

			return {
				output: { success: true, message: `Column '${args.columnId}' deleted` },
			};
		}
		case 'rename_column': {
			const column = await dataTableOps.renameColumn(
				args.dataTableId,
				args.projectId,
				args.columnId,
				{
					name: args.name,
				},
			);

			return {
				output: {
					success: true,
					message: `Column renamed to '${args.name}'`,
					column: { id: column.id, name: column.name, type: column.type },
				},
			};
		}
		case 'add_rows': {
			const result = await dataTableOps.insertRows(
				args.dataTableId,
				args.projectId,
				args.rows,
				'count',
			);

			return {
				output: {
					success: true,
					message: `Inserted ${result.insertedRows} row(s)`,
					insertedCount: result.insertedRows,
				},
				telemetryData: { insertedCount: result.insertedRows },
			};
		}
	}
};

export const createManageDataTableTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: TOOL_NAME,
	config: {
		description:
			'Manage data tables: create a data table, rename it, add/delete/rename columns, or insert rows. Set "operation" to pick the action; each operation requires a different subset of the parameters (see parameter descriptions). Use search_projects to find a project ID and search_data_tables to find data table and column IDs first. "delete_column" permanently removes the column and all its data.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Manage Data Table',
			readOnlyHint: false,
			// Worst case across operations: delete_column permanently removes data.
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async (args) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: TOOL_NAME,
			parameters: {
				operation: args.operation,
				projectId: args.projectId,
				dataTableId: args.dataTableId,
				columnId: args.columnId,
				columnCount: args.columns?.length,
				rowCount: args.rows?.length,
			},
		};

		const fail = (message: string) => {
			telemetryPayload.results = { success: false, error: message };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { success: false, message };
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		};

		const parsed = operationSchema.safeParse(args);
		if (!parsed.success) {
			const details = parsed.error.issues
				.map((issue) =>
					issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
				)
				.join('; ');
			return fail(`Invalid parameters for operation '${args.operation}': ${details}`);
		}

		try {
			const { output, telemetryData } = await executeOperation(parsed.data, dataTableOps);

			telemetryPayload.results = telemetryData
				? { success: true, data: telemetryData }
				: { success: true };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return fail(error instanceof Error ? error.message : String(error));
		}
	},
});
