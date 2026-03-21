import type { ProjectRepository, User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import type { Telemetry } from '@/telemetry';

const MAX_RESULTS = 100;

const inputSchema = {
	query: z.string().optional().describe('Filter projects by name (case-insensitive partial match)'),
	type: z
		.enum(['personal', 'team'])
		.optional()
		.describe(
			"Filter by project type. 'team' for shared team projects, 'personal' for personal projects.",
		),
	limit: z
		.number()
		.int()
		.positive()
		.max(MAX_RESULTS)
		.optional()
		.describe(`Limit the number of results (max ${MAX_RESULTS})`),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the project'),
				name: z.string().describe('The name of the project'),
				type: z.enum(['personal', 'team']).describe("The project type: 'personal' or 'team'"),
			}),
		)
		.describe('List of projects matching the query'),
	count: z.number().int().min(0).describe('Total number of matching projects'),
} satisfies z.ZodRawShape;

export const createSearchProjectsTool = (
	user: User,
	projectRepository: ProjectRepository,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'search_projects',
	config: {
		description:
			'Search for projects accessible to the current user. Use this to find a project ID before creating a workflow in a specific project.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Search Projects',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		query,
		type,
		limit = MAX_RESULTS,
	}: {
		query?: string;
		type?: 'personal' | 'team';
		limit?: number;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'search_projects',
			parameters: { query, type, limit },
		};

		try {
			const [projects, count] = await projectRepository.getAccessibleProjectsAndCount(user.id, {
				search: query,
				type,
				take: Math.min(Math.max(1, limit), MAX_RESULTS),
			});

			const data = projects.map((project) => ({
				id: project.id,
				name: project.name,
				type: project.type,
			}));

			telemetryPayload.results = {
				success: true,
				data: { count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { data, count };
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
