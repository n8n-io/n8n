import type { FolderRepository, User } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';
import z from 'zod';

import type { Telemetry } from '@/telemetry';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

const MAX_WORKFLOWS = 50;

const inputSchema = {
	workflowIds: z
		.array(z.string())
		.min(1)
		.max(MAX_WORKFLOWS)
		.describe(`The IDs of the workflows to move (up to ${MAX_WORKFLOWS} at a time)`),
	folderId: z
		.string()
		.describe(
			`The ID of the destination folder. It must belong to the project that owns the workflows — use search_folders to find it by name. Pass "${PROJECT_ROOT}" to move the workflows to the project root.`,
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	folder: z
		.object({
			id: z.string().describe('The ID of the destination folder'),
			name: z.string().describe('The name of the destination folder'),
		})
		.optional()
		.describe(
			'The destination folder. Omitted when moving to the project root or when no workflow was moved.',
		),
	moved: z
		.array(
			z.object({
				workflowId: z.string().describe('The ID of the moved workflow'),
				name: z.string().describe('The name of the moved workflow'),
			}),
		)
		.optional()
		.describe('Workflows that were moved successfully'),
	failed: z
		.array(
			z.object({
				workflowId: z.string().describe('The ID of the workflow that could not be moved'),
				error: z.string().describe('Why the workflow could not be moved'),
			}),
		)
		.optional()
		.describe('Workflows that could not be moved, with the reason for each'),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the move failed. Present only on failure.'),
} satisfies z.ZodRawShape;

export const createMoveWorkflowsToFolderTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	folderRepository: FolderRepository,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'move_workflows_to_folder',
	config: {
		description:
			'Move one or more existing workflows into a folder (or to the project root). The destination folder must be in the same project as the workflows. Resolve the folder by name with search_folders first; when multiple folders match the name, ask the user which one they meant before moving. After moving, confirm the destination to the user by folder name, not ID. Moves may partially succeed — report any entries in `failed` to the user.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Move Workflows to Folder',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowIds, folderId }: { workflowIds: string[]; folderId: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'move_workflows_to_folder',
			parameters: { workflowCount: workflowIds.length, folderId },
		};

		try {
			const folder =
				folderId === PROJECT_ROOT ? null : await folderRepository.findOneBy({ id: folderId });
			if (folderId !== PROJECT_ROOT && !folder) {
				const output = {
					error: `Folder "${folderId}" was not found. Use search_folders to look up a valid folder id.`,
				};
				telemetryPayload.results = { success: false, error: output.error };
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				return {
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output,
					isError: true,
				};
			}

			const moved: Array<{ workflowId: string; name: string }> = [];
			const failed: Array<{ workflowId: string; error: string }> = [];

			for (const workflowId of workflowIds) {
				try {
					const workflow = await getMcpWorkflow(
						workflowId,
						user,
						['workflow:update'],
						workflowFinderService,
					);
					// Folder-only update, mirroring the REST PATCH path: an empty entity
					// payload so only the folder placement (validated against the
					// workflow's owning project) changes.
					await workflowService.update(user, createWorkflowEntityFromPayload({}), workflowId, {
						parentFolderId: folderId,
						source: 'n8n-mcp',
					});
					moved.push({ workflowId, name: workflow.name });
				} catch (error) {
					failed.push({
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			telemetryPayload.results = {
				success: moved.length > 0,
				data: { movedCount: moved.length, failedCount: failed.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			// The folder name is only exposed once a move succeeded, i.e. the user
			// provably has access to the folder's project.
			const output = {
				...(folder && moved.length > 0 ? { folder: { id: folder.id, name: folder.name } } : {}),
				...(moved.length > 0 ? { moved } : {}),
				...(failed.length > 0 ? { failed } : {}),
				...(moved.length === 0 ? { error: 'None of the workflows could be moved' } : {}),
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				...(moved.length === 0 ? { isError: true } : {}),
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: errorMessage };
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
