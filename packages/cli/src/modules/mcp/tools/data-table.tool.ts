import type { ListDataTableQueryDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { dataTableColumnSchema, dataTableColumnTypeSchema, dataTableSchema } from './schemas';

import type { DataTableAggregateService } from '@/modules/data-table/data-table-aggregate.service';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { Telemetry } from '@/telemetry';

// #region Search Data Tables

const SEARCH_MAX_RESULTS = 100;

const searchInputSchema = {
	query: z
		.string()
		.optional()
		.describe('Filter data tables by name (case-insensitive partial match)'),
	projectId: z.string().optional().describe('Filter by project ID'),
	limit: z
		.number()
		.int()
		.positive()
		.max(SEARCH_MAX_RESULTS)
		.optional()
		.describe(`Limit the number of results (max ${SEARCH_MAX_RESULTS})`),
} satisfies z.ZodRawShape;

const searchOutputSchema = {
	data: z.array(dataTableSchema).describe('List of data tables matching the query'),
	count: z.number().int().min(0).describe('Total number of matching data tables'),
} satisfies z.ZodRawShape;

export const createSearchDataTablesTool = (
	user: User,
	dataTableAggregateService: DataTableAggregateService,
	telemetry: Telemetry,
): ToolDefinition<typeof searchInputSchema> => ({
	name: 'search_data_tables',
	config: {
		description:
			'Search for data tables accessible to the current user. Use this to find a data table ID before modifying or adding data to it.',
		inputSchema: searchInputSchema,
		outputSchema: searchOutputSchema,
		annotations: {
			title: 'Search Data Tables',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		query,
		projectId,
		limit = SEARCH_MAX_RESULTS,
	}: {
		query?: string;
		projectId?: string;
		limit?: number;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'search_data_tables',
			parameters: { query, projectId, limit },
		};

		try {
			const safeLimit = Math.min(Math.max(1, limit), SEARCH_MAX_RESULTS);

			const result = await dataTableAggregateService.getManyAndCount(user, {
				take: safeLimit,
				filter: {
					...(query ? { name: query } : {}),
					...(projectId ? { projectId } : {}),
				},
			} as ListDataTableQueryDto);

			const data = result.data.map((table) => ({
				id: table.id,
				name: table.name,
				projectId: table.projectId,
				createdAt: table.createdAt.toISOString(),
				updatedAt: table.updatedAt.toISOString(),
				columns: (table.columns ?? []).map((col) => ({
					id: col.id,
					name: col.name,
					type: col.type,
					index: col.index,
				})),
			}));

			telemetryPayload.results = {
				success: true,
				data: { count: result.count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { data, count: result.count };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { data: [], count: 0, error: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

// #endregion

// #region Create Data Table

const columnSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(63)
		.regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
		.describe(
			'Column name. Must start with a letter, contain only letters, numbers, and underscores (max 63 chars)',
		),
	type: dataTableColumnTypeSchema,
});

const createInputSchema = {
	projectId: z.string().describe('The project ID where the data table will be created'),
	name: z
		.string()
		.min(1)
		.max(128)
		.describe('The name of the data table (must be unique within the project)'),
	columns: z
		.array(columnSchema)
		.min(1)
		.describe('The columns to create in the data table. At least one column is required.'),
} satisfies z.ZodRawShape;

const createOutputSchema = {
	id: z.string().describe('The unique identifier of the created data table'),
	name: z.string().describe('The name of the created data table'),
	projectId: z.string().describe('The project ID of the created data table'),
	columns: z
		.array(dataTableColumnSchema.omit({ index: true }))
		.describe('The columns created in the data table'),
} satisfies z.ZodRawShape;

export const createCreateDataTableTool = (
	user: User,
	dataTableService: DataTableService,
	telemetry: Telemetry,
): ToolDefinition<typeof createInputSchema> => ({
	name: 'create_data_table',
	config: {
		description:
			'Create a new data table with the specified columns. Use search_projects to find a project ID first.',
		inputSchema: createInputSchema,
		outputSchema: createOutputSchema,
		annotations: {
			title: 'Create Data Table',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		projectId,
		name,
		columns,
	}: {
		projectId: string;
		name: string;
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'create_data_table',
			parameters: { projectId, name, columnCount: columns.length },
		};

		try {
			const result = await dataTableService.createDataTable(projectId, {
				name,
				columns: columns.map((col) => ({
					name: col.name,
					type: col.type,
				})),
			});

			const tableColumns = await dataTableService.getColumns(result.id, projectId);

			const output = {
				id: result.id,
				name: result.name,
				projectId: result.projectId,
				columns: tableColumns.map((col) => ({
					id: col.id,
					name: col.name,
					type: col.type,
				})),
			};

			telemetryPayload.results = {
				success: true,
				data: { dataTableId: result.id },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

// #endregion

// #region Modify Data Table

const modifyInputSchema = {
	dataTableId: z.string().describe('The ID of the data table to modify'),
	projectId: z.string().describe('The project ID the data table belongs to'),
	operation: z
		.enum(['rename_table', 'add_column', 'delete_column', 'rename_column'])
		.describe('The modification operation to perform'),
	name: z
		.string()
		.optional()
		.describe(
			"For 'rename_table': the new table name. For 'add_column': the new column name. For 'rename_column': the new column name.",
		),
	columnId: z
		.string()
		.optional()
		.describe("The column ID to operate on (required for 'delete_column' and 'rename_column')"),
	columnType: dataTableColumnTypeSchema
		.optional()
		.describe("The data type of the new column (required for 'add_column')"),
} satisfies z.ZodRawShape;

const modifyOutputSchema = {
	success: z.boolean().describe('Whether the operation succeeded'),
	message: z.string().describe('Description of the result'),
	column: dataTableColumnSchema
		.omit({ index: true })
		.optional()
		.describe('The created or updated column (for add_column and rename_column operations)'),
} satisfies z.ZodRawShape;

export const createModifyDataTableTool = (
	user: User,
	dataTableService: DataTableService,
	telemetry: Telemetry,
): ToolDefinition<typeof modifyInputSchema> => ({
	name: 'modify_data_table',
	config: {
		description:
			'Modify a data table schema or configuration. Supports renaming the table, adding columns, deleting columns, and renaming columns.',
		inputSchema: modifyInputSchema,
		outputSchema: modifyOutputSchema,
		annotations: {
			title: 'Modify Data Table',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		operation,
		name,
		columnId,
		columnType,
	}: {
		dataTableId: string;
		projectId: string;
		operation: 'rename_table' | 'add_column' | 'delete_column' | 'rename_column';
		name?: string;
		columnId?: string;
		columnType?: 'string' | 'number' | 'boolean' | 'date';
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'modify_data_table',
			parameters: { dataTableId, projectId, operation },
		};

		try {
			let output: {
				success: boolean;
				message: string;
				column?: { id: string; name: string; type: string };
			};

			switch (operation) {
				case 'rename_table': {
					if (!name) {
						throw new Error("'name' is required for the 'rename_table' operation");
					}
					await dataTableService.updateDataTable(dataTableId, projectId, { name });
					output = { success: true, message: `Data table renamed to '${name}'` };
					break;
				}

				case 'add_column': {
					if (!name) {
						throw new Error("'name' is required for the 'add_column' operation");
					}
					if (!columnType) {
						throw new Error("'columnType' is required for the 'add_column' operation");
					}
					const column = await dataTableService.addColumn(dataTableId, projectId, {
						name,
						type: columnType,
					});
					output = {
						success: true,
						message: `Column '${name}' added with type '${columnType}'`,
						column: { id: column.id, name: column.name, type: column.type },
					};
					break;
				}

				case 'delete_column': {
					if (!columnId) {
						throw new Error("'columnId' is required for the 'delete_column' operation");
					}
					await dataTableService.deleteColumn(dataTableId, projectId, columnId);
					output = { success: true, message: `Column '${columnId}' deleted` };
					break;
				}

				case 'rename_column': {
					if (!columnId) {
						throw new Error("'columnId' is required for the 'rename_column' operation");
					}
					if (!name) {
						throw new Error("'name' is required for the 'rename_column' operation");
					}
					const renamedColumn = await dataTableService.renameColumn(
						dataTableId,
						projectId,
						columnId,
						{ name },
					);
					output = {
						success: true,
						message: `Column renamed to '${name}'`,
						column: { id: renamedColumn.id, name: renamedColumn.name, type: renamedColumn.type },
					};
					break;
				}
			}

			telemetryPayload.results = {
				success: true,
				data: { operation },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

// #endregion

// #region Add Data Table Rows

const ADD_ROWS_MAX = 1000;

const addRowsInputSchema = {
	dataTableId: z.string().describe('The ID of the data table to insert rows into'),
	projectId: z.string().describe('The project ID the data table belongs to'),
	rows: z
		.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])))
		.min(1)
		.max(ADD_ROWS_MAX)
		.describe(
			`Array of row objects to insert. Each object maps column names to values. Maximum ${ADD_ROWS_MAX} rows per call.`,
		),
} satisfies z.ZodRawShape;

const addRowsOutputSchema = {
	success: z.boolean().describe('Whether the insert operation succeeded'),
	insertedCount: z.number().int().min(0).describe('Number of rows successfully inserted'),
} satisfies z.ZodRawShape;

export const createAddDataTableRowsTool = (
	user: User,
	dataTableService: DataTableService,
	telemetry: Telemetry,
): ToolDefinition<typeof addRowsInputSchema> => ({
	name: 'add_data_table_rows',
	config: {
		description:
			'Insert rows into an existing data table. Each row is an object mapping column names to values. Use search_data_tables to find the data table ID first.',
		inputSchema: addRowsInputSchema,
		outputSchema: addRowsOutputSchema,
		annotations: {
			title: 'Add Data Table Rows',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		rows,
	}: {
		dataTableId: string;
		projectId: string;
		rows: Array<Record<string, string | number | boolean | null>>;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'add_data_table_rows',
			parameters: { dataTableId, projectId, rowCount: rows.length },
		};

		try {
			const result = await dataTableService.insertRows(dataTableId, projectId, rows, 'count');

			const output = {
				success: true,
				insertedCount: result.insertedRows,
			};

			telemetryPayload.results = {
				success: true,
				data: { insertedCount: result.insertedRows },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});

// #endregion
