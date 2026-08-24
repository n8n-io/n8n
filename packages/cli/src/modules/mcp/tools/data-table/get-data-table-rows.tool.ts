import {
	dataTableColumnNameSchema,
	dataTableFilterTypeSchema,
	FilterConditionSchema,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import z from 'zod';

import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { createLimitSchema, dataTableProjectIdSchema, dataTableRowSchema } from '../schemas';

const GET_ROWS_MAX = 100;

const filterSchema = z
	.object({
		type: dataTableFilterTypeSchema
			.default('and')
			.describe('How to combine the filters: all must match (and) or any may match (or)'),
		filters: z
			.array(
				z.object({
					columnName: dataTableColumnNameSchema.describe(
						"Column to filter on. System columns 'id', 'createdAt' and 'updatedAt' are also allowed",
					),
					condition: FilterConditionSchema.default('eq').describe(
						"Comparison operator. 'like' (case-sensitive) and 'ilike' (case-insensitive) match substrings; include % wildcards for custom patterns. 'neq' also matches rows where the column is null",
					),
					value: z
						.union([z.string(), z.number(), z.boolean(), z.null()])
						.describe(
							'Value to compare against. For date columns, pass an ISO 8601 string. Pass null with eq/neq to match rows where the column is null / not null',
						),
				}),
			)
			.min(1),
	})
	.optional()
	.describe('Filter conditions to select rows. Omit to return all rows');

const sortBySchema = z
	.string()
	.regex(/^[^:]+:(asc|desc)$/i, 'Expected format <columnName>:<asc|desc>')
	.refine((value) => dataTableColumnNameSchema.safeParse(value.split(':')[0]).success, {
		message: 'Invalid sort column name',
	})
	.optional()
	.describe("Sort order as '<columnName>:<asc|desc>', e.g. 'createdAt:desc'");

const getRowsInputSchema = {
	dataTableId: z.string().describe('The ID of the data table to read rows from'),
	projectId: dataTableProjectIdSchema,
	filter: filterSchema,
	sortBy: sortBySchema,
	limit: createLimitSchema(GET_ROWS_MAX),
	skip: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Number of rows to skip, for paginating through large result sets'),
} satisfies z.ZodRawShape;

const getRowsOutputSchema = {
	rows: z
		.array(dataTableRowSchema)
		.describe(
			"Matching rows, mapping column names to values. Includes the system columns 'id', 'createdAt' and 'updatedAt'; dates are ISO 8601 strings",
		),
	count: z
		.number()
		.int()
		.min(0)
		.describe('Total number of rows matching the filter, ignoring limit and skip'),
	error: z.string().optional().describe('Error message if the read failed'),
} satisfies z.ZodRawShape;

const toSortByTuple = (sortBy: string): [string, 'ASC' | 'DESC'] => {
	const [column, direction] = sortBy.split(':');
	return [column, direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'];
};

const serializeRow = (row: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(row).map(([key, value]) => [
			key,
			value instanceof Date ? value.toISOString() : value,
		]),
	);

export const createGetDataTableRowsTool = (
	user: User,
	dataTableOps: DataTableUserOperations,
	telemetry: Telemetry,
): ToolDefinition<typeof getRowsInputSchema> => ({
	name: 'get_data_table_rows',
	config: {
		description:
			'Read rows from a data table, with optional filtering, sorting and pagination. Use search_data_tables to find the data table ID and its columns first.',
		inputSchema: getRowsInputSchema,
		outputSchema: getRowsOutputSchema,
		annotations: {
			title: 'Get Data Table Rows',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ dataTableId, projectId, filter, sortBy, limit = GET_ROWS_MAX, skip }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_data_table_rows',
			parameters: {
				dataTableId,
				projectId,
				filterCount: filter?.filters.length,
				sortBy,
				limit,
				skip,
			},
		};

		try {
			const result = await dataTableOps.getManyRowsAndCount(dataTableId, projectId, {
				filter,
				sortBy: sortBy ? toSortByTuple(sortBy) : undefined,
				take: limit,
				skip,
			});

			const output = {
				rows: result.data.map(serializeRow),
				count: result.count,
			};

			telemetryPayload.results = {
				success: true,
				data: { count: result.count, returned: output.rows.length },
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

			const output = { rows: [], count: 0, error: errorMessage };
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
