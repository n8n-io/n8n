import {
	WORKSPACE_FOLDER_TOOL_ACTIONS,
	WORKSPACE_TOOL_ACTIONS,
	type WorkspaceToolAction,
} from '@n8n/api-types';

import type { InstanceAiContext } from '../types';

/**
 * The workspace actions this context supports. Folder actions need a workspace
 * service that supports folders. Kept out of `workspace.tool.ts` so the tool
 * registry can call it without loading the lazy tool module.
 */
export function getSupportedWorkspaceActions(
	context: Pick<InstanceAiContext, 'workspaceService'>,
): WorkspaceToolAction[] {
	const supportsFolders = context.workspaceService?.listFolders !== undefined;
	return WORKSPACE_TOOL_ACTIONS.filter(
		(action) => supportsFolders || !WORKSPACE_FOLDER_TOOL_ACTIONS.includes(action),
	);
}
