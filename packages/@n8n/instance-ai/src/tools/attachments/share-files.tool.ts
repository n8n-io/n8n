/**
 * share-files tool: stores files of `outputs/` in the sandbox workspace as
 * conversation files, so the chat shows them to the user in the reply.
 *
 * The registry adds the tool only when the host sets `context.sandboxFiles`
 * and the turn has a workspace. Only the Assistant agent on the Agents runtime
 * sets it, and only when the sandbox files feature is on.
 */

import { isAbortError, Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext, InstanceAiSandboxFiles } from '../../types';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';

/** Directory in the workspace root for the files that the agent makes for the user. */
export const SHARE_FILES_DIR = 'outputs';

/** Most files that one call shares. */
export const MAX_SHARE_FILES = 10;

export const shareFilesInputSchema = z.object({
	paths: z
		.array(z.string().trim().min(1))
		.min(1)
		.max(MAX_SHARE_FILES)
		.describe(`Paths of files in ${SHARE_FILES_DIR}/, e.g. "report.xlsx" or "charts/sales.png"`),
});

const sharedFileSchema = z.object({
	fileId: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
});

// The chat shows the `files` of a tool result to the user.
export const shareFilesOutputSchema = z.object({
	files: z.array(sharedFileSchema),
	errors: z.array(z.object({ path: z.string(), error: z.string() })).optional(),
});

type ShareFilesInput = z.infer<typeof shareFilesInputSchema>;
type ShareFilesOutput = z.infer<typeof shareFilesOutputSchema>;

const DESCRIPTION =
	`Give files that you made in ${SHARE_FILES_DIR}/ of your sandbox workspace to the user. ` +
	'The chat shows each file, and the user can open and download it. ' +
	'Share the files that answer the request, not scratch files. ' +
	`One call shares up to ${MAX_SHARE_FILES} files.`;

/** A path relative to `outputs/`. A leading `outputs/` is dropped, so the model can give either form. */
function toOutputPath(path: string, context: InstanceAiContext): string {
	const relative = normalizeWorkspaceRelativePath(path, {
		resourceLabel: 'Shared file',
		workspaceRoot: context.workspaceRoot,
		fallbackWorkspaceRoot: context.fallbackWorkspaceRoot,
	});
	return relative.startsWith(`${SHARE_FILES_DIR}/`)
		? relative.slice(SHARE_FILES_DIR.length + 1)
		: relative;
}

export function createShareFilesTool(
	context: InstanceAiContext,
	sandboxFiles: InstanceAiSandboxFiles,
) {
	return new Tool('share-files')
		.description(DESCRIPTION)
		.input(shareFilesInputSchema)
		.output(shareFilesOutputSchema)
		.handler(async ({ paths }: ShareFilesInput, ctx): Promise<ShareFilesOutput> => {
			const files: ShareFilesOutput['files'] = [];
			const errors: NonNullable<ShareFilesOutput['errors']> = [];
			const seen = new Set<string>();
			// One at a time: the host skips a file that it already stored, and a
			// path given twice must be stored once.
			for (const path of paths) {
				try {
					const outputPath = toOutputPath(path, context);
					if (seen.has(outputPath)) continue;
					seen.add(outputPath);
					files.push(await sandboxFiles.storeOutput(outputPath, ctx.abortSignal));
				} catch (error) {
					if (isAbortError(error)) throw error;
					errors.push({ path, error: error instanceof Error ? error.message : String(error) });
				}
			}
			return errors.length > 0 ? { files, errors } : { files };
		})
		.build();
}
