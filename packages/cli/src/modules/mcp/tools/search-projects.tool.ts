import type { ProjectRepository, User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

import type { Telemetry } from '@/telemetry';

const MAX_RESULTS = 100;

const inputSchema = {
	query: z
		.string()
		.optional()
		.describe(
			'Filter projects by name (case-insensitive partial match). Pass the exact project name the user mentioned — results are ranked with exact case-insensitive matches first, then partial matches.',
		),
	type: z
		.enum(['personal', 'team'])
		.optional()
		.describe(
			"Filter by project type. 'team' for shared team projects, 'personal' for personal projects.",
		),
	limit: createLimitSchema(MAX_RESULTS),
} satisfies z.ZodRawShape;

const outputSchema = {
	data: z
		.array(
			z.object({
				id: z.string().describe('The unique identifier of the project'),
				name: z.string().describe('The name of the project'),
				type: z.enum(['personal', 'team']).describe("The project type: 'personal' or 'team'"),
				matchType: z
					.enum(['exact', 'partial'])
					.optional()
					.describe(
						"Whether this project's name matches the query exactly (case-insensitive) or only partially. Only present when a query was provided.",
					),
			}),
		)
		.describe(
			'List of projects matching the query, sorted with exact case-insensitive matches first.',
		),
	count: z.number().int().min(0).describe('Total number of matching projects'),
	hint: z
		.string()
		.optional()
		.describe(
			'Guidance for picking a result. Present when the match is ambiguous — for example when no exact match was found but multiple partials were returned. When present, follow it before calling create_workflow_from_code.',
		),
} satisfies z.ZodRawShape;

export const createSearchProjectsTool = (
	user: User,
	projectRepository: ProjectRepository,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'search_projects',
	config: {
		description:
			'Search for projects accessible to the current user. Call this whenever the user names a project — pass the name as the query, then use the resolved ID with create_workflow_from_code or update_workflow. Results are ranked with exact case-insensitive name matches first. If no exact match is found but multiple partials are returned, the response includes a `hint` field telling you to clarify with the user before acting; follow it instead of guessing.',
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
			const effectiveLimit = Math.min(Math.max(1, limit), MAX_RESULTS);
			const trimmedQuery = query?.trim();
			const [[partialProjects, count], exactProjects] = await Promise.all([
				projectRepository.getAccessibleProjectsAndCount(user.id, {
					search: query,
					type,
					take: effectiveLimit,
				}),
				trimmedQuery
					? projectRepository.getAccessibleProjectsByExactName(user.id, trimmedQuery, type)
					: Promise.resolve([]),
			]);

			// Exact matches outside the partial page would otherwise be invisible to the ranker.
			const partialIds = new Set(partialProjects.map((p) => p.id));
			const novelExactProjects = exactProjects.filter((p) => !partialIds.has(p.id));
			const mergedProjects = [...novelExactProjects, ...partialProjects].slice(0, effectiveLimit);

			const normalizedQuery = trimmedQuery?.toLowerCase();
			const scoredProjects = mergedProjects.map((project) => ({
				project,
				isExact:
					normalizedQuery !== undefined && project.name.trim().toLowerCase() === normalizedQuery,
			}));

			if (normalizedQuery) {
				scoredProjects.sort((a, b) => {
					if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
					return a.project.name.localeCompare(b.project.name);
				});
			}

			const data = scoredProjects.map(({ project, isExact }) => ({
				id: project.id,
				name: project.name,
				type: project.type,
				...(normalizedQuery
					? { matchType: isExact ? ('exact' as const) : ('partial' as const) }
					: {}),
			}));

			const exactMatchCount = scoredProjects.reduce((acc, p) => acc + (p.isExact ? 1 : 0), 0);
			let hint: string | undefined;
			if (normalizedQuery && data.length > 1) {
				if (exactMatchCount === 0) {
					hint = `No exact match for "${query}". ${data.length} partial matches were returned — ask the user to clarify which project they meant before creating or updating a workflow.`;
				} else if (exactMatchCount > 1) {
					hint = `Multiple projects are named "${query}". Ask the user to disambiguate (e.g. by team or owner) before creating or updating a workflow.`;
				}
			}

			telemetryPayload.results = {
				success: true,
				data: { count },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { data, count, ...(hint ? { hint } : {}) };
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
