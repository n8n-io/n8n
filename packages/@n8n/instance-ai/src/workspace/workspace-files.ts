import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import { readFileViaSandbox, writeFileViaSandbox, type SandboxWorkspace } from './sandbox-fs';

export interface WorkspaceFileTarget {
	filesystem?: {
		readFile?: (path: string, options?: { encoding?: 'utf-8' }) => Promise<string | Buffer>;
		writeFile: (
			path: string,
			content: string | Buffer,
			options?: { recursive?: boolean },
		) => Promise<void>;
	};
	sandbox?: SandboxWorkspace['sandbox'];
}

export interface WorkspaceFileOptions {
	logger: Logger;
	/** Used in log and error messages, e.g. "Knowledge base file". */
	resourceLabel?: string;
}

function resourceLabel(options?: WorkspaceFileOptions): string {
	return options?.resourceLabel ?? 'Workspace file';
}

function decodeWorkspaceFileContent(content: string | Buffer): string {
	return Buffer.isBuffer(content) ? content.toString('utf-8') : content;
}

/**
 * Read a UTF-8 workspace file. Tries the workspace filesystem when available,
 * otherwise falls back to sandbox shell commands.
 */
export async function readWorkspaceFile(
	workspace: WorkspaceFileTarget,
	filePath: string,
	options?: WorkspaceFileOptions,
): Promise<string | null> {
	const filesystem = workspace.filesystem;
	if (filesystem?.readFile) {
		try {
			return decodeWorkspaceFileContent(await filesystem.readFile(filePath, { encoding: 'utf-8' }));
		} catch (error) {
			options?.logger.debug(`${resourceLabel(options)} filesystem read missed`, {
				path: filePath,
				error: formatErrorForLog(error),
			});
			return null;
		}
	}

	if (!workspace.sandbox) return null;

	try {
		return await readFileViaSandbox(workspace, filePath);
	} catch (error) {
		options?.logger.debug(`${resourceLabel(options)} command read missed`, {
			path: filePath,
			error: formatErrorForLog(error),
		});
		return null;
	}
}

/**
 * Write a UTF-8 workspace file. Tries the workspace filesystem first with a
 * sandbox command fallback when the provider supports both.
 */
export async function writeWorkspaceFile(
	workspace: WorkspaceFileTarget,
	filePath: string,
	content: string,
	options?: WorkspaceFileOptions,
): Promise<void> {
	const label = resourceLabel(options);

	if (workspace.filesystem) {
		try {
			await workspace.filesystem.writeFile(filePath, content, { recursive: true });
			return;
		} catch (error) {
			try {
				await writeFileViaSandbox(workspace, filePath, content);
				options?.logger.warn(`${label} filesystem write failed; used command fallback`, {
					path: filePath,
					error: formatErrorForLog(error),
				});
				return;
			} catch (fallbackError) {
				throw new Error(
					`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}; command fallback failed: ${formatErrorForLog(fallbackError)}`,
				);
			}
		}
	}

	try {
		await writeFileViaSandbox(workspace, filePath, content);
	} catch (error) {
		throw new Error(
			`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
		);
	}
}

export async function writeWorkspaceFileMap(
	workspace: WorkspaceFileTarget,
	files: Map<string, string>,
	options?: WorkspaceFileOptions,
): Promise<void> {
	await Promise.all(
		Array.from(files, async ([filePath, content]) => {
			await writeWorkspaceFile(workspace, filePath, content, options);
		}),
	);
}
