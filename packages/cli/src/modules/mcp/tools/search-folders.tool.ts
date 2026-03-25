import type { FolderRepository, User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import type { ProjectService } from '@/services/project.service.ee';
import type { Telemetry } from '@/telemetry';

const MAX_RESULTS = 100;

const inputSchema = {
	projectId: z.string().describe('The ID of the project to search folders in'),
	query: z.string().optional().describe('Filter folders by name (case-insensitive partial match)'),
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
				id: z.string().describe('The unique identifier of the folder'),
				name: z.string().describe('The name of the folder'),
				parentFolderId: z
					.string()
					.nullable()
					.describe('The ID of the parent folder, or null if at project root'),
			}),
		)
		.describe('List of folders matching the query'),
	count: z.number().int().min(0).describe('Total number of matching folders'),
} satisfies z.ZodRawShape;

export const createSearchFoldersTool = (
	user: User,
	folderRepository: FolderRepository,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'search_folders',
	config: {
		description:
			'Search for folders within a project. Use this to find a folder ID before creating a workflow in a specific folder. Requires a projectId — use search_projects first if needed.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Search Folders',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		projectId,
		query,
		limit = MAX_RESULTS,
	}: {
		projectId: string;
		query?: string;
		limit?: number;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'search_folders',
			parameters: { projectId, query, limit },
		};

		try {
			const project = await projectService.getProjectWithScope(user, projectId, ['folder:list']);
			if (!project) {
				const output = { data: [], count: 0, error: 'Project not found or access denied' };
				telemetryPayload.results = { success: false, error: output.error };
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output,
					isError: true,
				};
			}

			const safeLimit = Math.min(Math.max(1, limit), MAX_RESULTS);

			const [folders, count] = await folderRepository.getManyAndCount({
				filter: {
					projectId,
					...(query ? { name: query } : {}),
				},
				take: safeLimit,
			});

			const data = folders.map((folder) => ({
				id: folder.id,
				name: folder.name,
				parentFolderId: folder.parentFolderId ?? null,
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
