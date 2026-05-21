/**
 * Sandbox File I/O Utilities
 *
 * Thin wrappers around sandbox command execution for file operations.
 * Works with both Daytona (remote) and Local (host) sandbox providers,
 * since both support executeCommand / processes.spawn.
 *
 * We avoid workspace.filesystem because Daytona workspaces don't have one —
 * only LocalSandbox gets a filesystem attached in createWorkspace().
 */

interface SandboxCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface SandboxWorkspace {
	filesystem?: {
		provider?: string;
		basePath?: string;
		writeFile: (
			path: string,
			content: string | Buffer,
			options?: { recursive?: boolean },
		) => Promise<void>;
		mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
	};
	sandbox?: {
		provider?: string;
		executeCommand?: (
			command: string,
			args?: string[],
			options?: { cwd?: string },
		) => Promise<SandboxCommandResult>;
		processes?: {
			spawn: (
				command: string,
				options?: { cwd?: string },
			) => Promise<{ wait: () => Promise<SandboxCommandResult> }>;
		};
	};
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
	workspace: SandboxWorkspace,
	command: string,
	cwd?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const sandbox = workspace.sandbox;
	if (!sandbox) throw new Error('Workspace has no sandbox');

	let result: { exitCode: number; stdout: string; stderr: string };
	if (sandbox.executeCommand) {
		const r = await sandbox.executeCommand(command, [], { cwd });
		result = { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
	} else if (sandbox.processes) {
		const handle = await sandbox.processes.spawn(command, { cwd });
		const r = await handle.wait();
		result = { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
	} else {
		throw new Error('Sandbox has neither executeCommand nor processes available');
	}

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
	workspace: SandboxWorkspace,
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

	await runWriteCommand(
		`base64 -d '${escapedTempPath}' > '${escapeSingleQuotes(filePath)}'; status=$?; rm -f '${escapedTempPath}'; exit $status`,
	);
}

/**
 * Read a file from the sandbox via shell command.
 * Returns null if the file doesn't exist.
 */
export async function readFileViaSandbox(
	workspace: SandboxWorkspace,
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
