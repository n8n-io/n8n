import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem, WorkspaceSandbox } from '../types';
import { createAppendFileTool } from './append-file';
import { createCopyFileTool } from './copy-file';
import { createDeleteFileTool } from './delete-file';
import { createExecuteCommandTool } from './execute-command';
import { createFileStatTool } from './file-stat';
import { createListFilesTool } from './list-files';
import { createMkdirTool } from './mkdir';
import { createMoveFileTool } from './move-file';
import { createKillProcessTool, createListProcessesTool } from './process-tools';
import { createReadFileTool } from './read-file';
import { createRmdirTool } from './rmdir';
import { createWriteFileTool } from './write-file';

interface WorkspaceLike {
	filesystem?: WorkspaceFilesystem;
	sandbox?: WorkspaceSandbox;
}

export function createWorkspaceTools(workspace: WorkspaceLike): BuiltTool[] {
	const tools: BuiltTool[] = [];

	if (workspace.filesystem) {
		tools.push(createReadFileTool(workspace.filesystem));
		tools.push(createWriteFileTool(workspace.filesystem));
		tools.push(createListFilesTool(workspace.filesystem));
		tools.push(createFileStatTool(workspace.filesystem));
		tools.push(createMkdirTool(workspace.filesystem));
		tools.push(createDeleteFileTool(workspace.filesystem));
		tools.push(createAppendFileTool(workspace.filesystem));
		tools.push(createCopyFileTool(workspace.filesystem));
		tools.push(createMoveFileTool(workspace.filesystem));
		tools.push(createRmdirTool(workspace.filesystem));
	}

	if (workspace.sandbox?.executeCommand) {
		tools.push(createExecuteCommandTool(workspace.sandbox));
	}

	if (workspace.sandbox?.processes) {
		tools.push(createListProcessesTool(workspace.sandbox.processes));
		tools.push(createKillProcessTool(workspace.sandbox.processes));
	}

	return tools;
}
