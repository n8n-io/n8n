/**
 * Write Sandbox File Tool
 *
 * Writes a file to the sandbox workspace. Uses command-based I/O so it works
 * with both Daytona and Local sandboxes (unlike Mastra's built-in write_file
 * which requires workspace.filesystem — absent on Daytona).
 */

import { createTool } from '@mastra/core/tools';
import type { Workspace } from '@mastra/core/workspace';
import path from 'node:path';
import { z } from 'zod';

import { writeFileViaSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';

export const writeSandboxFileInputSchema = z.object({
	filePath: z
		.string()
		.describe('Absolute path or path relative to ~/workspace/ (e.g. "src/workflow.ts")'),
	content: z.string().describe('The file content to write'),
});

export function createWriteSandboxFileTool(workspace: Workspace) {
	return createTool({
		id: 'write-file',
		description:
			'Write content to a file in the sandbox workspace. Creates parent directories automatically. ' +
			'Use this to write workflow code to ~/workspace/src/workflow.ts.',
		inputSchema: writeSandboxFileInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			path: z.string(),
			error: z.string().optional(),
		}),
		execute: async ({ filePath, content }: z.infer<typeof writeSandboxFileInputSchema>) => {
			try {
				const root = await getWorkspaceRoot(workspace);

				// Resolve relative paths against workspace root
				const absPath = filePath.startsWith('/') ? filePath : `${root}/${filePath}`;

				// Prevent path traversal outside workspace root
				const normalized = path.posix.normalize(absPath);
				if (normalized !== root && !normalized.startsWith(root + '/')) {
					return {
						success: false,
						path: filePath,
						error: `Path must be within workspace root (${root})`,
					};
				}

				await writeFileViaSandbox(workspace, normalized, content);
				return { success: true, path: normalized };
			} catch (error) {
				return {
					success: false,
					path: filePath,
					error: error instanceof Error ? error.message : 'Failed to write file',
				};
			}
		},
	});
}
