import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { dataTableProjectIdSchema, successMessageOutputSchema } from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	dataTableId: z.string().describe('The ID of the data table containing the column'),
	projectId: dataTableProjectIdSchema,
	columnId: z.string().describe('The ID of the column to delete'),
} satisfies z.ZodRawShape;

const outputSchema = successMessageOutputSchema;

export const createDeleteDataTableColumnTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'delete_data_table_column',
	config: {
		description:
			'Delete a column from a data table. This permanently removes the column and all its data.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Delete Data Table Column',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		columnId,
	}: {
		dataTableId: string;
		projectId: string;
		columnId: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'delete_data_table_column',
			parameters: { dataTableId, projectId, columnId },
		};

		try {
			await dataTableOps.deleteColumn(dataTableId, projectId, columnId);

			const output = { success: true, message: `Column '${columnId}' deleted` };

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
