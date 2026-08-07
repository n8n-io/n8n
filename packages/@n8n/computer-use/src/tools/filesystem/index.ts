import type { ToolDefinition } from '../types';
import { copyFileTool } from './copy-file';
import { createDirectoryTool } from './create-directory';
import { deleteTool } from './delete';
import { editFileTool } from './edit-file';
import { getFileTreeTool } from './get-file-tree';
import { listFilesTool } from './list-files';
import { moveFileTool } from './move';
import { readFileTool } from './read-file';
import { searchFilesTool } from './search-files';
import { writeFileTool } from './write-file';

export const filesystemReadTools: ToolDefinition[] = [
	getFileTreeTool,
	listFilesTool,
	readFileTool,
	searchFilesTool,
];

export const filesystemWriteTools: ToolDefinition[] = [
	writeFileTool,
	editFileTool,
	createDirectoryTool,
	deleteTool,
	moveFileTool,
	copyFileTool,
];
