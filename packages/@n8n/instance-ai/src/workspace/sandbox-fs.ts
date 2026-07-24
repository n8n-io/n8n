/**
 * Sandbox File I/O Utilities
 *
 * Thin wrappers around sandbox command execution for file operations.
 * Works with sandbox providers that support executeCommand / processes.spawn.
 *
 * We avoid workspace.filesystem because Daytona workspaces don't have one —
 * command fallback keeps setup compatible with command-only providers.
 */

import { createAbortError, throwIfAborted } from '@n8n/agents';
import {
	runInSandbox as runInSharedSandbox,
	type RunInSandboxOptions,
	type SandboxCommandTarget,
	type SandboxWorkspace as SharedSandboxWorkspace,
} from '@n8n/agents/sandbox';

import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import { getTemplateTelemetrySession } from './template-telemetry';

export interface SandboxWorkspace extends SharedSandboxWorkspace {
	filesystem?: {
		provider?: string;
		basePath?: string;
		init?: () => Promise<void>;
		readFile?: (
			path: string,
			options?: { encoding?: BufferEncoding; abortSignal?: AbortSignal },
		) => Promise<string | Buffer>;
		writeFile: (
			path: string,
			content: string | Buffer,
			options?: { recursive?: boolean; abortSignal?: AbortSignal },
		) => Promise<void>;
		mkdir: (
			path: string,
			options?: { recursive?: boolean; abortSignal?: AbortSignal },
		) => Promise<void>;
	} & NonNullable<SharedSandboxWorkspace['filesystem']>;
}

const BASE64_WRITE_CHUNK_SIZE = 32_000;
const SANDBOX_IO_MAX_ATTEMPTS = 3;
const DEFAULT_SANDBOX_IO_RETRY_BACKOFF_BASE_MS = 1_000;
const SANDBOX_IO_RETRY_BACKOFF_CAP_MS = 5_000;

export interface SandboxIoRetryOptions {
	logger?: Pick<Logger, 'warn'>;
	resourceLabel?: string;
	retryBackoffBaseMs?: number;
	abortSignal?: AbortSignal;
}

function ioResourceLabel(options?: SandboxIoRetryOptions): string {
	return options?.resourceLabel ?? 'Sandbox file';
}

async function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
	throwIfAborted(abortSignal);
	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			abortSignal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(createAbortError(abortSignal?.reason));
		};
		abortSignal?.addEventListener('abort', onAbort, { once: true });
	});
}

// Daytona surfaces upstream gateway failures (e.g. Cloudflare 502/524) as errors with a numeric status.
export function isTransientSandboxIoError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const status = 'statusCode' in error ? error.statusCode : 'status' in error ? error.status : null;
	return typeof status === 'number' && (status >= 500 || status === 408 || status === 429);
}

export async function retryTransientSandboxIo<T>(
	op: () => Promise<T>,
	filePath: string,
	options?: SandboxIoRetryOptions,
): Promise<T> {
	const baseMs = options?.retryBackoffBaseMs ?? DEFAULT_SANDBOX_IO_RETRY_BACKOFF_BASE_MS;
	for (let attempt = 1; ; attempt++) {
		throwIfAborted(options?.abortSignal);
		try {
			return await op();
		} catch (error) {
			if (attempt >= SANDBOX_IO_MAX_ATTEMPTS || !isTransientSandboxIoError(error)) throw error;
			options?.logger?.warn(`${ioResourceLabel(options)} I/O hit a transient error; retrying`, {
				path: filePath,
				attempt,
				error: formatErrorForLog(error),
			});
			await sleep(
				Math.min(baseMs * 2 ** (attempt - 1), SANDBOX_IO_RETRY_BACKOFF_CAP_MS),
				options?.abortSignal,
			);
		}
	}
}

/**
 * Execute a shell command in the sandbox and wait for completion.
 * Tries `executeCommand` first, falls back to `processes.spawn` + wait.
 *
 * If a TemplateTelemetrySession is bound to the workspace via
 * `attachTemplateTelemetrySession`, the command + stdout get observed for
 * template-usage events. Failures in the observer never break the command.
 */
export async function runInSandbox(
	workspace: SandboxCommandTarget,
	command: string,
	cwdOrOptions?: string | RunInSandboxOptions,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const result = await runInSharedSandbox(workspace, command, cwdOrOptions);

	const session = getTemplateTelemetrySession(workspace);
	if (session) {
		try {
			session.observe(command, result.stdout);
		} catch {
			// Telemetry must never fail a command. Swallow.
		}
	}

	return result;
}

/**
 * Write a file in the sandbox via shell command.
 * Uses base64 encoding to safely transfer arbitrary content without
 * shell escaping issues (heredocs break on certain characters).
 * Creates parent directories automatically.
 */
export async function writeFileViaSandbox(
	workspace: SandboxCommandTarget,
	filePath: string,
	content: string | Buffer,
	options?: SandboxIoRetryOptions,
): Promise<void> {
	await retryTransientSandboxIo(
		async () => {
			const runWriteCommand = async (command: string) => {
				const result = await runInSandbox(workspace, command, {
					abortSignal: options?.abortSignal,
				});
				if (result.exitCode !== 0) {
					throw new Error(`Failed to write file ${filePath}: ${result.stderr}`);
				}
			};

			// Ensure parent directory exists
			const dir = filePath.substring(0, filePath.lastIndexOf('/'));
			if (dir) {
				await runWriteCommand(`mkdir -p '${escapeSingleQuotes(dir)}'`);
			}

			// Encode content as base64, transfer it in small chunks, then decode in the sandbox.
			// Some providers run commands through spawn(), where a single huge argument can hit E2BIG.
			const b64 =
				typeof content === 'string'
					? Buffer.from(content, 'utf-8').toString('base64')
					: content.toString('base64');
			const tempPath = `${filePath}.base64.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
			const escapedTempPath = escapeSingleQuotes(tempPath);

			await runWriteCommand(`: > '${escapedTempPath}'`);

			for (let offset = 0; offset < b64.length; offset += BASE64_WRITE_CHUNK_SIZE) {
				const chunk = b64.slice(offset, offset + BASE64_WRITE_CHUNK_SIZE);
				await runWriteCommand(`printf '%s' '${chunk}' >> '${escapedTempPath}'`);
			}

			// Decode + cleanup in one shell expression; the exit reflects base64's
			// status. Avoid the variable name `status` — it's a read-only builtin in
			// zsh, which silently breaks the assignment and loses base64's exit code.
			await runWriteCommand(
				`base64 -d '${escapedTempPath}' > '${escapeSingleQuotes(filePath)}'; rc=$?; rm -f '${escapedTempPath}'; exit $rc`,
			);
		},
		filePath,
		options,
	);
}

/**
 * Read a file from the sandbox via shell command.
 * Returns null if the file doesn't exist. Transient provider errors are
 * retried and, when exhausted, thrown — they are not a missing file.
 */
export async function readFileViaSandbox(
	workspace: SandboxCommandTarget,
	filePath: string,
	options?: SandboxIoRetryOptions,
): Promise<string | null> {
	const result = await retryTransientSandboxIo(
		async () =>
			await runInSandbox(workspace, `cat '${escapeSingleQuotes(filePath)}' 2>/dev/null`, {
				abortSignal: options?.abortSignal,
			}),
		filePath,
		options,
	);
	if (result.exitCode !== 0) return null;
	return result.stdout;
}

/**
 * Escape single quotes in a string for use inside single-quoted shell arguments.
 * Uses the POSIX technique: end quote, escaped literal quote, reopen quote.
 */
export function escapeSingleQuotes(s: string): string {
	return s.replace(/'/g, "'\\''");
}
