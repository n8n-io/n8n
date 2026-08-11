import type { User } from '@n8n/db';
import z from 'zod';

import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createLimitSchema } from './schemas';

const MAX_RESULTS = 100;

const inputSchema = {
	projectId: z.string().describe('The ID of the project to search folders in'),
	query: z.string().optional().describe('Filter folders by name (case-insensitive partial match)'),
	limit: createLimitSchema(MAX_RESULTS),
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
				path: z
					.array(z.string())
					.describe(
						"The folder's full name path from the project root, ending with the folder's own name. Use it to tell same-named folders apart and to present folders to the user by name.",
					),
			}),
		)
		.describe('List of folders matching the query'),
	count: z.number().int().min(0).describe('Total number of matching folders'),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the search failed. Present only on failure.'),
} satisfies z.ZodRawShape;

export const createSearchFoldersTool = (
	user: User,
	folderService: FolderService,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'search_folders',
	config: {
		description:
			"Search for folders within a project. Use this to resolve a folder name to an ID before creating a workflow in a folder, creating or updating a folder, or moving workflows into a folder. Each result includes the folder's full name path — when multiple folders match a name, use the paths to ask the user which one they meant. Requires a projectId — use search_projects first if needed.",
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

			const [folders, count] = await folderService.getManyAndCount(projectId, {
				filter: query ? { name: query } : {},
				// updatedAt backs the repository's default ORDER BY; with `take`,
				// TypeORM's distinct wrapper can only sort on selected columns.
				select: { name: true, parentFolder: true, path: true, updatedAt: true },
				take: safeLimit,
			});

			const data = folders.map((folder) => ({
				id: folder.id,
				name: folder.name,
				parentFolderId: folder.parentFolder?.id ?? null,
				path: folder.path ?? [folder.name],
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
