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
			'The ID of the project the folder belongs to. Use search_projects to resolve a project name to an ID.',
		),
	folderId: folderIdSchema.describe(
		'The ID of the folder to update. Use search_folders to find it by name.',
	),
	name: folderNameSchema.optional().describe('New name for the folder (rename)'),
	parentFolderId: folderIdSchema
		.optional()
		.describe(
			`New parent folder ID to move the folder under. Must belong to the same project and must not be a descendant of the folder being moved. Pass "${PROJECT_ROOT}" to move the folder to the project root. Omit to leave the folder where it is.`,
		),
} satisfies z.ZodRawShape;

export const createUpdateFolderTool = (
	user: User,
	folderService: FolderService,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'update_folder',
	config: {
		description:
			'Rename a folder and/or move it under another folder in the same project. Resolve folders by name with search_folders first; when multiple folders match a name, ask the user which one they meant before updating. After the update, confirm the result to the user using folder names, not IDs.',
		inputSchema,
		outputSchema: folderOutputSchema,
		annotations: {
			title: 'Update Folder',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		projectId,
		folderId,
		name,
		parentFolderId,
	}: {
		projectId: string;
		folderId: string;
		name?: string;
		parentFolderId?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'update_folder',
			parameters: { projectId, folderId, hasName: !!name, hasParentFolderId: !!parentFolderId },
		};

		const fail = createFailHandler(telemetry, telemetryPayload);

		if (!name && !parentFolderId) {
			return fail('Provide at least one of name or parentFolderId');
		}

		try {
			const project = await projectService.getProjectWithScope(user, projectId, ['folder:update']);
			if (!project) {
				return fail('Project not found or access denied');
			}

			const folder = await folderService.updateFolder(folderId, projectId, {
				name,
				parentFolderId,
			});

			telemetryPayload.results = { success: true, data: { folderId } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				id: folder.id,
				name: folder.name,
				parentFolderId: folder.parentFolderId ?? null,
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
