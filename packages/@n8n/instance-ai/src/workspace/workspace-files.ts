import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import {
	isTransientSandboxIoError,
	readFileViaSandbox,
	retryTransientSandboxIo,
	writeFileViaSandbox,
	type SandboxWorkspace,
} from './sandbox-fs';

export interface WorkspaceFileTarget {
	filesystem?: {
		readFile?: (
			path: string,
			options?: { encoding?: 'utf-8'; abortSignal?: AbortSignal },
		) => Promise<string | Buffer>;
		writeFile: (
			path: string,
			content: string | Buffer,
			options?: { recursive?: boolean; abortSignal?: AbortSignal },
		) => Promise<void>;
	};
	sandbox?: SandboxWorkspace['sandbox'];
}

export interface WorkspaceFileOptions {
	logger: Logger;
	/** Used in log and error messages, e.g. "Knowledge base file". */
	resourceLabel?: string;
	/** Base for the exponential retry backoff on transient write errors. Default 1s. */
	retryBackoffBaseMs?: number;
	abortSignal?: AbortSignal;
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
	const readFile = filesystem?.readFile;
	if (filesystem && readFile) {
		try {
			return decodeWorkspaceFileContent(
				await retryTransientSandboxIo(
					// .call preserves the provider's `this` binding (e.g. LazyRuntimeFilesystem).
					async () =>
						await readFile.call(filesystem, filePath, {
							encoding: 'utf-8',
							abortSignal: options?.abortSignal,
						}),
					filePath,
					options,
				),
			);
		} catch (error) {
			// A provider failure is not a missing file — surface it instead of reporting null.
			if (isTransientSandboxIoError(error)) {
				throw new Error(
					`Failed to read ${resourceLabel(options).toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
					{ cause: error },
				);
			}
			options?.logger.debug(`${resourceLabel(options)} filesystem read missed`, {
				path: filePath,
				error: formatErrorForLog(error),
			});
			return null;
		}
	}

	if (!workspace.sandbox) return null;

	try {
		return await readFileViaSandbox(workspace, filePath, options);
	} catch (error) {
		if (isTransientSandboxIoError(error)) {
			throw new Error(
				`Failed to read ${resourceLabel(options).toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
				{ cause: error },
			);
		}
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

	const filesystem = workspace.filesystem;
	if (filesystem) {
		try {
			await retryTransientSandboxIo(
				async () =>
					await filesystem.writeFile(filePath, content, {
						recursive: true,
						abortSignal: options?.abortSignal,
					}),
				filePath,
				options,
			);
			return;
		} catch (error) {
			try {
				await writeFileViaSandbox(workspace, filePath, content, options);
				options?.logger.warn(`${label} filesystem write failed; used command fallback`, {
					path: filePath,
					error: formatErrorForLog(error),
				});
				return;
			} catch (fallbackError) {
				// Keep the underlying error as `cause`: quota-exhausted proxy failures
				// carry their machine-readable code there, which terminal-error
				// classification reads to surface the out-of-credits message.
				throw new Error(
					`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}; command fallback failed: ${formatErrorForLog(fallbackError)}`,
					{ cause: fallbackError },
				);
			}
		}
	}

	try {
		await writeFileViaSandbox(workspace, filePath, content, options);
	} catch (error) {
		throw new Error(
			`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
			{ cause: error },
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
