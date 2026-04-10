import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { dataTableProjectIdSchema, successMessageOutputSchema } from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	dataTableId: z.string().describe('The ID of the data table to rename'),
	projectId: dataTableProjectIdSchema,
	name: z.string().min(1).max(128).describe('The new name for the data table'),
} satisfies z.ZodRawShape;

const outputSchema = successMessageOutputSchema;

export const createRenameDataTableTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'rename_data_table',
	config: {
		description: 'Rename an existing data table.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Rename Data Table',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		name,
	}: {
		dataTableId: string;
		projectId: string;
		name: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'rename_data_table',
			parameters: { dataTableId, projectId },
		};

		try {
			await dataTableOps.updateDataTable(dataTableId, projectId, { name });

			const output = { success: true, message: `Data table renamed to '${name}'` };

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
