import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import {
	columnNameSchema,
	dataTableColumnSchema,
	dataTableColumnTypeSchema,
	dataTableProjectIdSchema,
} from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	dataTableId: z.string().describe('The ID of the data table to add a column to'),
	projectId: dataTableProjectIdSchema,
	name: columnNameSchema,
	type: dataTableColumnTypeSchema.describe('The data type of the new column'),
} satisfies z.ZodRawShape;

const outputSchema = {
	success: z.boolean().describe('Whether the operation succeeded'),
	message: z.string().describe('Description of the result'),
	column: dataTableColumnSchema.omit({ index: true }).describe('The created column'),
} satisfies z.ZodRawShape;

export const createAddDataTableColumnTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'add_data_table_column',
	config: {
		description: 'Add a new column to an existing data table.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Add Data Table Column',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		name,
		type,
	}: {
		dataTableId: string;
		projectId: string;
		name: string;
		type: 'string' | 'number' | 'boolean' | 'date';
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'add_data_table_column',
			parameters: { dataTableId, projectId },
		};

		try {
			const column = await dataTableOps.addColumn(dataTableId, projectId, { name, type });

			const output = {
				success: true,
				message: `Column '${name}' added with type '${type}'`,
				column: { id: column.id, name: column.name, type: column.type },
			};

			telemetryPayload.results = { success: true };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: errorMessage };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { success: false, message: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
