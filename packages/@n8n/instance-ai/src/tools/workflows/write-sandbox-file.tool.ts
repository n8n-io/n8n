/**
 * Write Sandbox File Tool
 *
 * Writes a file to the sandbox workspace. Uses command-based I/O so it works
 * with both Daytona and Local sandboxes, including environments where only
 * command-based file I/O is available.
 */

import { Tool } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import path from 'node:path';
import { z } from 'zod';

import { writeFileViaSandbox, type SandboxWorkspace } from '../../workspace/sandbox-fs';

export const writeSandboxFileInputSchema = z.object({
	filePath: z
		.string()
		.describe('Absolute path or path relative to ~/workspace/ (e.g. "src/workflow.ts")'),
	content: z.string().describe('The file content to write'),
});

export function createWriteSandboxFileTool(workspace: SandboxWorkspace) {
	return new Tool('write-file')
		.description(
			'Write content to a file in the sandbox workspace. Creates parent directories automatically. ' +
				'Use this to write workflow code to ~/workspace/src/workflow.ts.',
		)
		.input(writeSandboxFileInputSchema)
		.output(
			z.object({
				success: z.boolean(),
				path: z.string(),
				error: z.string().optional(),
			}),
		)
		.handler(async ({ filePath, content }: z.infer<typeof writeSandboxFileInputSchema>) => {
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
		})
		.build();
}
