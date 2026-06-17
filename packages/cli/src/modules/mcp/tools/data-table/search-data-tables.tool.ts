import type { ListDataTableQueryDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { createLimitSchema, dataTableSchema } from '../schemas';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

const SEARCH_MAX_RESULTS = 100;

const searchInputSchema = {
	query: z
		.string()
		.optional()
		.describe('Filter data tables by name (case-insensitive partial match)'),
	projectId: z.string().optional().describe('Filter by project ID'),
	limit: createLimitSchema(SEARCH_MAX_RESULTS),
} satisfies z.ZodRawShape;

const searchOutputSchema = {
	data: z.array(dataTableSchema).describe('List of data tables matching the query'),
	count: z.number().int().min(0).describe('Total number of matching data tables'),
} satisfies z.ZodRawShape;

export const createSearchDataTablesTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
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

			const result = await dataTableOps.getManyAndCount({
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
