import type { ToolDefinition } from '../types';
import { getFileTreeTool } from './get-file-tree';
import { listFilesTool } from './list-files';
import { readFileTool } from './read-file';
import { searchFilesTool } from './search-files';

export const filesystemTools: ToolDefinition[] = [
	getFileTreeTool,
	listFilesTool,
	readFileTool,
	searchFilesTool,
];
