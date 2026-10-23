import { isAbortError } from '@n8n/agents';
import { OperationalError } from 'n8n-workflow';

import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import {
	isTransientSandboxIoError,
	readFileViaSandbox,
	retryTransientSandboxIo,
	writeFileViaSandbox,
	type SandboxWorkspace,
} from './sandbox-fs';
import { traceSandboxOperation, sandboxFileBytes } from '../tracing/sandbox-tracing';
import { isQuotaExhaustedError } from '../utils/quota-error';

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

function selectWriteFailureCause(writeError: unknown, fallbackError: unknown): unknown {
	if (isQuotaExhaustedError(writeError)) return writeError;
	if (isQuotaExhaustedError(fallbackError)) return fallbackError;
	return writeError;
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
	return await traceSandboxOperation(
		'read-file',
		{
			kind: 'io',
			inputs: { path: filePath },
			processResult: (result) => ({
				outputs: { found: result !== null, bytes: result === null ? 0 : sandboxFileBytes(result) },
			}),
		},
		async () => {
			const startedAt = Date.now();
			const read = await readWorkspaceFileContent(workspace, filePath, options);
			options?.logger.debug('Read workspace file', {
				resource: resourceLabel(options),
				path: filePath,
				transport: read.transport,
				found: read.content !== null,
				bytes: read.content === null ? 0 : sandboxFileBytes(read.content),
				durationMs: Date.now() - startedAt,
				...(read.missReason ? { missReason: read.missReason } : {}),
			});
			return read.content;
		},
	);
}

type WorkspaceFileTransport = 'filesystem' | 'command' | 'command-fallback' | 'none';

interface WorkspaceFileRead {
	content: string | null;
	transport: WorkspaceFileTransport;
	missReason?: string;
}

async function readWorkspaceFileContent(
	workspace: WorkspaceFileTarget,
	filePath: string,
	options?: WorkspaceFileOptions,
): Promise<WorkspaceFileRead> {
	const filesystem = workspace.filesystem;
	const readFile = filesystem?.readFile;
	if (filesystem && readFile) {
		try {
			const content = decodeWorkspaceFileContent(
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
			return { content, transport: 'filesystem' };
		} catch (error) {
			// A provider failure is not a missing file — surface it instead of reporting null.
			if (isTransientSandboxIoError(error)) {
				throw new OperationalError(
					`Failed to read ${resourceLabel(options).toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
					{
						cause: error,
						level: 'error',
					},
				);
			}
			return { content: null, transport: 'filesystem', missReason: formatErrorForLog(error) };
		}
	}

	if (!workspace.sandbox) return { content: null, transport: 'none' };

	try {
		return {
			content: await readFileViaSandbox(workspace, filePath, options),
			transport: 'command',
		};
	} catch (error) {
		if (isTransientSandboxIoError(error)) {
			throw new OperationalError(
				`Failed to read ${resourceLabel(options).toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
				{
					cause: error,
					level: 'error',
				},
			);
		}
		return { content: null, transport: 'command', missReason: formatErrorForLog(error) };
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
	return await traceSandboxOperation(
		'write-file',
		{ kind: 'io', inputs: { path: filePath, bytes: sandboxFileBytes(content) } },
		async () => {
			const startedAt = Date.now();
			const transport = await writeWorkspaceFileContent(workspace, filePath, content, options);
			options?.logger.debug('Wrote workspace file', {
				resource: resourceLabel(options),
				path: filePath,
				transport,
				bytes: sandboxFileBytes(content),
				durationMs: Date.now() - startedAt,
			});
		},
	);
}

async function writeWorkspaceFileContent(
	workspace: WorkspaceFileTarget,
	filePath: string,
	content: string,
	options?: WorkspaceFileOptions,
): Promise<WorkspaceFileTransport> {
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
			return 'filesystem';
		} catch (error) {
			if (isAbortError(error)) throw error;
			try {
				await traceSandboxOperation(
					'file-command-fallback',
					{ inputs: { path: filePath } },
					async () => await writeFileViaSandbox(workspace, filePath, content, options),
				);
				options?.logger.warn(`${label} filesystem write failed; used command fallback`, {
					path: filePath,
					error: formatErrorForLog(error),
				});
				return 'command-fallback';
			} catch (fallbackError) {
				if (isAbortError(fallbackError)) throw fallbackError;
				// Preserve whichever path carries quota metadata so callers can
				// classify the combined failure correctly.
				throw new OperationalError(
					`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}; command fallback failed: ${formatErrorForLog(fallbackError)}`,
					{
						cause: selectWriteFailureCause(error, fallbackError),
						level: 'error',
					},
				);
			}
		}
	}

	try {
		await writeFileViaSandbox(workspace, filePath, content, options);
		return 'command';
	} catch (error) {
		if (isAbortError(error)) throw error;
		throw new OperationalError(
			`Failed to write ${label.toLowerCase()} "${filePath}": ${formatErrorForLog(error)}`,
			{
				cause: error,
				level: 'error',
			},
		);
	}
}

/** Write several UTF-8 workspace files in parallel. */
export async function writeWorkspaceFileMap(
	workspace: WorkspaceFileTarget,
	files: Map<string, string>,
	options?: WorkspaceFileOptions,
): Promise<void> {
	const bytes = [...files.values()].reduce((sum, content) => sum + sandboxFileBytes(content), 0);
	return await traceSandboxOperation(
		'write-files',
		{ kind: 'batch', inputs: { fileCount: files.size, bytes } },
		async () => {
			const startedAt = Date.now();
			await Promise.all(
				Array.from(files, async ([filePath, content]) => {
					await writeWorkspaceFile(workspace, filePath, content, options);
				}),
			);
			options?.logger.debug('Wrote workspace files', {
				resource: resourceLabel(options),
				fileCount: files.size,
				bytes,
				durationMs: Date.now() - startedAt,
			});
		},
	);
}
