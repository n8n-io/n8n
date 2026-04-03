import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import {
	columnNameSchema,
	dataTableColumnSchema,
	dataTableProjectIdSchema,
	successMessageOutputSchema,
} from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	dataTableId: z.string().describe('The ID of the data table containing the column'),
	projectId: dataTableProjectIdSchema,
	columnId: z.string().describe('The ID of the column to rename'),
	name: columnNameSchema.describe('The new column name'),
} satisfies z.ZodRawShape;

const outputSchema = {
	...successMessageOutputSchema,
	column: dataTableColumnSchema.omit({ index: true }).describe('The renamed column'),
} satisfies z.ZodRawShape;

export const createRenameDataTableColumnTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'rename_data_table_column',
	config: {
		description: 'Rename a column in a data table.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Rename Data Table Column',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		dataTableId,
		projectId,
		columnId,
		name,
	}: {
		dataTableId: string;
		projectId: string;
		columnId: string;
		name: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'rename_data_table_column',
			parameters: { dataTableId, projectId, columnId },
		};

		try {
			const renamedColumn = await dataTableOps.renameColumn(dataTableId, projectId, columnId, {
				name,
			});

			const output = {
				success: true,
				message: `Column renamed to '${name}'`,
				column: { id: renamedColumn.id, name: renamedColumn.name, type: renamedColumn.type },
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
