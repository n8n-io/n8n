import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { dataTableProjectIdSchema } from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const ADD_ROWS_MAX = 1000;

const addRowsInputSchema = {
	dataTableId: z.string().describe('The ID of the data table to insert rows into'),
	projectId: dataTableProjectIdSchema,
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
	dataTableOps: DataTableUserOperations,
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
			const result = await dataTableOps.insertRows(dataTableId, projectId, rows, 'count');

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

			const output = { success: false, insertedCount: 0, error: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
