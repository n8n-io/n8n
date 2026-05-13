import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import type { CliExecutionResult, CliExecutionSettings } from '../types';

const SIGKILL_GRACE_MS = 5_000;

/**
 * Execute a CLI command as a child process with controlled environment.
 *
 * - Spawns the command via `child_process.spawn` with curated env and cwd.
 * - Captures stdout/stderr with configurable size limits.
 * - Enforces timeout via SIGTERM → SIGKILL escalation.
 * - Supports abort signal for cancellation.
 * - Streams stdout lines to an optional callback for live progress.
 */
export async function executeCli(
	settings: CliExecutionSettings,
	options?: {
		/** Called for each line of stdout, enabling live event streaming. */
		onStdoutLine?: (line: string) => void;
		/** Abort signal for cancellation. */
		signal?: AbortSignal;
	},
): Promise<CliExecutionResult> {
	const { command, args, workDir, env, timeout, maxOutputSize } = settings;
	const { onStdoutLine, signal } = options ?? {};

	return await new Promise<CliExecutionResult>((resolve, reject) => {
		const startTime = Date.now();

		let stdoutBuf = '';
		let stderrBuf = '';
		let stdoutTruncated = false;
		let stderrTruncated = false;
		let killed = false;

		const child = spawn(command, args, {
			cwd: workDir,
			env,
			stdio: ['pipe', 'pipe', 'pipe'],
			// No TTY allocation — CLI tools detect non-interactive mode automatically.
		});

		// Close stdin immediately — harness CLIs read from files, not stdin.
		child.stdin.end();

		// --- stdout streaming + capture ---
		if (child.stdout) {
			if (onStdoutLine) {
				const rl = createInterface({ input: child.stdout });
				rl.on('line', (line) => {
					onStdoutLine(line);
					appendToBuffer('stdout', line + '\n');
				});
			} else {
				child.stdout.on('data', (chunk: Buffer) => {
					appendToBuffer('stdout', chunk.toString());
				});
			}
		}

		// --- stderr capture ---
		if (child.stderr) {
			child.stderr.on('data', (chunk: Buffer) => {
				appendToBuffer('stderr', chunk.toString());
			});
		}

		function appendToBuffer(target: 'stdout' | 'stderr', data: string) {
			if (target === 'stdout') {
				if (stdoutTruncated) return;
				stdoutBuf += data;
				if (stdoutBuf.length > maxOutputSize) {
					stdoutBuf = stdoutBuf.slice(0, maxOutputSize) + `\n[truncated at ${maxOutputSize} bytes]`;
					stdoutTruncated = true;
				}
			} else {
				if (stderrTruncated) return;
				stderrBuf += data;
				if (stderrBuf.length > maxOutputSize) {
					stderrBuf = stderrBuf.slice(0, maxOutputSize) + `\n[truncated at ${maxOutputSize} bytes]`;
					stderrTruncated = true;
				}
			}
		}

		// --- timeout enforcement ---
		const timeoutTimer = setTimeout(() => {
			killProcess();
		}, timeout * 1_000);

		// --- abort signal handling ---
		function onAbort() {
			killProcess();
		}

		if (signal) {
			if (signal.aborted) {
				child.kill('SIGTERM');
				killed = true;
			} else {
				signal.addEventListener('abort', onAbort, { once: true });
			}
		}

		function killProcess() {
			if (killed) return;
			killed = true;

			// Graceful shutdown first.
			child.kill('SIGTERM');

			// Escalate to SIGKILL after grace period.
			setTimeout(() => {
				if (!child.killed) {
					child.kill('SIGKILL');
				}
			}, SIGKILL_GRACE_MS).unref();
		}

		// --- process exit ---
		child.on('error', (error) => {
			clearTimeout(timeoutTimer);
			signal?.removeEventListener('abort', onAbort);
			reject(error);
		});

		child.on('close', (code) => {
			clearTimeout(timeoutTimer);
			signal?.removeEventListener('abort', onAbort);

			resolve({
				stdout: stdoutBuf,
				stderr: stderrBuf,
				exitCode: code ?? 1,
				duration: Date.now() - startTime,
				stdoutTruncated,
				stderrTruncated,
			});
		});
	});
}

/**
 * Verify that a CLI binary is available on the system.
 */
export async function verifyBinary(command: string): Promise<{
	available: boolean;
	error?: string;
}> {
	try {
		const result = await executeCli({
			command: 'which',
			args: [command],
			workDir: '/tmp',
			env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin' },
			timeout: 5,
			maxOutputSize: 1024,
		});
		return result.exitCode === 0
			? { available: true }
			: { available: false, error: `'${command}' not found in PATH` };
	} catch {
		return { available: false, error: `Failed to check for '${command}'` };
	}
}
