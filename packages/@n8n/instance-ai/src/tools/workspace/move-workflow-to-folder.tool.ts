import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createMoveWorkflowToFolderTool(context: InstanceAiContext) {
	return createTool({
		id: 'move-workflow-to-folder',
		description: 'Move a workflow into a folder. Non-destructive — the workflow is not modified.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to move'),
			folderId: z.string().describe('ID of the destination folder'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
		}),
		execute: async (input) => {
			await context.workspaceService!.moveWorkflowToFolder(input.workflowId, input.folderId);
			return { success: true };
		},
	});
}
