import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { columnNameSchema, dataTableColumnTypeSchema } from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const columnSchema = z.object({
	name: columnNameSchema,
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
} satisfies z.ZodRawShape;

export const createCreateDataTableTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
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
			const result = await dataTableOps.createDataTable(projectId, {
				name,
				columns: columns.map((col) => ({
					name: col.name,
					type: col.type,
				})),
			});

			await dataTableOps.getColumns(result.id, projectId);

			const output = {
				id: result.id,
				name: result.name,
				projectId: result.projectId,
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

			const output = { error: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
