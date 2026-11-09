import type { Workspace } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import type { AgentSandboxFilesService } from '../agent-sandbox-files.service';

export const IMPORT_FILES_TOOL_NAME = 'import_files';

const DESCRIPTION =
	'Copy conversation files, such as user uploads or files from tool results, into inputs/ of your workspace. ' +
	'Then read or process them with the workspace tools. Returns the workspace path of each file.';

/** Copies files by fileId into the workspace of the run. Attach it next to the workspace tools. */
export function createImportFilesTool({
	projectId,
	workspace,
	sandboxFiles,
}: {
	projectId: string;
	workspace: Workspace;
	sandboxFiles: AgentSandboxFilesService;
}) {
	return new Tool(IMPORT_FILES_TOOL_NAME)
		.description(DESCRIPTION)
		.input(
			z.object({
				files: z
					.record(z.string(), z.string())
					.describe(
						'Files to copy. Key = path relative to inputs/, e.g. "data/sales.csv". Value = fileId.',
					),
			}),
		)
		.handler(async ({ files }, ctx) => {
			const threadId = ctx.persistence?.threadId;
			if (!threadId) throw new UserError('Files can only be imported in a conversation');
			return {
				files: await sandboxFiles.importFiles(workspace, files, { projectId, threadId }),
			};
		});
}
