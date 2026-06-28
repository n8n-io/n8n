/**
 * Sandbox File I/O Utilities
 *
 * Thin wrappers around sandbox command execution for file operations.
 * Works with sandbox providers that support executeCommand / processes.spawn.
 *
 * We avoid workspace.filesystem because Daytona workspaces don't have one —
 * command fallback keeps setup compatible with command-only providers.
 */

import {
	runInSandbox as runInSharedSandbox,
	type SandboxCommandTarget,
	type SandboxWorkspace as SharedSandboxWorkspace,
} from '@n8n/agents/sandbox';

export interface SandboxWorkspace extends SharedSandboxWorkspace {
	filesystem?: {
		provider?: string;
		basePath?: string;
		init?: () => Promise<void>;
		readFile?: (path: string, options?: { encoding?: BufferEncoding }) => Promise<string | Buffer>;
		writeFile: (
			path: string,
			content: string | Buffer,
			options?: { recursive?: boolean },
		) => Promise<void>;
		mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
	} & NonNullable<SharedSandboxWorkspace['filesystem']>;
}

import { getTemplateTelemetrySession } from './template-telemetry';

const BASE64_WRITE_CHUNK_SIZE = 32_000;

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
	cwd?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const result = await runInSharedSandbox(workspace, command, cwd);

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
): Promise<void> {
	const runWriteCommand = async (command: string) => {
		const result = await runInSandbox(workspace, command);
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
}

/**
 * Read a file from the sandbox via shell command.
 * Returns null if the file doesn't exist.
 */
export async function readFileViaSandbox(
	workspace: SandboxCommandTarget,
	filePath: string,
): Promise<string | null> {
	const result = await runInSandbox(workspace, `cat '${escapeSingleQuotes(filePath)}' 2>/dev/null`);
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
