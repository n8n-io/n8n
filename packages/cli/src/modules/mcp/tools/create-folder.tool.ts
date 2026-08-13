import { folderIdSchema, folderNameSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';
import z from 'zod';

import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { createFailHandler, describeFolderError } from './folder-error.utils';
import { folderOutputSchema } from './schemas';

const inputSchema = {
	projectId: z
		.string()
		.describe(
			'The ID of the project to create the folder in. Use search_projects to resolve a project name to an ID.',
		),
	name: folderNameSchema.describe('The name of the folder to create'),
	parentFolderId: folderIdSchema
		.optional()
		.describe(
			`Optional parent folder ID to nest the new folder under. Must belong to the same project — use search_folders to find it. Omit it or pass "${PROJECT_ROOT}" to create the folder at the project root.`,
		),
} satisfies z.ZodRawShape;

export const createCreateFolderTool = (
	user: User,
	folderService: FolderService,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'create_folder',
	config: {
		description:
			'Create a folder in a project, optionally nested under an existing folder. Requires a projectId — use search_projects first if needed. If the user named a parent folder, resolve it with search_folders; when multiple folders match the name, ask the user which one they meant before creating. After creation, confirm the folder to the user by name, not ID.',
		inputSchema,
		outputSchema: folderOutputSchema,
		annotations: {
			title: 'Create Folder',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		projectId,
		name,
		parentFolderId,
	}: {
		projectId: string;
		name: string;
		parentFolderId?: string;
	}) => {
		const parent = parentFolderId === PROJECT_ROOT ? undefined : parentFolderId;

		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'create_folder',
			parameters: { projectId, hasParentFolderId: !!parent },
		};
		const fail = createFailHandler(telemetry, telemetryPayload);

		try {
			const project = await projectService.getProjectWithScope(user, projectId, ['folder:create']);
			if (!project) {
				return fail('Project not found or access denied');
			}

			const folder = await folderService.createFolder({ name, parentFolderId: parent }, projectId);

			telemetryPayload.results = { success: true, data: { folderId: folder.id } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				id: folder.id,
				name: folder.name,
				parentFolderId: folder.parentFolder?.id ?? null,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (error) {
			return fail(describeFolderError(error));
		}
	},
});
