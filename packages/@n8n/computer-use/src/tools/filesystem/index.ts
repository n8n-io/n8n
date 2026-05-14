import type { ToolDefinition } from '../types';
import { copyFileTool } from './copy-file';
import { createDirectoryTool } from './create-directory';
import { deleteTool } from './delete';
import { deleteToTrashTool } from './delete-to-trash';
import { editFileTool } from './edit-file';
import { getFileTreeTool } from './get-file-tree';
import { listFilesTool } from './list-files';
import { moveFileTool } from './move';
import { readFileTool } from './read-file';
import { searchFilesTool } from './search-files';
import { statPathTool } from './stat-path';
import { writeFileTool } from './write-file';

export const filesystemReadTools: ToolDefinition[] = [
	getFileTreeTool,
	listFilesTool,
	statPathTool,
	readFileTool,
	searchFilesTool,
];

export const filesystemWriteTools: ToolDefinition[] = [
	writeFileTool,
	editFileTool,
	createDirectoryTool,
	deleteToTrashTool,
	deleteTool,
	moveFileTool,
	copyFileTool,
];
